const DAY = 86400000;
function bizDate(timestamp = Date.now()) {
  return new Date(timestamp + 8 * 3600000).toISOString().slice(0, 10);
}
function shiftDate(date, days) {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
}
function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}
module.exports = { bizDate, shiftDate, validDate };
