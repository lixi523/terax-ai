import fs from 'fs';

function fixFile(file, content) {
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  
  // Fix corrupted characters
  content = content.replace(/绠€浣撲腑鏂?/g, '简体中文');
  content = content.replace(/Loading鈥?/g, 'Loading...');
  content = content.replace(/Syncing鈥?/g, 'Syncing...');
  content = content.replace(/鈥?/g, '...');
  
  fs.writeFileSync(file + '.tmp', content);
  fs.renameSync(file + '.tmp', file);
  console.log('Fixed:', file);
}

fixFile('src/i18n/resources/en.json', '');
fixFile('src/i18n/resources/zh-CN.json', '');

console.log('Done');