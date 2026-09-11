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

// Map of CategoryNo -> array of items
const catMap = new Map();

for (const line of lines) {
  const cols = parseCSV(line);
  const menuKey = cols[0];
  const itemCode = cols[1];
  const catNo = cols[2];
  const name = cols[5];
  const active = cols[14] === 'Y';
  const available = cols[15] === '1';
  const price = parseFloat(cols[35]) || 0;

  if (!catMap.has(catNo)) {
    catMap.set(catNo, []);
  }
  catMap.get(catNo).push({ menuKey, itemCode, name, active, available, price });
}

console.log('Total Categories found in Menu.txt:', catMap.size);

// Print categories with sample items
for (const [catNo, items] of Array.from(catMap.entries()).slice(0, 25)) {
  const sampleNames = items.slice(0, 3).map(i => i.name).join(', ');
  console.log(`Cat [${catNo}] (${items.length} items): ${sampleNames}`);
}
