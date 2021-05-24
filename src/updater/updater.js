const compareVersions = require('./check-updates-actions').compareVersions;

const updater = (SETTINGS, logger, update) => {
    logger.verbose('Initial updater');
    let checkUpdateInterval;
    try {
        checkUpdateInterval = Number.parseInt(SETTINGS.UPDATE.TIME_INTERVAL_IN_MINUTES) || 1440;
    } catch(e) {
        checkUpdateInterval = 1440;
    }

    logger.debug('checkUpdateInterval = ' + checkUpdateInterval)

    let minutes = 0;
    setInterval(() => {
        minutes += 1;
        logger.silly('Updater: current minute = ' + minutes + ' checkUpdateInterval = ' + checkUpdateInterval)
        if (minutes > checkUpdateInterval - 1) {
            logger.info('Interval updater.');
            compareVersions(SETTINGS, logger, (result) => {
                update(result);
            });
            minutes = 0;
        }
    }, 60000);
}

exports.updater = updater;
