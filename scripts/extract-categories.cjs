const fs = require('fs');

const buf = fs.readFileSync('C:\\Restrnt\\Data\\Category.DB');

// Paradox string fields: looking for pattern CatNo (10 digits like "0000000001") followed by CatName
const content = buf.toString('latin1');
const matches = content.matchAll(/(000000\d{4})[^\x20-\x7E]*([A-Za-z0-9\/\.\-\s]{3,30}?)(?:\s*X)?[\x00-\x1F]/g);

const categories = {};
for (const m of matches) {
  const code = m[1];
  let name = m[2].trim().replace(/\s+X$/, '').trim();
  // Remove leading non-alphanumeric noise chars if any
  name = name.replace(/^[^A-Za-z0-9]+/, '').trim();
  if (name.length > 1 && !categories[code]) {
    categories[code] = name;
  }
}

console.log(`Parsed ${Object.keys(categories).length} categories from Category.DB:`);
for (const [code, name] of Object.entries(categories)) {
  console.log(`  '${code}' => '${name}',`);
}

fs.writeFileSync('scripts/parsed-categories.json', JSON.stringify(categories, null, 2));
