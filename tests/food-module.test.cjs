const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Mini-program require resolves JavaScript modules, unlike Node's JSON loader.
test('food photos and attribution load with a JavaScript-only module loader', () => {
  const root = path.resolve(__dirname, '../miniprogram-1/miniprogram');
  const cache = new Map();
  function load(file) {
    if (!file.endsWith('.js')) file += '.js';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const run = vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync(file, 'utf8') + '\n})', { filename: file });
    run(name => load(path.resolve(path.dirname(file), name)), module, module.exports);
    return module.exports;
  }
  const icons = load(path.join(root, 'utils/food-icons.js'));
  for (const [id, tab] of [['rice', 'foods'], ['oatbowl', 'recipes']]) {
    const image = icons.foodIcon({ id }, tab);
    assert.ok(fs.existsSync(path.join(root, image)));
    const credit = icons.foodPhotoCredit({ id }, tab);
    assert.ok(credit.author && credit.source && credit.license);
  }
});
