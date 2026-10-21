const { page, service } = require("../../utils/page");
page({
  data: { signedIn: false, rewards: [], grants: [] },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({ signedIn: s.signedIn });
      if (s.signedIn)
        this.setData({
          rewards: await service.getMyFullRewards(),
          grants: (await service.getMembership()).timeline,
        });
    });
  },
});
