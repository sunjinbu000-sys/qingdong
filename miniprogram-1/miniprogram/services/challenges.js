const { shiftDate } = require("../utils/date");
function activityView(state, activity, date) {
  const userId = state.session && state.session.userId;
  const enrollment = state.enrollments.find(
    (e) => e.activityId === activity.id && e.userId === userId,
  );
  const progress = enrollment
    ? new Set(
        state.checkins
          .filter(
            (c) =>
              c.userId === userId &&
              c.date >= enrollment.date &&
              c.date >= activity.start &&
              c.date <= activity.end,
          )
          .map((c) => c.date),
      ).size
    : 0;
  const claimed = state.claims.some(
    (c) => c.activityId === activity.id && c.userId === userId,
  );
  const claimDeadline = shiftDate(activity.end, 7);
  const remainingSlots = Math.max(
    0,
    activity.slots -
      state.enrollments.filter(
        (e) => e.activityId === activity.id && e.reserved,
      ).length,
  );
  const canEnroll =
    !enrollment && date >= activity.start && date <= activity.end;
  const canClaim =
    !!enrollment && !!enrollment.reserved && !claimed && date <= claimDeadline;
  let statusLabel = "报名挑战";
  if (date < activity.start) statusLabel = "即将开始";
  else if (!enrollment && date > activity.end) statusLabel = "活动已结束";
  else if (claimed) statusLabel = "奖励已领取";
  else if (progress >= activity.days)
    statusLabel =
      date > claimDeadline
        ? "奖励已过期"
        : enrollment.reserved
          ? "达标 · 待领奖"
          : "达标 · 名额已满";
  else if (enrollment)
    statusLabel = date > activity.end ? "活动已结束" : "进行中";
  return Object.assign({}, activity, {
    enrolled: !!enrollment,
    progress: Math.min(progress, activity.days),
    progressPercent: Math.min(
      100,
      Math.round((progress / activity.days) * 100),
    ),
    claimed,
    claimDeadline,
    remainingSlots,
    canEnroll,
    canClaim,
    statusLabel,
  });
}
function reserveQualified(state, userId, date) {
  state.activities.forEach((activity) => {
    const e = state.enrollments.find(
      (e) => e.activityId === activity.id && e.userId === userId,
    );
    if (!e || e.qualifiedAt || date > activity.end) return;
    const view = activityView(state, activity, date);
    if (view.progress >= activity.days) {
      e.qualifiedAt = date;
      e.reserved = view.remainingSlots > 0;
    }
  });
}
module.exports = { activityView, reserveQualified };
