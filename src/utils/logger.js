const path = require('path');
const winston = require('winston');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const fileFormat = printf(({ level, message, label, timestamp }) => {
    let mes = message;
    if (typeof message === 'object') {
        if (message === null) {
            mes = 'null';
        } else {
            mes = JSON.stringify(message, null, '\t');
        }
    }
  return `${timestamp} [${level.toUpperCase()}]: ${mes}\r`;
});

const consoleFormat = printf(({ level, message, label }) => {
    let mes = message;
    if (typeof message === 'object') {
        if (message === null) {
            mes = 'null';
        } else {
            mes = JSON.stringify(message, null, '\t');
        }
    }
  return `[${label}] [${level.toUpperCase()}]: ${mes}\r`;
});




const logger = (mainDir, level='', maxLevelForConsoleLogger='verbose') => {

    let consoleLevel = 'verbose';
    let fileLevel = 'warn';
    switch (maxLevelForConsoleLogger) {
        case 'error':
        case 'warn':
        case 'info':
        case 'verbose':
        case 'debug':
        case 'silly': {
            consoleLevel = maxLevelForConsoleLogger;
            break;
        }
        default: {}
    }
    switch (level) {
        case 'error':
        case 'warn':
        case 'info':
        case 'verbose': {
            consoleLevel = level;
            fileLevel = 'warn';
            break;
        }
        case 'debug':
        case 'silly': {
            fileLevel = level;
            break;
        }
        default: {
            consoleLevel = 'verbose';
            fileLevel = 'warn';
        }
    }

    return winston.createLogger({
        transports: [
            new winston.transports.Console({
                level: consoleLevel,
                format: combine(
                    label({ label: 'BS-Dsbd-Mngr' }),
                    //timestamp(),
                    consoleFormat
                ),
            }),
            new winston.transports.File({
                level: fileLevel,
                filename: path.join(mainDir, '..') + '/logs/manager.log',
                maxsize:'1024000',
                maxFiles:'3',
                format: combine(
                    label({ label: 'BS-Dshbd-Mngr' }),
                    timestamp(),
                    fileFormat
                )
            })
        ]
    })
};

exports.logger = logger;
