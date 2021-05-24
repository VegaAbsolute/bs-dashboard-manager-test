const fs = require('fs');
const PATH_PROD_INFO_REV_1 = '/home/root/PROD_INFO';
const PATH_PROD_INFO_REV_2 = '/etc/PROD_INFO';


const existFile = (path) =>{
    try
    {
        if ( fs.existsSync(path) ) return true;
    }
    catch(e)
    {
        return false;
    }
    return false;
}
const initProdInfo = {
    Model: '---',
    Board_revision: '---',
    GSM: '---',
    GNSS: '---',
    Date: '---'
};
const readProdInfoFile = () => {
    let filePath = '';
    if(existFile(PATH_PROD_INFO_REV_2)) filePath = PATH_PROD_INFO_REV_2;
    else if(existFile(PATH_PROD_INFO_REV_1)) filePath = PATH_PROD_INFO_REV_1;
    else return initProdInfo;

    try {
        const array = fs.readFileSync(filePath, 'utf8').toString().split("\n");

        const prodInfo = array.reduce((prev, el) => {
            const indexOfSeparator = el.indexOf(':');

            if (indexOfSeparator > 0) {
                const key = el.substring(0, indexOfSeparator).trim();
                let val = el.substring(indexOfSeparator + 1).trim();
                if (val === 'null') {
                    val = null;
                }
                return Object.assign(prev, {[key] : val})
            } else {
                return prev;
            }

        }, {})

        return prodInfo;
    } catch(e) {
        return initProdInfo
    }
}

exports.readProdInfoFile = readProdInfoFile;
