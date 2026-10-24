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


test('event covers persist through headquarters and local edits and appear in safe list projections',()=>{
 const f=setup(),d=f.domain;f.login();d.setDemoRole('hq');let event=d.getEvent('demo-event-0');event.coverImage='https://cdn.example.com/activity.jpg';d.saveEvent(event);let card=d.getEventSquare({scope:'national'}).available.find(e=>e.id===event.id);assert.equal(card.coverImage,event.coverImage);assert.equal(card.actualCount,0);assert.deepEqual(card.participantMarkers,[]);assert.equal(card.registrations,undefined);
 const withoutCover={...d.getEvent(event.id)};delete withoutCover.coverImage;d.saveEvent(withoutCover);assert.equal(d.getEvent(event.id).coverImage,event.coverImage);
 assert.throws(()=>d.saveEvent({...event,coverImage:'javascript:alert(1)'}),/封面/);assert.equal(d.getEvent(event.id).coverImage,event.coverImage);
 d.enrollEvent(event.id,{name:'小满'});card=d.getEventSquare({scope:'national'}).participated[0];assert.equal(card.actualCount,1);assert.equal(card.participantMarkers.length,1);
 d.setDemoRole('operator');d.saveEvent({...d.getEvent(event.id),coverImage:'wxfile://usr/event-cover.jpg'});assert.equal(d.getEvent(event.id).coverImage,'wxfile://usr/event-cover.jpg');
});


test('contact enrollment requires name and valid mobile and keeps contacts private',()=>{
 const f=setup(),d=f.domain;f.login();const id='demo-event-0';
 assert.throws(()=>d.enrollEventWithContact(id,{phone:'13800000000'}),/姓名/);
 assert.throws(()=>d.enrollEventWithContact(id,{name:'小满',phone:'123'}),/11位手机号/);
 assert.equal(d.getEvent(id).actualCount,0);
 d.enrollEventWithContact(id,{name:' 小满 ',phone:'13800000000'});let event=d.getEvent(id);assert.deepEqual(event.ownRegistration.values,{name:'小满',phone:'13800000000'});assert.equal(event.ownRegistration.schema.length,2);assert.equal(event.actualCount,1);
 assert.throws(()=>d.enrollEventWithContact(id,{name:'小满',phone:'13800000000'}),/不可报名/);assert.equal(d.getEvent(id).actualCount,1);
 const state=f.store.read();state.session.userId='other-person';f.store.write(state);event=d.getEvent(id);assert.equal(event.ownRegistration,null);assert.equal(event.registrations.length,0);assert.equal(JSON.stringify(d.getEventSquare()).includes('13800000000'),false);
});
