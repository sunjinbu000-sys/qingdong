const { page, service } = require("../../utils/page");
page({
  data: { signedIn: false, badges: [], milestones: [], litCount: 0 },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      const [stats, teams, plans] = s.signedIn
        ? await Promise.all([service.getProfileSummary(), service.listTeams(), service.getAIPlans()])
        : [{ recordDays: 0, meals: 0, streak: 0 }, [], []];
      const habitCount = plans.reduce((total, plan) => total + (plan.checks || []).length, 0);
      const milestones = [
        { id: "first-record", title: "初次记录", rule: "第一次用心记录", value: stats.recordDays, target: 1, image: "/images/home/shortcuts/ai-plan.png" },
        { id: "meals", title: "认真吃饭", rule: "记录 7 次餐食", value: stats.meals, target: 7, image: "/images/profile/avatar.png" },
        { id: "week", title: "一周陪伴", rule: "连续记录 7 天", value: stats.streak, target: 7, image: "/images/home/shortcuts/badges.png" },
        { id: "team", title: "小队同行", rule: "加入 1 个轻动小队", value: teams.filter(t => t.isMember).length, target: 1, image: "/images/home/shortcuts/team.png" },
        { id: "month", title: "月度坚持", rule: "累计记录 30 天", value: stats.recordDays, target: 30, image: "/images/home/shortcuts/rank.png" },
        { id: "habits", title: "规律生活", rule: "完成 30 次计划打卡", value: habitCount, target: 30, image: "/images/home/shortcuts/invite.png" },
      ].map(item => ({ ...item, unlocked: item.value >= item.target }));
      this.setData({
        milestones,
        litCount: milestones.filter(item => item.unlocked).length,
        signedIn: s.signedIn,
        badges: s.signedIn ? await service.getBadges() : [],
      });
    });
  },
});
