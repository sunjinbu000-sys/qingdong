const { bizDate, shiftDate, validDate } = require('../utils/date');
const { createSeed } = require('./seed');
const { activityView, reserveQualified } = require('./challenges');
const { membershipView, mealSlot } = require('./membership');
const CITIES = ['温州', '杭州', '宁波', '上海', '北京', '广州', '深圳', '成都'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
function requireLogin(state) {
  if (!state.session) throw new Error('请先登录模拟账号');
  return state.session.userId;
}
function requireCity(state) {
  const userId = requireLogin(state);
  if (!state.profile.city) throw new Error('请先确认所在城市');
  return userId;
}
function positive(value, label, max) {
  if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > max) throw new Error(label + '请填写有效数值（大于 0，不超过 ' + max + '）');
  return Math.round(Number(value) * 10) / 10;
}
function text(value, label, max = 40) {
  const result = String(value || '').trim();
  if (!result || result.length > max) throw new Error(label + '请填写 1–' + max + ' 个字');
  return result;
}
function summarize(records) {
  return { calories: Math.round(records.filter(r => r.type === 'meal').reduce((n, r) => n + r.kcal, 0)), minutes: Math.round(records.filter(r => r.type === 'exercise').reduce((n, r) => n + r.minutes, 0)), weight: (records.filter(r => r.type === 'weight').slice(-1)[0] || {}).kg || '—' };
}
function createDomain({ store, now = Date.now }) {
  let serial = 0;
  const id = prefix => prefix + '-' + now() + '-' + (++serial) + '-' + Math.random().toString(36).slice(2, 7);
  const today = () => bizDate(now());
  function read() {
    const state = store.read();
    if (state && state.version === 1) return state;
    const initial = createSeed(bizDate(now()));
    store.write(initial);
    return initial;
  }
  function change(work) {
    const state = read();
    const result = work(state);
    store.write(state);
    return result;
  }
  function validateDate(date) {
    if (!validDate(date) || date > today() || date < '2000-01-01') throw new Error('请选择 2000 年至今天之间的有效日期');
    return date;
  }
  function activity(s, activityId) {
    const result = s.activities.find(a => a.id === activityId);
    if (!result) throw new Error('没有找到这个挑战，请返回活动列表');
    return result;
  }
  return {
    getMembership() { const s = read(); requireLogin(s); return membershipView(s, today()); },
    recognizeMeal(input) {
      return change(s => {
        const userId = requireCity(s);
        const requestId = text(input.requestId, '请求编号', 100);
        const existing = s.recognitions.find(r => r.userId === userId && r.requestId === requestId);
        if (existing) return existing;
        if (typeof input.imagePath !== 'string' || !input.imagePath.trim() || input.imagePath.length > 1000) throw new Error('请先保存一张食物照片');
        const m = membershipView(s, today());
        if (!m.activeGrant || m.remaining < 1) throw new Error('今日识餐额度不足，请查看会员权益');
        const slot = mealSlot(now());
        const record = { id: id('record'), userId, type: 'meal', date: today(), slot, name: '鸡肉蔬菜饭 · 模拟样例', kcal: 520, source: 'recognition', imagePath: input.imagePath, createdAt: now() };
        const recognition = { id: id('recognition'), userId, requestId, recordId: record.id, grantId: m.activeGrant.id, date: today(), slot, imagePath: input.imagePath, name: record.name, kcal: 520, protein: 32, carbohydrate: 62, fat: 16, mock: true };
        s.records.push(record); s.recognitions.push(recognition); return recognition;
      });
    },
    listActivities() { const s = read(); return s.activities.map(a => activityView(s, a, today())); },
    getActivity(activityId) { const s = read(); return activityView(s, activity(s, activityId), today()); },
    enroll(activityId) {
      return change(s => {
        const userId = requireCity(s); const a = activity(s, activityId);
        if (today() < a.start) throw new Error('活动还未开始');
        if (today() > a.end) throw new Error('活动已结束');
        if (!s.enrollments.some(e => e.userId === userId && e.activityId === activityId)) s.enrollments.push({ id: id('enroll'), userId, activityId, date: today(), city: s.profile.city });
        reserveQualified(s, userId, today());
        return activityView(s, a, today());
      });
    },
    checkIn() {
      return change(s => {
        const userId = requireCity(s);
        if (!s.checkins.some(c => c.userId === userId && c.date === today())) s.checkins.push({ userId, date: today(), checkedAt: now() });
        reserveQualified(s, userId, today());
        return { date: today(), checkedIn: true };
      });
    },
    claimReward(activityId) {
      return change(s => {
        const userId = requireCity(s); const a = activity(s, activityId);
        const existing = s.claims.find(c => c.userId === userId && c.activityId === activityId);
        if (existing) return existing;
        const view = activityView(s, a, today());
        if (!view.enrolled || view.progress < a.days) throw new Error('还未达标，完成挑战后再来领取');
        if (today() > view.claimDeadline) throw new Error('奖励已过期');
        if (!view.canClaim) throw new Error('奖励名额已满，看看其他挑战吧');
        const start = s.grants.filter(g => g.userId === userId).reduce((date, g) => g.end > date ? g.end : date, today());
        const grant = { id: id('grant'), userId, source: 'activity:' + activityId, title: a.title + ' · 奖励卡', start, end: shiftDate(start, a.rewardDays), days: a.rewardDays, dailyLimit: 3 };
        const claim = { id: id('claim'), userId, activityId, title: a.title, days: a.rewardDays, date: today(), grantId: grant.id, start: grant.start, end: grant.end };
        s.grants.push(grant); s.claims.push(claim); return claim;
      });
    },
    getRewards() {
      const s = read(); const userId = requireLogin(s);
      return { available: s.activities.map(a => activityView(s, a, today())).filter(a => a.enrolled && !a.claimed), claims: s.claims.filter(c => c.userId === userId).slice().reverse() };
    },
    getRank() {
      const s = read(); const userId = s.session && s.session.userId;
      const rows = [ { nickname: '周小树', days: 21, initial: '周' }, { nickname: '叶晴', days: 19, initial: '叶' }, { nickname: '陈一一', days: 19, initial: '陈' }, { nickname: '慢慢来', days: 16, initial: '慢' }, { nickname: '小岛', days: 12, initial: '岛' } ];
      const myDays = userId ? s.checkins.filter(c => c.userId === userId).length : 0;
      if (userId && s.privacy.publicRank && myDays) rows.push({ nickname: s.profile.nickname, initial: s.profile.nickname.slice(0, 1), days: myDays, isMe: true });
      rows.sort((a, b) => b.days - a.days);
      rows.forEach((r, index) => { r.rank = index && rows[index - 1].days === r.days ? rows[index - 1].rank : index + 1; });
      return { rows, myDays, participating: !!userId && s.privacy.publicRank, city: userId && s.profile.city || '温州' };
    },
    loginDemo() {
      return change(s => {
        s.session = { userId: 'demo-user' };
        if (!s.grants.some(g => g.source === 'beginner')) s.grants.push({ id: id('grant'), userId: 'demo-user', source: 'beginner', title: '新朋友体验卡', start: today(), end: shiftDate(today(), 3), days: 3, dailyLimit: 3 });
        return s.profile;
      });
    },
    logout() { return change(s => { s.session = null; }); },
    saveProfile(input) {
      return change(s => {
        requireLogin(s);
        const nickname = text(input.nickname, '昵称', 20);
        if (!CITIES.includes(input.city)) throw new Error('请选择支持的演示城市');
        const height = input.height === '' || input.height == null ? '' : positive(input.height, '身高', 250);
        const targetWeight = input.targetWeight === '' || input.targetWeight == null ? '' : positive(input.targetWeight, '目标体重', 350);
        if (s.enrollments.length && s.profile.city && input.city !== s.profile.city) throw new Error('已报名活动，演示账号暂不支持更换城市，可重置演示数据后重选');
        s.profile = { nickname, city: input.city, height, targetWeight };
        return s.profile;
      });
    },
    getDiary(date) {
      const s = read(); const userId = requireLogin(s); validateDate(date);
      const records = s.records.filter(r => r.userId === userId && r.date === date);
      return { date, meals: records.filter(r => r.type === 'meal'), exercises: records.filter(r => r.type === 'exercise'), weights: records.filter(r => r.type === 'weight'), summary: summarize(records) };
    },
    saveRecord(input) {
      return change(s => {
        const userId = requireCity(s); const date = validateDate(input.date);
        const record = { id: id('record'), userId, date, type: input.type, createdAt: now() };
        if (input.type === 'meal') {
          if (!SLOTS.includes(input.slot)) throw new Error('请选择餐次');
          Object.assign(record, { name: text(input.name, '饮食名称'), kcal: positive(input.kcal, '热量', 20000), slot: input.slot, source: 'manual' });
        } else if (input.type === 'exercise') Object.assign(record, { name: text(input.name, '运动名称'), minutes: positive(input.minutes, '运动时长', 1440) });
        else if (input.type === 'weight') record.kg = positive(input.kg, '体重', 350);
        else throw new Error('记录类型无效');
        s.records.push(record); return record;
      });
    },
    deleteRecord(recordId) {
      return change(s => { const userId = requireLogin(s); s.records = s.records.filter(r => !(r.id === recordId && r.userId === userId)); });
    },
    getSnapshot() {
      const s = read();
      const date = bizDate(now());
      const userId = s.session && s.session.userId;
      const records = s.records.filter(r => r.userId === userId && r.date === date);
      return Object.assign({ date, signedIn: !!s.session, profile: s.session ? s.profile : { nickname: '轻动新朋友', city: '' }, checkedIn: !!userId && s.checkins.some(x => x.userId === userId && x.date === date), totalDays: userId ? s.checkins.filter(x => x.userId === userId).length : 0, activities: s.activities, mock: true }, summarize(records));
    },
  };
}
module.exports = { createDomain };
