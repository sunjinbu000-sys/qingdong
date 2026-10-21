const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", kind: "", accessMessage: "", plans: [] },
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
      this.setData({ plans: await service.getCatalog() });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  toggle(e) {
    return this.action(async () => {
      await service.toggleCatalogPlan(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
});
