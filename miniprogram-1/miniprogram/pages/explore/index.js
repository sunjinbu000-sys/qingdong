const { page, service, navigate } = require("../../utils/page");
const entryIcons = {"team": "/images/home/shortcuts/team.png", "team-detail": "/images/home/shortcuts/team.png", "team-invite": "/images/home/shortcuts/invite.png", "badges": "/images/home/shortcuts/badges.png", "rank": "/images/home/shortcuts/rank.png", "rank-history": "/images/home/shortcuts/rank.png", "ai-plan": "/images/home/shortcuts/ai-plan.png", "events": "/images/home/shortcuts/events.png", "event-detail": "/images/home/shortcuts/events.png", "invite": "/images/home/shortcuts/invite.png", "weight-trend": "/images/home/shortcuts/trend.png", "membership": "/images/ui/member.svg", "privacy": "/images/ui/shield.svg", "account": "/images/ui/edit.svg", "health-profile": "/images/ui/leaf.svg", "health": "/images/ui/book.svg", "health-overview": "/images/ui/weight.svg", "photo": "/images/ui/camera.svg", "photo-history": "/images/ui/gallery.svg", "share": "/images/ui/leaf.svg", "orders": "/images/ui/member.svg", "rewards": "/images/ui/gift.svg", "reward-tasks": "/images/ui/gift.svg", "full-rewards": "/images/ui/gift.svg", "personal-services": "/images/ui/sun.svg", "member-services": "/images/ui/member.svg", "explore": "/images/ui/sun.svg", "forum": "/images/ui/book.svg", "records": "/images/ui/edit.svg", "weight": "/images/ui/weight.svg", "ops": "/images/ui/shield.svg"};
function withIcon(item) { const name = (item.route || "").split("/")[2]; return { ...item, visualIcon: entryIcons[name] || "/images/ui/" + (/reward|prize/.test(name) ? "gift" : /config|editor|word/.test(name) ? "edit" : /forum|discussion/.test(name) ? "book" : /banner/.test(name) ? "gallery" : /rank/.test(name) ? "rank" : /invite/.test(name) ? "gift" : /team/.test(name) ? "flag" : /weight/.test(name) ? "weight" : /profile/.test(name) ? "leaf" : /challenges|activity/.test(name) ? "flag" : "shield") + ".svg" }; }
const labels = {
  consumer: "消费者",
  operator: "城市运营",
  admin: "管理员",
  hq: "总部管理员",
  reviewer: "体重复核员",
  supervisor: "复核主管",
};
page({
  data: {
    sections: [],
    consumer: [],
    operations: [],
    role: "consumer",
    roleLabel: "消费者",
    extras: [
      { title: "我的小队", route: "/pages/team/index", icon: "flag" },
      { title: "成长徽章", route: "/pages/badges/index", icon: "gift" },
      {
        title: "营养与日历",
        route: "/pages/health-overview/index",
        icon: "book",
      },
      { title: "打卡海报", route: "/pages/share/index", icon: "leaf" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      const h = await service.getFeatureHub();
      this.setData({
        ...h,
        consumer: h.sections.filter((x) => x.group === "consumer").map(withIcon),
        operations: h.sections.filter((x) => x.group === "operations").map(withIcon),
        roleLabel: labels[h.role],
      });
    });
  },
  openOps(e) {
    if (this.data.role === "consumer") {
      wx.showModal({
        title: "切换运营体验身份",
        content: "运营板块通过模拟身份体验不同权限，不代表真实授权。",
        confirmText: "去切换",
        confirmColor: "#1d6651",
        success: (r) => {
          if (r.confirm) navigate("/pages/ops/index");
        },
      });
    } else navigate(e.currentTarget.dataset.url);
  },
});
