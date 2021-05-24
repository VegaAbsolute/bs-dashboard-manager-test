const checkData = (field, mask, isFillDefault) => {

    // if array
    if (typeof mask === 'object' && Array.isArray(mask)) {
        if ((typeof field === 'object' && Array.isArray(field)) || isFillDefault) {
            return parseArray(field, mask, isFillDefault);
        };

    // if object
    } else if (typeof mask === 'object' && mask !== null ) {
        if ((typeof field === 'object' && field !== null) || isFillDefault) {
            return parseObject(field, mask, isFillDefault);
        };

    // fill final field
    } else {
        if (
            field === undefined
            || (typeof field === 'function')
            || (typeof field === 'object' && field !== null )
        ) {
            if (isFillDefault) {
                return mask;
            };
        } else {
            return field;
        };
    }
    return undefined;
}

const parseArray = (arr=[], mask, isFillDefault) => {
    let result = undefined;
    for (let i in arr) {
        const resultField = checkData(arr[i], mask[0], isFillDefault);
        if (resultField !== undefined) {
            result = result || [];
            result = [...result, resultField];
        }
    };
    return result;
};

const parseObject = (obj={}, mask, isFillDefault) => {
    let result = undefined;
    for (let key in mask) {
        const resultField = checkData(obj[key], mask[key], isFillDefault);
        if (resultField !== undefined) {
            result = result || {};
            result[key] = resultField;
        }
    };
    return result;
};

/**
 * @param {object} Data object for parse.
 * @param {object} Mask
 * @param {bool} When 'true'(default) - fill non-existed fields with values from the 'Mask', when 'false' - skip non-existed fields.
 */
const parseObjectByMask = (obj, mask, isFillDefault=true) => {
    return checkData(obj, mask, isFillDefault);
}

exports.parseObjectByMask = parseObjectByMask;
