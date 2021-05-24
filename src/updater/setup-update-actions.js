const download = require('./download');
const exec = require('child_process').exec;
const setVersion = require('./version-file-actions').setVersion;
const changeVersionInPackageFile = require('./package-file-actions').changeVersionInPackageFile;
const compose = require('../utils/compose').compose;


const setupUpdate = (child, SETTINGS, lastVersionData, logger, next) => {
    logger.debug('setupUpdate');
    if (lastVersionData.dashboardVersion.isAvailableUpdate && lastVersionData.managerVersion.isAvailableUpdate) {
        // Update both apps
        logger.info('START SETUP Update for both app.');
        compose(
            downloadUpdate({
                logger,
                bsDashboardProcess: child,
                MAIN_DIR: SETTINGS.MAIN_DIR,
                settings: SETTINGS.BS_DASHBOARD,
                finish: next
            }),
            downloadUpdate({
                logger,
                bsDashboardProcess: child,
                MAIN_DIR: SETTINGS.MAIN_DIR,
                settings: SETTINGS.BS_DASHBOARD_MANAGER,
                finish: next
            }),
            setup({
                logger,
                bsDashboardProcess: child,
                MAIN_DIR: SETTINGS.MAIN_DIR,
                DIR: SETTINGS.BS_DASHBOARD.DIR,
                settings: SETTINGS.BS_DASHBOARD,
                lastVersion: lastVersionData.dashboardVersion,
                finish: next
            }),
            setup({
                logger,
                bsDashboardProcess: child,
                MAIN_DIR: SETTINGS.MAIN_DIR,
                DIR: SETTINGS.MAIN_DIR + '/app',
                settings: SETTINGS.BS_DASHBOARD_MANAGER,
                lastVersion: lastVersionData.managerVersion,
                finish: next
            })
        )(next)();
    } else if (lastVersionData.dashboardVersion.isAvailableUpdate || lastVersionData.managerVersion.isAvailableUpdate) {
        //update only app
        logger.info('START SETUP Update for only one app.');
        let settings;
        let dir;
        let lastVersion;
        if (lastVersionData.dashboardVersion.isAvailableUpdate) {
            logger.verbose('Update for BS_DASHBOARD');
            settings = SETTINGS.BS_DASHBOARD;
            dir = SETTINGS.BS_DASHBOARD.DIR;
            lastVersion = lastVersionData.dashboardVersion;
        } else {
            logger.verbose('Update for BS_DASHBOARD_MANAGER');
            settings = SETTINGS.BS_DASHBOARD_MANAGER;
            dir = SETTINGS.MAIN_DIR + '/app';
            lastVersion = lastVersionData.managerVersion;
        }
        compose(
            downloadUpdate({
                logger,
                bsDashboardProcess: child,
                MAIN_DIR: SETTINGS.MAIN_DIR,
                settings,
                finish: next
            }),
            setup({
                logger,
                bsDashboardProcess: child,
                MAIN_DIR: SETTINGS.MAIN_DIR,
                DIR: dir,
                settings,
                lastVersion,
                finish: next
            })
        )(next)();
    } else {
        // Don't update
        logger.info('Update is not required');
        next('update_is_not_required');
    }
}


const downloadUpdate = ({ logger, bsDashboardProcess, MAIN_DIR, DIR, settings, lastVersion, finish }) => (next) => () => {
    const { TEMP, GIT_NAME, GIT_REPO, GIT_PROVIDER, GIT_DOMAIN } = settings;
    logger.info('Download update for [' + GIT_REPO + '] is begun...');
    bsDashboardProcess.send({ cmd: 'update_process_new_stage', stage: 'start_download_' + GIT_REPO });
    compose(
        //  clear temporary directory
        (next) => () => {
            logger.silly('Clear temporary directory...');
            exec(
                'rm -r' + ' ' + MAIN_DIR + '/' + TEMP + '/*',
                (error, stdout, stderr) => {
                    logger.silly('Clear temporary directory was SUCCESS.');
                    next();
                }
            )
        },
        //  Calculate git source address
        (next) => () => {
            let gitSource;
            logger.silly('Calculate git source address...');
            switch (GIT_PROVIDER) {
                case 'GIT_LAB': {
                    gitSource = 'http://' + GIT_DOMAIN + '/' + GIT_NAME + '/' + GIT_REPO + '/-/archive/master/' + GIT_REPO + '-master.tar.gz';
                    break;
                }
                case 'GIT_HUB': {
                    gitSource = 'https://' + GIT_DOMAIN + '/' + GIT_NAME + '/' + GIT_REPO + '/archive/master.zip';
                    break;
                }
                default: { }
            }
            logger.silly('gitSource = ' + gitSource);
            next(gitSource);
        },
        //  Download and unpack application
        (next) => (gitSource) => {
            logger.silly('Download and unpack application...');
            download(
                'direct:' + gitSource,
                MAIN_DIR + '/' + TEMP,
                { headers: { 'PRIVATE-TOKEN': '' } },
                (err) => {
                    if (!err) {
                        bsDashboardProcess.send({ cmd: 'update_process_new_stage', stage: 'finish_download_' + GIT_REPO });
                        logger.info('Download update for [' + GIT_REPO + '] was SUCCESS.');
                        next();
                    } else {
                        logger.warn('Download and unpack application was FAILURE.');
                        logger.warn(err.name + "\n\r" + err.message);
                        finish(err.name + "\n\r" + err.message);
                    }
                }
            );
        }
    )(next)();
}


const setup = ({ logger, bsDashboardProcess, MAIN_DIR, DIR, settings, lastVersion, finish }) => (next) => () => {
    const { TEMP, GIT_REPO, FILE } = settings;
    logger.info('Setup update for [' + GIT_REPO + '] is begun...');
    bsDashboardProcess.send({ cmd: 'update_process_new_stage', stage: 'start_setup_' + GIT_REPO });

    compose(
        //  clear the target directory
        (next) => () => {
            logger.silly('Clear the target directory...');
            exec(
                'rm -r' + ' ' + DIR + '/*',
                (error, stdout, stderr) => {
                    logger.silly('Clear the target directory was SUCCESS.');
                    next()
                }
            )
        },
        //  move application from the temporary to the target directory
        (next) => () => {
            logger.silly('Move application from the temporary to the target directory...');
            exec(
                'mv ' + MAIN_DIR + '/' + TEMP + '/* ' + DIR,
                (error, stdout, stderr) => {
                    if (!error) {
                        logger.silly('Move application from the temporary to the target directory was SUCCESS.');
                        next()
                    } else {
                        logger.warn('Move application from the temporary to the target directory was FAILURE:');
                        logger.warn(stderr + error);
                        finish(stderr + error);
                    }
                }
            )
        },
        // write new version in the package file
        (next) => () => {
            const { message } = lastVersion;
            logger.silly('Write new version in the package file...');
            changeVersionInPackageFile(logger, DIR, message, (err) => {
                if (!err) {
                    logger.silly('Write new version in the package file was SUCCESS.');
                    next();
                } else {
                    logger.warn('Write new version in the package file was FAILURE:');
                    logger.warn(err);
                    finish(err);
                }
            })
        },
        // write new version in the version file
        (next) => () => {
            const { date, message } = lastVersion;
            logger.silly('Write new version in the version file.');
            setVersion(MAIN_DIR + '/' + FILE, { date, message }, () => {
                next();
            });
        },
        // Send a success message to the BS-Dashboard
        (next) => () => {
            bsDashboardProcess.send({ cmd: 'update_process_new_stage', stage: 'finish_setup_' + GIT_REPO });
            logger.info('Setup update for [' + GIT_REPO + '] is success.');
            next();
        }
    )(next)();
}


exports.setupUpdate = setupUpdate;
