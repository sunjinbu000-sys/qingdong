function membershipView(state, date) {
  const userId = state.session && state.session.userId;
  const timeline = userId ? state.grants.filter(g => g.userId === userId).map(g => Object.assign({}, g, { status: date < g.start ? '待生效' : date >= g.end ? '已到期' : '生效中' })) : [];
  const activeGrant = timeline.find(g => g.start <= date && g.end > date) || null;
  const used = activeGrant ? state.recognitions.filter(r => r.userId === userId && r.date === date && r.grantId === activeGrant.id).length : 0;
  const dailyLimit = activeGrant ? activeGrant.dailyLimit : 0;
  return { activeGrant, timeline, used, dailyLimit, remaining: Math.max(0, dailyLimit - used), date };
}
function mealSlot(timestamp) {
  const hour = (new Date(timestamp).getUTCHours() + 8) % 24;
  return hour >= 5 && hour < 11 ? 'breakfast' : hour < 16 && hour >= 11 ? 'lunch' : hour >= 16 && hour < 23 ? 'dinner' : 'snack';
}
module.exports = { membershipView, mealSlot };
