const compose = (...funcs) => (Comp) => {
    return funcs.reduceRight((wrapped, f) => f(wrapped), Comp);
};

exports.compose = compose;
