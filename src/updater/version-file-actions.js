const fs = require('fs');

const readVersion = (logger, MAIN_DIR, fileName, next) => {
    fs.readFile(MAIN_DIR + '/' + fileName, {encoding: 'utf-8'}, (err, data) => {
        if (err) {
            // TODO:  check format of 'err'
            logger.error(err);
        } else {
            next(JSON.parse(data));
        }
    });
}

const setVersion = (path, newVersion, next) => {
    fs.writeFileSync(path, JSON.stringify(newVersion, null, '\t'));
    next();
}


exports.readVersion = readVersion;
exports.setVersion = setVersion;
