const Health = require("./reference/health-model");

const weightStyles = [
  { id: "gentle", label: "温和慢减", minutes: 15, menuOffset: 0, description: "从较短活动开始，循序养成习惯。" },
  { id: "efficient", label: "高效速减", minutes: 30, menuOffset: 7, description: "侧重规律执行；沿用目标校验，不提高减重速度上限。" },
  { id: "shape", label: "塑形维稳", minutes: 20, menuOffset: 14, description: "侧重持续活动与规律三餐，保持自己的节奏。" },
];
const exerciseOptions = Health.activities.map(a => ({ id: a.id, name: a.name, category: a.category }));

function normalizeWeightStyle(id) {
  const style = weightStyles.find(s => s.id === (id === undefined ? "gentle" : id));
  if (!style) throw Error("请选择有效减重风格");
  return style;
}

function normalizeExercise(input, style, duration) {
  if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) throw Error("请选择或填写运动方式");
  const value = input === undefined ? { activityId: "stroll" } : input;
  const activity = value.activityId ? exerciseOptions.find(a => a.id === value.activityId) : null;
  if (value.activityId && !activity) throw Error("运动方式不存在，请重新选择");
  const name = activity ? activity.name : typeof value.name === "string" ? value.name.trim() : "";
  if (!name || name.length > 40) throw Error("运动名称须为1—40字");
  const minutes = value.minutes === undefined ? Math.min(style.minutes, duration) : Number(value.minutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) throw Error("每日运动量须为5—240分钟的整数");
  if (minutes > duration) throw Error("每日运动量超过活动时段，请增加时段或减少分钟数");
  return { activityId: activity ? activity.id : "", name, minutes, source: activity ? "catalog" : "custom" };
}

function dailyExercise(preference, start, end, review) {
  return {
    activityId: preference.activityId, source: preference.source,
    name: review ? "日常活动须经专业人员确认" : preference.name,
    minutes: review ? 0 : preference.minutes,
    requestedName: preference.name, requestedMinutes: preference.minutes,
    time: start, end, needsReview: review,
  };
}

module.exports = { weightStyles, exerciseOptions, normalizeWeightStyle, normalizeExercise, dailyExercise };
