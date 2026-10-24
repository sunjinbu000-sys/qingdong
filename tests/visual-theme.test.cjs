const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../miniprogram-1/miniprogram');
function luminance(hex){const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;}
test('all routes have an explicit visual theme and corresponding native navigation',()=>{
  const {pageThemes,families,themeForRoute}=require('../miniprogram-1/miniprogram/utils/theme');
  const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
  assert.deepEqual(Object.keys(pageThemes).sort(),app.pages.map(p=>p.split('/')[1]).sort());
  for(const route of app.pages){const theme=themeForRoute(route);assert.equal(theme,families[pageThemes[route.split('/')[1]]]);
    const json=JSON.parse(fs.readFileSync(path.join(root,route+'.json'),'utf8'));
    if(json.navigationStyle!=='custom')assert.equal(json.navigationBarBackgroundColor,theme.canvas);
    if(!['pages/startup/index','pages/health-profile/index'].includes(route))assert.ok(fs.readFileSync(path.join(root,route+'.wxml'),'utf8').includes('qd-theme qd-'+pageThemes[route.split('/')[1]]),route);
  }
  assert.equal(new Set(app.tabBar.list.map(t=>pageThemes[t.pagePath.split('/')[1]])).size,5);
});
test('theme labels and primary buttons maintain readable contrast',()=>{
  const {families}=require('../miniprogram-1/miniprogram/utils/theme');
  for(const [id,t] of Object.entries(families)){
    const sheet=fs.readFileSync(path.join(root,'styles/themes.wxss'),'utf8');
    assert.ok(sheet.includes('.qd-theme.qd-'+id+'{--qd-primary:'+t.primary+';--qd-canvas:'+t.canvas),id+' palette agrees with native chrome');
    assert.ok(sheet.includes('.entry-'+id),id+' destination entrance style exists');
    const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
    assert.ok(contrast(t.primary,'#FFFFFF')>=4.5,id+' primary button');
    assert.ok(contrast(t.ink,t.canvas)>=7,id+' heading');
    assert.ok(contrast(t.muted,'#FFFFFF')>=4.5,id+' secondary text');
  }
});
test('applying a tab theme changes native chrome without navigation or data writes',()=>{
  const {applyTheme,families}=require('../miniprogram-1/miniprogram/utils/theme');
  const old=global.wx,calls=[];global.wx={setTabBarStyle:o=>calls.push(['tab',o]),setNavigationBarColor:o=>calls.push(['nav',o]),setBackgroundColor:o=>calls.push(['bg',o])};
  try{applyTheme('pages/health/index');assert.equal(calls.find(c=>c[0]==='tab')[1].selectedColor,families.diary.primary);
    calls.length=0;applyTheme('pages/events/index');assert.equal(calls.some(c=>c[0]==='tab'),false);
    global.wx={};assert.doesNotThrow(()=>applyTheme('pages/forum/index'));
  }finally{global.wx=old;}
});
test('dynamic home and profile entrances match their destination and resolve their icons',()=>{
  const {pageThemes}=require('../miniprogram-1/miniprogram/utils/theme');
  const old=global.Page;let definition;
  global.Page=d=>definition=d;
  try{
    for(const name of ['index','profile']){
      const file=path.join(root,'pages',name,'index.js');delete require.cache[require.resolve(file)];require(file);
      const entries=name==='index'?definition.data.shortcuts:definition.data.menuGroups.flatMap(g=>g.items);
      for(const item of entries){assert.equal(item.theme,pageThemes[item.route],item.title);
        const image=name==='index'?'images/home/shortcuts/'+item.icon+'.png':'images/profile/'+item.icon+'.svg';
        assert.ok(fs.existsSync(path.join(root,image)),item.title+' icon');
      }
    }
  }finally{global.Page=old;}
});
test('native tab assets stay lightweight and have matching dimensions',()=>{
  const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));let bytes=0;
  for(const tab of app.tabBar.list)for(const key of ['iconPath','selectedIconPath']){
    const data=fs.readFileSync(path.join(root,tab[key]));bytes+=data.length;
    assert.equal(data.readUInt32BE(16),72);assert.equal(data.readUInt32BE(20),72);
  }
  assert.ok(bytes<25*1024,'all ten tab icons together under 25KB');
});
