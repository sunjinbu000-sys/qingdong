const { page, service } = require("../../utils/page");
page({
  data: {
    signedIn: false,
    membership: { timeline: [], remaining: 0, used: 0, dailyLimit: 0 },
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        signedIn: s.signedIn,
        membership: s.signedIn
          ? await service.getMembership()
          : { timeline: [], remaining: 0, used: 0, dailyLimit: 0 },
      });
    });
  },
});
