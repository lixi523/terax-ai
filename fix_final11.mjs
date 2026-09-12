import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');

const badString = '"zh-CN": "绠€浣撲腑鏂?"';
console.log('Contains:', content.includes(badString));

if (content.includes(badString)) {
  content = content.replace(badString, '"zh-CN": "简体中文"');
  fs.writeFileSync('src/i18n/resources/en.json.tmp', content);
  fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
  console.log('Fixed en.json');
} else {
  console.log('Pattern not found');
}