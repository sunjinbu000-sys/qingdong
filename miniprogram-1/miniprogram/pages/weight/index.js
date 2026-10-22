const { page, service, navigate } = require("../../utils/page");
const { chooseFoodImage, persistFoodImage } = require("../../utils/media");
page({
  data: {},
  refresh() {
    return this.loadData(async () =>
      this.setData({ dashboard: await service.getWeightDashboard() }),
    );
  },
  submit(e) {
    return this.action(async () => {
      await service.submitWeightEvidence(e.detail.value);
      await this.refresh();
    });
  },
  appeal(e) {
    return this.action(async () => {
      await service.appealWeight(
        e.currentTarget.dataset.id,
        e.detail.value.note,
      );
      await this.refresh();
    });
  },
  photo() {
    return this.action(async () => {
      const image = await chooseFoodImage(wx);
      if (!image) return;
      const evidence = await persistFoodImage(
        wx,
        image,
        "weight-" + Date.now(),
      );
      this.setData({ evidence });
    });
  },
});
