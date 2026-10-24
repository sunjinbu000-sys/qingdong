const test=require("node:test"),assert=require("node:assert/strict");const {loadInviteDashboard}=require("../miniprogram-1/miniprogram/services/invite-dashboard");
test("invitation destinations keep past personal rewards while showing current activities and claim windows",async()=>{
 const activity=(id,start,end,claimUntil)=>({id,type:"invite",start,end,claimUntil,tiers:[{canClaim:id==="claim-window"}]}),records=[{id:"friend",nickname:"真实好友"}];
 const result=await loadInviteDashboard({getSnapshot:()=>({date:"2026-10-24",profile:{nickname:"本人"},role:"consumer"}),getInvites:()=>({records}),getRewardTasks:()=>[activity("expired","2026-01-01","2026-01-20","2026-01-27"),activity("active","2026-10-01","2026-10-31","2026-11-07"),activity("claim-window","2026-10-01","2026-10-22","2026-10-29"),activity("future","2026-11-01","2026-11-30","2026-12-07")],getMyFullRewards:()=>[{id:"old",type:"invite",activityId:"expired"},{id:"forum",type:"forum"}]});
 assert.deepEqual(result.activities.map(a=>a.id),["active","claim-window"]);assert.deepEqual(result.rewards.map(r=>r.id),["old"]);assert.equal(result.invite.records,records);assert.equal(result.claimableCount,1);
});

test("personal invite activities follow the account city while general browsing remains unchanged",async()=>{
 const {setup}=require("./helpers.cjs"),f=setup(),d=f.domain;f.login();d.setDemoRole("hq");const plan=d.getCatalog()[0];const create=city=>d.saveRewardActivity({title:city+"邀请",type:"invite",city,start:"2026-10-01",end:"2026-10-31",claimUntil:"2026-11-07",published:true,tiers:[{name:"邀请一位",target:1,quota:10,planId:plan.id,rewardType:"member"}]});const local=create("温州"),other=create("杭州");d.setDemoRole("consumer");d.setBrowseContext({city:"杭州"});assert(d.getRewardTasks().some(a=>a.id===other.id));const personal=await loadInviteDashboard(d);assert(personal.activities.some(a=>a.id===local.id));assert(!personal.activities.some(a=>a.id===other.id));
});
