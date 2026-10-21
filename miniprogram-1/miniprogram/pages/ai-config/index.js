const { exportWorkbook } = require("../../utils/export");
const { page, service } = require("../../utils/page");
page({
  data: {
    config: {},
    logs: [],
    providers: [],
    providerForm: {
      name: "",
      textUrl: "https://example.com/v1/chat/completions",
      imageUrl: "https://example.com/v1/chat/completions",
      textModel: "demo-text",
      imageModel: "demo-photo",
      apiKey: "DEMO_ONLY",
    },
  },
  refresh() {
    return this.loadData(async () => {
      const r = await service.getAIConfig();
      this.setData({
        config: r.config || r,
        providers: r.providers || [],
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
  providerInput(e) {
    this.setData({
      ["providerForm." + e.currentTarget.dataset.key]: e.detail.value,
    });
  },
  editProvider(e) {
    const p = this.data.providers.find(
      (x) => x.id === e.currentTarget.dataset.id,
    );
    this.setData({
      providerForm: Object.assign({}, p, { apiKey: "DEMO_ONLY" }),
    });
  },
  newProvider() {
    this.setData({
      providerForm: {
        name: "",
        textUrl: "https://example.com/v1/chat/completions",
        imageUrl: "https://example.com/v1/chat/completions",
        textModel: "demo-text",
        imageModel: "demo-photo",
        apiKey: "DEMO_ONLY",
      },
    });
  },
  saveProvider() {
    this.action(async () => {
      await service.saveAIProvider(this.data.providerForm);
      await this.refresh();
      wx.showToast({ title: "演示服务商已保存", icon: "success" });
    });
  },
  activate(e) {
    this.setData({ "config.active": e.currentTarget.dataset.id });
  },
  removeProvider(e) {
    this.action(async () => {
      await service.removeAIProvider(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  exportLogs() {
    this.action(async () =>
      exportWorkbook(await service.getAILogExportRows(), "轻动-AI模拟调用日志"),
    );
  },
  save() {
    this.action(async () => {
      await service.saveAIConfig(this.data.config);
      await this.refresh();
      wx.showToast({ title: "模拟配置已保存", icon: "success" });
    });
  },
});
