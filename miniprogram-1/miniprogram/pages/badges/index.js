const { page, service } = require("../../utils/page");
page({
  data: { signedIn: false, badges: [] },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        signedIn: s.signedIn,
        badges: s.signedIn ? await service.getBadges() : [],
      });
    });
  },
});
