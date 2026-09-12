import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// Find the line with the corrupted zh-CN value
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('zh-CN') && lines[i].includes('绠')) {
    console.log('Found at line', i+1, ':', lines[i]);
    lines[i] = lines[i].replace('"zh-CN": "绠€浣撲腑鏂?"', '"zh-CN": "简体中文"');
    break;
  }
}

fs.writeFileSync('src/i18n/resources/en.json.tmp', lines.join('\n'));
fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
console.log('Fixed en.json');