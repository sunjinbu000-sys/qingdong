const service = require("./services/index");
App({
  globalData: { appCode: "qingdong", mode: "mock" },
  onHide() { require("./utils/startup-display").suspend(); },
  onShow() {
    require("./utils/startup-display").requestEntry();
    service
      .runChallengeJobs()
      .catch((error) => console.warn("本地结算任务未完成", error.message));
  },
});
