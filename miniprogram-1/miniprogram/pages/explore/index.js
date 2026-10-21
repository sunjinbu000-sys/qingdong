const { page, service, navigate } = require("../../utils/page");
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
      { title: "成就徽章", route: "/pages/badges/index", icon: "gift" },
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
        consumer: h.sections.filter((x) => x.group === "consumer"),
        operations: h.sections.filter((x) => x.group === "operations"),
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
