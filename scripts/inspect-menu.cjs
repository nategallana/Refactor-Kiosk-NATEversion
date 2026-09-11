const fs = require('fs');
const lines = fs.readFileSync('Menu.txt', 'utf8').split(/\r?\n/).filter(Boolean);

function parseCSV(l) {
  const res = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim());
  return res;
}

// Find columns across all lines that have non-zero numbers
const colValues = {};
lines.forEach((line, lineIdx) => {
  const cols = parseCSV(line);
  cols.forEach((val, cIdx) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (!colValues[cIdx]) colValues[cIdx] = [];
      if (colValues[cIdx].length < 5) {
        colValues[cIdx].push({ line: lineIdx + 1, item: cols[1], name: cols[5], val });
      }
    }
  });
});

console.log('Columns with non-zero numeric values:');
for (const [col, samples] of Object.entries(colValues)) {
  console.log(`\nCol ${col} (sample count: ${samples.length}):`);
  samples.forEach(s => console.log(`  Line ${s.line} [${s.item} - ${s.name}]: ${s.val}`));
}
