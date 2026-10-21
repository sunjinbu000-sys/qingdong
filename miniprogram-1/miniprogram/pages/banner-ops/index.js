const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", kind: "", accessMessage: "", banners: [] },
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
      this.setData({
        banners:
          this.data.canHQ && hub.signedIn
            ? await service.getBannerSettings()
            : await service.getHomeBanners(),
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  remove(e) {
    wx.showModal({
      title: "删除展示位",
      content: "确认移除这个首页展示位？",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.deleteBanner(e.currentTarget.dataset.id);
            await this.refresh();
          });
      },
    });
  },
});
