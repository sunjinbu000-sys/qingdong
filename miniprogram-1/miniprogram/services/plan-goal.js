function assessPlanGoal(profile, input, config) {
  const days = Number(input.days === undefined ? (profile.goalDays || 7) : input.days);
  const requestedLossJin = Number(input.lossJin || 0);
  if (!Number.isInteger(days) || days < 1 || days > Math.min(config.maxDays || 1096, 1096)) throw Error("计划天数须为有效范围内的整数");
  if (!Number.isFinite(requestedLossJin) || requestedLossJin < 0 || requestedLossJin > 100) throw Error("目标减重须为0–100斤，0表示维持或记录");
  const weight = Number(profile.weight), height = Number(profile.height), age = Number(profile.age);
  if (!(weight > 0 && height > 0 && age > 0)) throw Error("请先完善档案的年龄、身高和当前体重");
  const lossKg = requestedLossJin * 0.5, targetWeight = weight - lossKg;
  if (targetWeight <= 0) throw Error("目标减重不能达到或超过当前体重，请核对斤与公斤单位");
  const weeklyKg = lossKg * 7 / days;
  const limit = Number(config.maxWeekly) > 0 ? Number(config.maxWeekly) : 0.5;
  const reasons = [];
  if (profile.direction === "仅记录日常" || profile.direction === "保持体重，规律生活") reasons.push("档案方向为记录或维持");
  if (age < 18 || age >= 65 || profile.special || (profile.conditions && profile.conditions !== "无")) reasons.push("当前年龄或健康状态需要专业确认");
  if (weight / (height / 100) ** 2 < 24) reasons.push("当前档案不进入自动量化减重模式");
  const tooFast = requestedLossJin > 0 && weeklyKg > limit + 1e-9;
  const tooLow = requestedLossJin > 0 && targetWeight / (height / 100) ** 2 < 18.5;
  if (tooFast) reasons.push("目标速度超出当前自动计划参考上限");
  if (tooLow) reasons.push("目标体重低于当前自动计划参考范围");
  const needsReview = reasons.length > 0;
  const suggestedDays = tooFast && !tooLow && reasons.length === 1 ? Math.ceil(lossKg / limit * 7) : 0;
  return { days, requestedLossJin, lossKg, weeklyKg: Math.round(weeklyKg * 100) / 100, weeklyLimitKg: limit, targetWeight: Math.round(targetWeight * 10) / 10, tooFast, tooLow, needsReview, suggestedDays,
    effectiveLossJin: needsReview ? 0 : requestedLossJin,
    reasons,
    message: days + "天" + requestedLossJin + "斤 = " + lossKg + "公斤，折合每周" + (Math.round(weeklyKg * 100) / 100) + "公斤。" + (tooFast ? "当前程序自动计划参考上限为每周" + limit + "公斤。" : "") + reasons.join("；") + (suggestedDays ? "。按当前上限可将周期调整至至少" + suggestedDays + "天。" : ""),
  };
}
module.exports = { assessPlanGoal };
