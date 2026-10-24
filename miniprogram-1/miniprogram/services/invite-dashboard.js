// Both invitation screens use the same personal records and current reward activities.
async function loadInviteDashboard(service) {
  const snapshot=await service.getSnapshot();
  const all=(await service.getRewardTasks({scope:"account"})).filter(a=>a.type==="invite");
  const ids=new Set(all.map(a=>a.id));
  const rewards=(await service.getMyFullRewards()).filter(r=>r.type==="invite" || ids.has(r.activityId));
  const activities=all.filter(a=>a.start<=snapshot.date && (a.claimUntil || a.end)>=snapshot.date);
  return {invite:await service.getInvites(),activities,rewards,role:snapshot.role,profile:snapshot.profile,claimableCount:activities.reduce((sum,a)=>sum+a.tiers.filter(t=>t.canClaim).length,0)};
}
module.exports={loadInviteDashboard};
