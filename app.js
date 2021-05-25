const fs = require('fs');
const path = require('path');

const startServerProcess = require('./src/start-server-process.js').startServerProcess;
const readSettings = require('./src/read-settings.js').readSettings;
const editSettings = require('./src/utils/edit-settings.js').editSettings;
const express = require('express');


const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');

const PATH_TO_BUTTON_VALUE_FILE = '/sys/class/gpio/gpio26/value';
const MAIN_DIR = path.join(__dirname, '..');
const DASHBOARD_ROOT_DIR = path.join(__dirname, '..', '..');
const initLogger = require('./src/utils/logger.js').logger(MAIN_DIR);
let logger = {};
let SETTINGS = {};
let timerId = undefined;
let child = undefined;
const HTTP_PORT = 8088;

initLogger.warn('Run BS-Dashboard-Manager.');
const userAuthentication = (data) => {
    const usersJson = fs.readFileSync(DASHBOARD_ROOT_DIR + '/users-config.json', 'utf8');
    try
    {
        const users = JSON.parse(usersJson);
        const validData = typeof data === 'object' && data !== null && typeof data.login === 'string' && typeof data.password === 'string';
        if ( validData && users.login.trim() === data.login.trim() && users.password.trim() === data.password.trim()) 
        {
            return true;
        } 
        else
        {
            return false;
        }
    }
    catch(e)
    {
        return false;
    }
	return false;
}
const httpHandler = (req,resp)=>
{
    resp.setHeader('Content-Type','application/json');
    resp.writeHead('200');
    let params = req.query;
    let res = {status:false}; 
    let validParams = typeof params === 'object' && params !== null;
    if ( validParams ) res.status = userAuthentication(params);
    if(res.status)
    {
        if(timerId) clearInterval(timerId);
        logger.debug('switch STARTUP_METHOD = "http"');
        startServerProcess(SETTINGS)(logger);
    }
    resp.end(JSON.stringify(res));
}
const started = (err) => {
    if(err)
    {
        initLogger.error(err);
    }
    else
    {
        initLogger.debug('Success running http server, port='+HTTP_PORT);
    }
}
try {
    /**
     * read SETTINGS file
     */
    readSettings(MAIN_DIR, initLogger, (err, settings) => {
        if (err) {
            initLogger.error(err);
            process.exit(-1);
        } else {
            initLogger.silly(settings);
            SETTINGS = Object.assign(
                settings,
                {
                    MAIN_DIR
                }
            );

            logger = require('./src/utils/logger.js').logger(MAIN_DIR, SETTINGS.loggerLevel, SETTINGS.maxLevelForConsoleLogger);

            /**
             * Dashboard startup methods
             */
            if (SETTINGS.isRebooting) {
                logger.debug('SETTINGS.isRebooting === true');
                editSettings(MAIN_DIR, 'isRebooting', false);
                startServerProcess(SETTINGS)(logger);
            } else {
                logger.debug('SETTINGS.isRebooting !== true');
                switch (SETTINGS.SERVER_STARTUP_METHOD) {
                    case 'automatically': {
                        logger.debug('switch SERVER_STARTUP_METHOD = automatically');
                        startServerProcess(SETTINGS)(logger);
                        break;
                    }
                    default: {
                        logger.debug('switch SERVER_STARTUP_METHOD = "button"');
                        logger.info('Waiting for button press...');
                        timerId = setInterval(() => {
                            let buttonValue = '1';
                            try {
                                buttonValue = fs.readFileSync(PATH_TO_BUTTON_VALUE_FILE).toString().substr(0, 1);
                            } catch (e) {
                                logger.debug('fs.readFileSync throw exception, path = ' + PATH_TO_BUTTON_VALUE_FILE);
                                buttonValue = '1';
                            }
                            logger.silly('buttonValue = ' + buttonValue);
                            if (buttonValue === '0') {
                                logger.verbose('Button is pressed.');
                                startServerProcess(SETTINGS)(logger);
                                clearInterval(timerId);
                            }
                        }, 5000);
                    }
                }
            }

            const httpServer = express();
            httpServer.use(bodyParser.urlencoded({ extended: false }));
            httpServer.use(cors())
            httpServer.use(bodyParser.json());
            httpServer.get('/',httpHandler);
            http.createServer(httpServer).listen(HTTP_PORT,'0.0.0.0', started);
        }
    });

    /**
     *  Exit if parent process(Launcher) is disconnected
     *
     */
    process.on('disconnect', () => {
        logger.warn('Launcher was exited');
        process.exit(-1)
    });
} catch(err) {
    initLogger.error(err.name + "\n\r" + err.message + "\n\r" + err.stack);
}
