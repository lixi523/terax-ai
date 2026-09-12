import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');

const badString = '"zh-CN": "绠€浣撲腑鏂?"';
const goodString = '"zh-CN": "简体中文"';

if (content.includes(badString)) {
  content = content.replace(badString, goodString);
  fs.writeFileSync('src/i18n/resources/en.json.tmp', content);
  fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
  console.log('Fixed en.json');
} else {
  console.log('Pattern not found');
}