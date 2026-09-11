const fs = require('fs');

const buf = fs.readFileSync('C:\\Restrnt\\Data\\Category.DB');

// Extract ASCII/printable strings of length >= 3
const strings = [];
let cur = '';
for (let i = 0; i < buf.length; i++) {
  const b = buf[i];
  if (b >= 32 && b <= 126) {
    cur += String.fromCharCode(b);
  } else {
    if (cur.length >= 2) strings.push(cur.trim());
    cur = '';
  }
}
if (cur.length >= 2) strings.push(cur.trim());

// Look for category-like patterns
const uniqueStrings = Array.from(new Set(strings)).filter(s => s.length >= 2);
console.log('Total extracted strings:', uniqueStrings.length);
for (const s of uniqueStrings.slice(0, 80)) {
  console.log(' ', s);
}
