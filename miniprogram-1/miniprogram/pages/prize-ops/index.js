const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  refresh() {
    return this.loadData(async () =>
      this.setData({ ops: await service.getPrizeOps() }),
    );
  },
  save(e) {
    return this.action(async () => {
      await service.saveRankPrize(e.detail.value);
      await this.refresh();
    });
  },
  settle(e) {
    return this.action(async () => {
      await service.runMonthSettlement(e.detail.value.month);
      await this.refresh();
    });
  },
  fulfill(e) {
    return this.action(async () => {
      await service.fulfillPrize(
        e.currentTarget.dataset.id,
        e.detail.value.status,
      );
      await this.refresh();
    });
  },
});
