import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// The corrupted text uses specific unicode characters
// Let's find and replace using the exact corrupted string
const badString = '"zh-CN": "绠€浣撲腑鏂?"';
const goodString = '"zh-CN": "简体中文"';

if (content.includes(badString)) {
  content = content.replace(badString, goodString);
  fs.writeFileSync('src/i18n/resources/en.json.tmp', content);
  fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
  console.log('Fixed en.json');
} else {
  console.log('Pattern not found, searching...');
  const idx = content.indexOf('zh-CN');
  if (idx >= 0) {
    console.log('Context around zh-CN:', content.slice(idx-20, idx+50));
  }
}