const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    id: "",
    kind: "",
    accessMessage: "",
    ledger: [],
    activities: [],
    userId: "",
    revokeId: "",
    reason: "",
  },
  onLoad(q = {}) {
    this.setData({
      id: q.id || "",
      kind: q.kind || "",
      queryType: q.type || "",
    });
  },
  refresh() {
    return this.loadData(async () => {
      const hub = await service.getFeatureHub();
      this.setData({
        role: hub.role,
        signedIn: hub.signedIn,
        canHQ: hub.role === "hq",
        canAdmin: ["hq", "admin"].includes(hub.role),
        canEdit: ["hq", "admin", "operator"].includes(hub.role),
        accessMessage: hub.signedIn ? "" : "请先登录查看完整服务",
      });
      if (!hub.signedIn) return;
      if (!this.data.canAdmin) {
        this.setData({ accessMessage: "仅总部或区域管理员可查看发放账本" });
        return;
      }
      this.setData({
        ledger: await service.getRewardLedger(),
        activities: (await service.getRewardActivities()).filter((a) =>
          ["manual", "event", "rank"].includes(a.type),
        ),
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  activity(e) {
    const a = this.data.activities[+e.detail.value];
    this.setData({ activityId: a.id, activityTitle: a.title });
  },
  confirmManual() {
    return this.action(async () => {
      if (!this.data.activityId || !this.data.userId.trim())
        throw Error("请选择活动并填写用户编号");
      await service.confirmManualReward(
        this.data.activityId,
        this.data.userId.trim(),
      );
      wx.showToast({ title: "核验已记录" });
      await this.refresh();
    });
  },
  fulfill(e) {
    return this.action(async () => {
      await service.fulfillReward(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  chooseRevoke(e) {
    this.setData({ revokeId: e.currentTarget.dataset.id, reason: "" });
  },
  revoke() {
    return this.action(async () => {
      if (!this.data.reason.trim()) throw Error("请填写撤回原因");
      await service.revokeFullReward(
        this.data.revokeId,
        this.data.reason.trim(),
      );
      this.setData({ revokeId: "", reason: "" });
      await this.refresh();
    });
  },
});
