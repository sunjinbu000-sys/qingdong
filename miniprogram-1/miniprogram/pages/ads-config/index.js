const { page, service } = require("../../utils/page");
page({
  data: { config: {}, logs: [] },
  refresh() {
    return this.loadData(async () => {
      const r = await service.getAdsConfig();
      this.setData({
        config: r.config || r,
        logs: (r.logs || r.receipts || []).slice().reverse().slice(0, 30),
      });
    });
  },
  input(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      ["config." + key]: e.currentTarget.dataset.number
        ? Number(e.detail.value)
        : e.detail.value,
    });
  },
  toggle(e) {
    this.setData({ ["config." + e.currentTarget.dataset.key]: e.detail.value });
  },
  save() {
    this.action(async () => {
      await service.saveAdsConfig(this.data.config);
      await this.refresh();
      wx.showToast({ title: "模拟配置已保存", icon: "success" });
    });
  },
});
