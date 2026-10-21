const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');
test('recognition atomically deducts once and writes a labeled meal, repeated request is idempotent', () => {
  const f=setup(),d=f.domain;f.login();
  const input={imagePath:'wxfile://saved/food.jpg',requestId:'photo-1'};
  const r=d.recognizeMeal(input);const again=f.make().recognizeMeal(input);
  assert.equal(r.id,again.id);assert.equal(d.getMembership().remaining,2);
  assert.equal(d.getDiary('2026-10-21').meals.length,1);
  assert.equal(r.mock,true);assert.match(r.name,/模拟/);
});
test('quota resets at Beijing midnight and grant expiry stops recognition', () => {
  const f=setup(),d=f.domain;f.login();d.recognizeMeal({imagePath:'wxfile://saved/a.jpg',requestId:'1'});
  f.setTime('2026-10-21T16:00:00Z');assert.equal(d.getMembership().remaining,3);
  f.setTime('2026-10-23T16:00:00Z');assert.equal(d.getMembership().remaining,0);
  assert.throws(()=>d.recognizeMeal({imagePath:'wxfile://saved/a.jpg',requestId:'2'}),/权益|额度/);
});
test('invalid image and storage failure consume no quota and create no meal', () => {
  const f=setup(),d=f.domain;f.login();
  assert.throws(()=>d.recognizeMeal({imagePath:'',requestId:'bad'}));
  assert.equal(d.getMembership().used,0);
  f.storage.set=()=>{throw new Error('full');};
  assert.throws(()=>d.recognizeMeal({imagePath:'wxfile://saved/a.jpg',requestId:'fail'}),/存储/);
  assert.equal(d.getMembership().used,0);assert.equal(d.getDiary('2026-10-21').meals.length,0);
});
test('exhausted quota stops new requests and reward grant queues after existing grant', () => {
  const f=setup(),d=f.domain;f.login();
  for(let i=0;i<3;i++) d.recognizeMeal({imagePath:'wxfile://saved/a.jpg',requestId:String(i)});
  assert.throws(()=>d.recognizeMeal({imagePath:'wxfile://saved/a.jpg',requestId:'4'}),/额度/);
  d.enroll('first-step');d.checkIn();d.claimReward('first-step');
  const m=d.getMembership();assert.equal(m.timeline[1].start,m.timeline[0].end);assert.equal(m.remaining,0);
  f.setTime('2026-10-24T04:00:00Z');assert.equal(d.getMembership().remaining,3);
});
test('meal slot uses Beijing time and deleting a meal does not refund consumed quota', () => {
  const f=setup(),d=f.domain;f.login();
  f.setTime('2026-10-21T15:30:00Z');const r=d.recognizeMeal({imagePath:'wxfile://saved/a.jpg',requestId:'night'});
  assert.equal(r.slot,'snack');d.deleteRecord(r.recordId);assert.equal(d.getMembership().used,1);
});
