const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  refresh() {
    return this.loadData(async () =>
      this.setData({ rows: await service.getArchives() }),
    );
  },
  claim(e) {
    return this.action(async () => {
      await service.claimRankReward(e.currentTarget.dataset.id);
      await this.refresh();
      wx.showToast({ title: "奖励已到账" });
    });
  },
});
