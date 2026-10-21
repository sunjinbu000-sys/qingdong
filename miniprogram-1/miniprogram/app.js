const service = require("./services");
App({
  globalData: { appCode: "qingdong", mode: "mock" },
  onShow() {
    service
      .runChallengeJobs()
      .catch((error) => console.warn("本地结算任务未完成", error.message));
  },
});
