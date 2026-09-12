import fs from 'fs';
let content = fs.readFileSync('src/i18n/resources/en.json', 'utf8');

// Fix the missing comma after the option object
content = content.replace(
  '        }\n      },\n      "theme"',
  '        },\n      },\n      "theme"'
);

fs.writeFileSync('src/i18n/resources/en.json.tmp', content);
fs.renameSync('src/i18n/resources/en.json.tmp', 'src/i18n/resources/en.json');
console.log('Fixed en.json');