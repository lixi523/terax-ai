import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('zh-CN') && lines[i].includes('绠')) {
    console.log('Found at line', i+1, ':', JSON.stringify(lines[i]));
    break;
  }
}