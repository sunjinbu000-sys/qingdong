const { page, service } = require("../../utils/page");
page({
  data: {
    allowed: false,
    tab: "refund",
    tabs: [
      { key: "refund", label: "退款" },
      { key: "risk", label: "风控" },
      { key: "reports", label: "举报" },
      { key: "products", label: "履约" },
      { key: "audit", label: "日志" },
    ],
    records: { orders: [], reports: [], audit: [], blocks: [], products: [] },
    risk: { userId: "", reason: "" },
  },
  refresh() {
    return this.loadData(async () => {
      const h = await service.getFeatureHub();
      const allowed = h.signedIn && ["admin", "hq"].includes(h.role);
      this.setData({ allowed });
      if (allowed)
        this.setData({ records: await service.getPlatformRecords() });
    });
  },
  selectTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },
  riskInput(e) {
    this.setData({ ["risk." + e.currentTarget.dataset.key]: e.detail.value });
  },
  block() {
    this.action(async () => {
      await service.saveRiskBlock(this.data.risk);
      this.setData({ risk: { userId: "", reason: "" } });
      await this.refresh();
    });
  },
  unblock(e) {
    this.action(async () => {
      await service.removeRiskBlock(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  refund(e) {
    wx.showModal({
      title: "确认模拟退款？",
      content: "将撤销本订单剩余权益并重排时间线，不发生真实退款。",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.approveOrderRefund(e.currentTarget.dataset.id);
            await this.refresh();
          });
      },
    });
  },
  resolve(e) {
    wx.showModal({
      title: "处理结论",
      editable: true,
      placeholderText: "必填处理结果",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.resolveForumReport(
              e.currentTarget.dataset.post,
              e.currentTarget.dataset.id,
              r.content,
            );
            await this.refresh();
          });
      },
    });
  },
  fulfill(e) {
    this.action(async () => {
      await service.fulfillPrize(e.currentTarget.dataset.id, "已完成");
      await this.refresh();
    });
  },
});
