const { page, service } = require("../../utils/page");
page({
  data: { signedIn: false, rights: {}, date: "", canChoose: false },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({ signedIn: s.signedIn });
      if (s.signedIn) {
        const rights = await service.getMemberBackfill();
        this.setData({
          rights,
          date: this.data.date || rights.max,
          canChoose: rights.remaining > 0 && Number(rights.today.slice(8)) > 1,
        });
      }
    });
  },
  date(e) {
    this.setData({ date: e.detail.value });
  },
  backfill() {
    this.action(async () => {
      await service.backfillCheckIn(this.data.date);
      await this.refresh();
      wx.showToast({ title: "已补签，不重复计入" });
    });
  },
});
