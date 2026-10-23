const test=require('node:test'),assert=require('node:assert/strict');
const {shareImage}=require('../miniprogram-1/miniprogram/utils/share-image');
test('poster sharing passes the generated image to native sharing without saving to album',async()=>{
 let requested;const result=await shareImage({showShareImageMenu:o=>{requested=o.path;o.success();}},'/owned/poster.png');assert.equal(requested,'/owned/poster.png');assert.equal(result.opened,true);
});
test('cancelled share is quiet and older clients open image preview',async()=>{
 const cancelled=await shareImage({showShareImageMenu:o=>o.fail({errMsg:'cancel'})},'/owned/poster.png');assert.equal(cancelled.cancelled,true);
 let path;const result=await shareImage({previewImage:o=>{path=o.current;o.success();},showToast:()=>{}},'/owned/poster.png');assert.equal(path,'/owned/poster.png');assert.equal(result.preview,true);
 await assert.rejects(shareImage({},''),/先生成/);
});
