const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./helpers.cjs');
test('event square filters enrollment active events and owns participation and reward history',()=>{
 const f=setup(),d=f.domain;f.login();let square=d.getEventSquare();assert(square.available.some(e=>e.id==='demo-event-0'));assert.equal(square.ongoing.length,0);assert.equal(square.participated.length,0);
 d.enrollEvent('demo-event-0',{name:'本人报名'});square=d.getEventSquare();assert(!square.available.some(e=>e.id==='demo-event-0'));assert.equal(square.participated[0].participationStatus,'已报名');assert.equal(square.participated[0].registrations,undefined);
 f.setTime('2026-10-24T01:30:00Z');square=d.getEventSquare();assert(square.ongoing.some(e=>e.id==='demo-event-0'));
 d.setDemoRole('hq');const userId=f.store.read().session.userId;d.verifyEvent('demo-event-0',userId,[true,true]);d.claimEventReward('demo-event-0');square=d.getEventSquare();assert.equal(square.rewards.length,1);assert.equal(square.rewards[0].date,'2026-10-24');assert.equal(square.rewards[0].items.length,2);assert.equal(square.rewards[0].items[1].status,'待履约');assert.equal(square.participated[0].claimed,true);
 const state=f.store.read();state.session.userId='someone-else';f.store.write(state);assert.equal(d.getEventSquare().participated.length,0);assert.equal(d.getEventSquare().rewards.length,0);
 state.session=null;f.store.write(state);assert.equal(d.getEventSquare().participated.length,0);assert.equal(d.getEventSquare().rewards.length,0);
});

test('event scopes distinguish national activities from the current city',()=>{
 const f=setup(),d=f.domain;f.login();const national=d.getEventSquare({scope:'national'}),local=d.getEventSquare({scope:'city'});
 assert(national.available.some(e=>e.city==='杭州'));assert(!local.available.some(e=>e.city==='杭州'));assert(local.available.some(e=>e.scope==='all'));assert(national.available.find(e=>e.city==='杭州').canEnroll===false);
});
