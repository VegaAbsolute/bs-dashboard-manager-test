const fs = require('fs');

// TODO: set production path
const PATH_TO_BUTTON_VALUE_FILE = '/sys/class/gpio/gpio26/value';

const buttonObserver = (logger, next) => {
    logger.info('Waiting for button press...');

    const timerId = setInterval(() => {
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
            next();
            clearInterval(timerId);
        }
    }, 5000);
    return timerId;
}

exports.buttonObserver = buttonObserver;
