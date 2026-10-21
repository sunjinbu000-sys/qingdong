const { page, service } = require("../../utils/page");
page({
  data: {
    form: {},
    role: "consumer",
    adviceFields: [
      { key: "lowAdvice", label: "偏低场景的饮食提示" },
      { key: "normalAdvice", label: "一般场景的饮食提示" },
      { key: "highAdvice", label: "偏高场景的饮食提示" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      const h = await service.getFeatureHub();
      this.setData({
        role: h.role,
        form: await service.getHealthSettings(),
        platform: await service.getPlatformSettings(),
      });
    });
  },
  platformInput(e) {
    this.setData({
      ["platform." + e.currentTarget.dataset.key]: e.detail.value,
    });
  },
  savePlatform() {
    this.action(async () => {
      await service.savePlatformSettings(this.data.platform);
      wx.showToast({ title: "平台设置已保存" });
      await this.refresh();
    });
  },
  input(e) {
    this.setData({ ["form." + e.currentTarget.dataset.key]: e.detail.value });
  },
  save() {
    this.action(async () => {
      await service.saveHealthSettings(this.data.form);
      wx.showToast({ title: "配置已生效", icon: "success" });
      await this.refresh();
    });
  },
});
