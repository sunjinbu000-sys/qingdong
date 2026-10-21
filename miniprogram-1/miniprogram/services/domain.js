const { bizDate, shiftDate, validDate } = require('../utils/date');
const { createSeed } = require('./seed');
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
  return {
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
