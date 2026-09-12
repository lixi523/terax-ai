import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const badString = '"zh-CN": "绠€浣撲腑鏂?"';
console.log('Contains badString:', content.includes(badString));

const idx = content.indexOf('zh-CN');
if (idx >= 0) {
  console.log('Context:', JSON.stringify(content.slice(idx-10, idx+60)));
}