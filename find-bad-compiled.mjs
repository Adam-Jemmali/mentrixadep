import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('useRef') && !content.includes('__turbopack_require__') && !content.includes('require(')) {
         results.push(filePath);
      }
    }
  }
  return results;
}

const files = walk('.next/server');
console.log('Files with useRef but no require or __turbopack_require__:', files.length);
if (files.length > 0) {
  for (const f of files.slice(0, 10)) {
    console.log(f);
  }
}
