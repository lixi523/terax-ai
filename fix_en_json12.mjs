import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
content = content.replace('"zh-CN": "绠€浣撲腑鏂?"', '"zh-CN": "简体中文"');
fs.writeFileSync('src/i18n/resources/en.json.tmp', content);
fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
console.log('Fixed en.json');