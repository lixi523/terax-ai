const fs = require('fs');
const content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
const fixed = content.replace(/"loading": "Loading...,/g, '"loading": "Loading...",');
fs.writeFileSync('src/i18n/resources/en.json.tmp', fixed);
fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
console.log('Fixed en.json');