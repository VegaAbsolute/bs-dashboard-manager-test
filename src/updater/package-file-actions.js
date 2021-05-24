const fs = require('fs');

/**
 *
 *  @param {string}
 *  @param {string}
 *  @param {callback function}
 */
const changeVersionInPackageFile = (logger, DASHBOARD_DIR, newVersion, next) => {
    fs.readFile(DASHBOARD_DIR + '/package.json', {encoding: 'utf-8'}, (err, data) => {
        // TODO: error log
        if (err) {
            logger.warn(err);
        } else {
            const object = JSON.parse(data);
            fs.writeFile(
                DASHBOARD_DIR + '/package.json',
                JSON.stringify(Object.assign(object, { version: newVersion }), null, '\t'),
                next
            );
        }
    });
}

exports.changeVersionInPackageFile = changeVersionInPackageFile;
