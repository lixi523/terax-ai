import fs from 'fs';
const content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
const fixed = content.replace(/:\s*"Syncing...,"/g, ': "Syncing...",');
fs.writeFileSync('src/i18n/resources/en.json.tmp', fixed);
fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
console.log('Fixed en.json');