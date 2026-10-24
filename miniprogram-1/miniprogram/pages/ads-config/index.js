const { page, service } = require("../../utils/page");
page({
  data: { config: {}, logs: [], startup: {}, startupTypes: [{key:"image",label:"图片"},{key:"video",label:"视频"},{key:"tencent",label:"腾讯广告"}] },
  refresh() {
    return this.loadData(async () => {
      const r = await service.getAdsConfig();
      const startup = await service.getStartupConfig();
      this.setData({
        config: r.config || r, startup,
        logs: (r.logs || r.receipts || []).slice().reverse().slice(0, 30),
      });
    });
  },
  startupInput(e) { const k=e.currentTarget.dataset.key;this.setData({["startup."+k]:["dailyLimit","duration","skipAfter"].includes(k)?Number(e.detail.value):e.detail.value}); },
  startupToggle(e) { this.setData({"startup.enabled":e.detail.value}); },
  startupType(e) { this.setData({"startup.type":e.currentTarget.dataset.type}); },
  saveStartup() { return this.action(async()=>{await service.saveStartupConfig(this.data.startup);await this.refresh();wx.showToast({title:"开屏设置已保存",icon:"success"});}); },
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
