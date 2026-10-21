const { page, service } = require("../../utils/page");
page({
  data: { orders: [] },
  refresh() {
    return this.loadData(async () =>
      this.setData({
        orders: await service.listOrders(),
        role: (await service.getSnapshot()).role || "consumer",
      }),
    );
  },
  refund(e) {
    this.action(async () => {
      await service.requestOrderRefund(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  approve(e) {
    this.action(async () => {
      await service.approveOrderRefund(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
});
