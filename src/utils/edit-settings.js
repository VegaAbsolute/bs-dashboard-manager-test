const fs = require('fs');

const editSettings = (dir, field, data) => {
    const settingsString = fs.readFileSync(dir + '/settings.json', 'utf-8');
    const settings = JSON.parse(settingsString);

    const newSettings = Object.assign(settings, {[field]: data});

    const stringNewSettings = JSON.stringify(newSettings, null, '\t');
    fs.writeFileSync(dir + '/settings.json', stringNewSettings);
}

exports.editSettings = editSettings;
