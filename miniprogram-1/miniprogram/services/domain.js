const { bizDate } = require('../utils/date');
const { createSeed } = require('./seed');
function createDomain({ store, now = Date.now }) {
  function read() {
    const state = store.read();
    if (state && state.version === 1) return state;
    const initial = createSeed(bizDate(now()));
    store.write(initial);
    return initial;
  }
  return {
    getSnapshot() {
      const s = read();
      const date = bizDate(now());
      return { date, signedIn: !!s.session, profile: s.session ? s.profile : { nickname: '轻动新朋友', city: '' }, checkedIn: !!s.session && s.checkins.some(x => x.date === date), totalDays: s.session ? s.checkins.length : 0, calories: 0, minutes: 0, weight: '—', activities: s.activities, mock: true };
    },
  };
}
module.exports = { createDomain };
