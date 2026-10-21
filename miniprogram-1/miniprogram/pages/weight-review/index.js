const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  refresh() {
    return this.loadData(async () =>
      this.setData({ rows: await service.listWeightReviews() }),
    );
  },
  review(e) {
    return this.action(async () => {
      await service.reviewWeight(
        e.currentTarget.dataset.id,
        e.detail.value.result === "approve",
        e.detail.value.note,
      );
      await this.refresh();
    });
  },
});
