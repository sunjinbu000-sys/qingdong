const test=require('node:test'),assert=require('node:assert/strict');
const {locateForumCity}=require('../miniprogram-1/miniprogram/utils/location');
test('automatic forum location resolves coordinates into a city and never uses profile city',async()=>{
 let request;const api={getLocation:o=>o.success({latitude:28,longitude:120}),request:o=>{request=o;o.success({statusCode:200,data:{status:0,result:{address_component:{city:'温州市',province:'浙江省'}}}});}};
 assert.deepEqual(await locateForumCity(api,{tencentMapKey:'test-key'}),{city:'温州',source:'gps'});assert.equal(request.data.location,'28,120');assert.equal(request.url,'https://apis.map.qq.com/ws/geocoder/v1/');
});
test('missing city configuration, denied permission and failed geocoder are explicit failures',async()=>{
 await assert.rejects(locateForumCity({},{}),/尚未配置/);
 await assert.rejects(locateForumCity({getLocation:o=>o.fail({})},{tencentMapKey:'test'}),/授权/);
 await assert.rejects(locateForumCity({getLocation:o=>o.success({latitude:28,longitude:120}),request:o=>o.success({statusCode:200,data:{status:0,result:{address_component:{province:'浙江省'}}}})},{tencentMapKey:'test'}),/无法识别/);
});
