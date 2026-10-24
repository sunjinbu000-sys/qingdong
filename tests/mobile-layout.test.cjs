const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../miniprogram-1/miniprogram');
test('shared mobile entry rows constrain tracks buttons and long labels explicitly',()=>{
  const sheet=fs.readFileSync(path.join(root,'styles/mobile-layout.wxss'),'utf8');
  assert.match(sheet,/\.service-links\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(sheet,/\.service-links\s*>\s*\.btn\s*\{[^}]*box-sizing:\s*border-box[^}]*min-width:\s*0/);
  assert.match(sheet,/\.service-links\s*>\s*\.btn\s*>\s*text\s*\{[^}]*min-width:\s*0[^}]*white-space:\s*normal/);
});
test('multi-column grids never rely on automatic min-content track widths',()=>{
  const files=[path.join(root,'app.wxss'),...fs.readdirSync(path.join(root,'pages')).map(name=>path.join(root,'pages',name,'index.wxss')).filter(f=>fs.existsSync(f))];
  for(const file of files){const source=fs.readFileSync(file,'utf8');
    for(const [,columns]of source.matchAll(/grid-template-columns:([^;}]+)/g))assert.ok(!/^\s*(?:1fr\s+){1,}1fr\s*$/.test(columns)&&!/^\s*repeat\(\d+,\s*1fr\)\s*$/.test(columns),path.relative(root,file)+': unconstrained '+columns);
  }
});
