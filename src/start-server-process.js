const fs = require('fs');
const fork = require('child_process').fork;

const editSettings = require('./utils/edit-settings.js').editSettings;

const compareVersions = require('./updater/check-updates-actions').compareVersions;
const setupUpdate = require('./updater/setup-update-actions').setupUpdate;
const readVersion = require('./updater/version-file-actions').readVersion;
const updater = require('./updater/updater').updater;

let isUpdateProcess = false;

const startServerProcess = (SETTINGS) => (logger) => {
    /*
     *  Prepare data and run dashboard process
     */
     logger.verbose('Read version files');
     readVersion(logger, SETTINGS.MAIN_DIR, SETTINGS.BS_DASHBOARD.FILE, (currentDashboardVersion) => {
         logger.silly(currentDashboardVersion);
         readVersion(logger, SETTINGS.MAIN_DIR, SETTINGS.BS_DASHBOARD_MANAGER.FILE, (currentManagerVersion) => {
             logger.silly(currentManagerVersion);
             dashboardProcess(Object.assign(
                 SETTINGS,
                 { CURRENT_MANAGER_VERSION: currentManagerVersion },
                 { CURRENT_DASHBOARD_VERSION: currentDashboardVersion }
             ));
         })
     })


    const dashboardProcess = (SETTINGS, currentManagerVersion, currentDashboardVersion) => {


        /*
         *  Run bs-dashboard
         */
        logger.info('Starting bs-dashboard...');
        try {
            let lastVersionData;
            child = fork(SETTINGS.BS_DASHBOARD.DIR+'/app.js');

            /*
             *  Initial check for updates
             */
            compareVersions(SETTINGS, logger, (newUpdateData) => {
                lastVersionData = newUpdateData;

                logger.silly(lastVersionData);
                child.send({ cmd: 'update_is_available', data: newUpdateData });
            });
            /*
             *  Start update requester
             */
            updater(SETTINGS, logger, (newUpdateData) => {
                lastVersionData = newUpdateData;

                logger.silly(lastVersionData);
                if(newUpdateData.isAvailableUpdate) {
                    child.send({ cmd: 'update_is_available', data: newUpdateData });
                }
            });

            /*
             *  Send initial data
             */
            child.send({
                cmd: 'initial_data',
                data: {
                    managerVersion: SETTINGS.CURRENT_MANAGER_VERSION
                }
            });


            child.on('message', (message) => {
                logger.info('Message command from dashboard = ' + message.cmd);
                logger.silly(message);
                switch (message.cmd) {
                    case 'update_confirmed': {
                        logger.debug('case: update_confirmed');
                        if (!isUpdateProcess) {
                            isUpdateProcess = true;
                            child.send({ cmd: 'update_started' });
                            setupUpdate(child, SETTINGS, lastVersionData, logger, (err) => {
                                if (err) {
                                    logger.warn('Setup update error:');
                                    logger.warn(JSON.stringify({UPDATE_ERROR: err}, null, '\t'));
                                    child.send({ cmd: 'update_failure', error: err });
                                    isUpdateProcess = false;
                                } else {
                                    child.send({ cmd: 'update_completed', result: 'update_completed' });
                                    isUpdateProcess = false;
                                }
                            });
                        } else {
                            child.send({ cmd: 'update_started' });
                        }
                        break;
                    }
                    default: {
                        logger.debug('case: default');
                        logger.warn('I got unknown command from bs-dashboard: ' + message.cmd);
                    }
                }
            });

            child.on('close', (code) => {
                logger.warn(`bs-dashboard exited with code: ${code}`);
                if (code === 40) {
                    editSettings(SETTINGS.MAIN_DIR, 'isRebooting', true);
                }
                process.exit(code);
            });
        } catch (e) {
            logger.error(e);
        }

    }
}

exports.startServerProcess = startServerProcess;
