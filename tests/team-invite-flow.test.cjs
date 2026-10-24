const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./helpers.cjs');
test('team invitations expire after seven days and dissolution invalidates invitations',()=>{
 const f=setup(),d=f.domain;f.login();const team=d.createTeam({earlyBefore:"08:00",name:'一起同行',max:5,start:'2026-10-22',end:'2026-11-20',method:'invite',tasks:["signin","early","weight"]});
 const invite=d.generateTeamInvite(team.id);assert.equal(invite.expires,'2026-10-28');assert.equal(d.generateTeamInvite(team.id).code,invite.code);assert.equal(d.getTeamInvitation(invite.code).name,'一起同行');
 f.setTime('2026-10-28T04:00:00Z');assert.throws(()=>d.getTeamInvitation(invite.code),/过期/);
 const refreshed=d.generateTeamInvite(team.id);assert.notEqual(refreshed.code,invite.code);assert.equal(refreshed.expires,'2026-11-04');
 d.dissolveTeam(team.id);assert.throws(()=>d.getTeamInvitation(refreshed.code),/无效/);assert(!d.listTeams({city:'温州'}).some(t=>t.id===team.id));
});
test('only the captain can issue invitations or dissolve a recruiting team',()=>{
 const f=setup(),d=f.domain;f.login();const team=d.createTeam({earlyBefore:"08:00",name:'权限小队',max:5,start:'2026-10-22',end:'2026-10-28',tasks:["signin","early","weight"]});
 const state=f.store.read();state.session.userId='another-user';f.store.write(state);
 assert.throws(()=>d.generateTeamInvite(team.id));assert.throws(()=>d.dissolveTeam(team.id));
});
