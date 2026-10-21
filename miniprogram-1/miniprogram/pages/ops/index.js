const { page, service } = require("../../utils/page");
const roles = ["consumer", "operator", "admin", "hq", "reviewer", "supervisor"];
page({
  data: {
    signedIn: false,
    role: "consumer",
    roleIndex: 0,
    operations: [],
    roleNames: [
      "消费者",
      "城市运营",
      "管理员",
      "总部管理员",
      "体重复核员",
      "复核主管",
    ],
    jobMessage: "",
  },
  refresh() {
    return this.loadData(async () => {
      const h = await service.getFeatureHub();
      this.setData({
        ...h,
        roleIndex: roles.indexOf(h.role),
        operations: h.sections.filter((x) => x.group === "operations"),
      });
    });
  },
  roleChange(e) {
    this.action(async () => {
      await service.setDemoRole(roles[e.detail.value]);
      await this.refresh();
    });
  },
  jobs() {
    this.action(async () => {
      const r = await service.runChallengeJobs();
      this.setData({
        jobMessage:
          "模拟任务已执行。已结束月份按冻结快照处理，重复执行不重复发奖。",
      });
    });
  },
});
