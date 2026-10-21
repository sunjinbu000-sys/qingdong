const { page, service, navigate } = require("../../utils/page");
page({
  data: { query: {} },
  refresh() {
    return this.loadData(async () =>
      this.setData({ rank: await service.getFullRank(this.data.query) }),
    );
  },
  filter(e) {
    this.setData({ query: e.detail.value });
    return this.refresh();
  },
});
