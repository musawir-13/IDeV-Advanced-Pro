const fs = require('fs');
const path = require('path');
const readme = fs.readFileSync('README.md', 'utf8');

const linkRegex = /\[.*?\]\((?!http|#)(.*?)\)/g;
const imgRegex = /<img[^>]+src=["'](?!http)(.*?)["']/g;

let match;
const localPaths = [];
while ((match = linkRegex.exec(readme)) !== null) {
  localPaths.push(match[1]);
}
while ((match = imgRegex.exec(readme)) !== null) {
  localPaths.push(match[1]);
}

console.log('Testing ' + localPaths.length + ' local references in README.md:');
let failed = 0;
for (const p of localPaths) {
  const cleanPath = p.split('#')[0];
  const exists = fs.existsSync(path.join(__dirname, '..', cleanPath));
  console.log((exists ? '[OK] ' : '[MISSING] ') + p);
  if (!exists) failed++;
}
if (failed === 0) {
  console.log('\nAll local references in README.md are 100% verified!');
} else {
  console.error(failed + ' references missing!');
  process.exit(1);
}
