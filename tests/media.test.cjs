const test=require('node:test');
const assert=require('node:assert/strict');
const { chooseFoodImage, persistFoodImage }=require('../miniprogram-1/miniprogram/utils/media');
test('cancelling the picker returns null while other failures propagate',async()=>{
  assert.equal(await chooseFoodImage({chooseMedia:o=>o.fail({errMsg:'chooseMedia:fail cancel'})}),null);
  await assert.rejects(chooseFoodImage({chooseMedia:o=>o.fail({errMsg:'camera unavailable'})}),/相机|相册/);
});
test('oversized images are rejected before persistence',async()=>{
  await assert.rejects(chooseFoodImage({chooseMedia:o=>o.success({tempFiles:[{tempFilePath:'tmp',size:9*1024*1024}]})}),/8 MB/);
});
test('persistence returns owned file path and propagates disk errors',async()=>{
  const api={env:{USER_DATA_PATH:'wxfile://usr'},getFileSystemManager:()=>({copyFile:o=>o.success()})};
  assert.equal(await persistFoodImage(api,'tmp','request-1'),'wxfile://usr/qingdong-food-request-1.jpg');
  api.getFileSystemManager=()=>({copyFile:o=>o.fail({errMsg:'full'})});
  await assert.rejects(persistFoodImage(api,'tmp','request-2'),/保存/);
});
