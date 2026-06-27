const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.match(/\buseRef\b/)) {
        let hasImport = false;
        
        // Match `import { ..., useRef, ... } from "react"`
        if (/import\s+.*?\{[^}]*\buseRef\b[^}]*\}.*?from\s+['"]react['"]/s.test(content)) hasImport = true;
        // Match `import React, { useRef } from "react"`
        if (/import\s+React.*?\{[^}]*\buseRef\b[^}]*\}.*?from\s+['"]react['"]/s.test(content)) hasImport = true;
        // Match `import * as React from "react"`
        if (/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/s.test(content)) hasImport = true;

        if (!hasImport) {
          console.log(file);
        }
      }
    }
  });
  return results;
}
walk('src');
