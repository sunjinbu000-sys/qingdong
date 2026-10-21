const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", kind: "", accessMessage: "", activities: [] },
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
      let rows;
      if (this.data.canEdit && hub.signedIn)
        rows = await service.getRewardActivities();
      else rows = await service.getRewardTasks();
      this.setData({
        activities: rows.filter(
          (x) => !this.data.queryType || x.type === this.data.queryType,
        ),
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  toggle(e) {
    return this.action(async () => {
      await service.toggleRewardActivity(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  publish(e) {
    return this.action(async () => {
      await service.publishRewardActivity(
        e.currentTarget.dataset.id,
        e.currentTarget.dataset.approved,
      );
      await this.refresh();
    });
  },
});
