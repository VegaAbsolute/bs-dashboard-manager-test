const fs = require('fs');
const childProcess = require('child_process');
const compose = (...funcs) => (Comp) => {
    return funcs.reduceRight((wrapped, f) => f(wrapped), Comp);
};


/*
*
* next: (arg0: undefined | string) => void  // Arg0: string is error message
*/
const safelyFileWriter = ({ logger }) => (next) => ({ pathToTargetFile, dataForSave }) => {
    logger.debug('safelyFileWriter');
    
    compose(
        saveToTemporaryFile({ pathToTargetFile, dataForSave, logger, finish: next }),
        compareDataForSaveWithTempFile({ pathToTargetFile, dataForSave, logger, finish: next }),
        renameTemporaryFileWithReplaceTargetFile({ pathToTargetFile, dataForSave, logger, finish: next })
    )(next)();
}


const saveToTemporaryFile = ({ pathToTargetFile, dataForSave, logger, finish }) => (next) => () => {
    logger.debug('saveToTemporaryFile');
    fs.writeFile(pathToTargetFile + '-temp', dataForSave, (error) => {
        if (error) {
            // TODO: test logging of the error
            logger.error(error.name + "\n\r" + error.message + "\n\r" + error.stack);
            finish('the_temporary_file_writing_error');
        } else {
            next();
        }
    });
}


const compareDataForSaveWithTempFile = ({ pathToTargetFile, dataForSave, logger, finish }) => (next) => () => {
    logger.debug('compareDataForSaveWithTempFile');
    fs.readFile(pathToTargetFile + '-temp', "utf8", (error, data) => {
        if (error) {
            // TODO: test logging of the error
            logger.error(error.name + "\n\r" + error.message + "\n\r" + error.stack);
            finish('the_temporary_file_reading_error');
        } else {
            if (dataForSave !== data) {
                finish('temporary_file_data_and_data_for_save_is_different');
            } else {
                next();
            }
        }
    })
}


const renameTemporaryFileWithReplaceTargetFile = ({ pathToTargetFile, logger, finish }) => (next) => () => {
    logger.debug('renameTemporaryFileWithReplaceTargetFile');
    childProcess.exec('mv -f ' + pathToTargetFile + '-temp ' + pathToTargetFile, (error, stdout, stderr) => {
        if (error) {
            // TODO: test logging of the error
            logger.error(error.name + "\n\r" + error.message + "\n\r" + error.stack);
            finish('the_temporary_file_renaming_error');
        } else {
            next();
        }
    })
}


exports.safelyFileWriter = safelyFileWriter;


/*
*
* @return: undefined | string  // string is error message
*/
const safelyFileWriterSync = ({ pathToTargetFile, dataForSave, logger }) => {
    logger.debug('safelyFileWriterSync');
    try {
        logger.debug('saveToTemporaryFile');
        fs.writeFileSync(pathToTargetFile + '-temp', dataForSave);
    } catch (error) {
        logger.error(error.name + "\n\r" + error.message + "\n\r" + error.stack);
        return 'the_temporary_file_writing_error';
    }

    try {
        logger.debug('compareDataForSaveWithTempFile');
        const tempResult = fs.readFileSync(pathToTargetFile + '-temp', "utf8");
        if (dataForSave !== tempResult) {
            return 'temporary_file_data_and_data_for_save_is_different';
        }
    } catch (error) {
        logger.error(error.name + "\n\r" + error.message + "\n\r" + error.stack);
        return 'the_temporary_file_reading_error';
    }

    try {
        logger.debug('renameTemporaryFileWithReplaceTargetFile');
        childProcess.execSync('mv -f ' + pathToTargetFile + '-temp ' + pathToTargetFile);
    } catch (error) {
        logger.error(error.name + "\n\r" + error.message + "\n\r" + error.stack);
        return 'the_temporary_file_renaming_error';
    }

    return ;
}


exports.safelyFileWriterSync = safelyFileWriterSync;