const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  refresh() {
    return this.loadData(async () =>
      this.setData({ rows: await service.listTeams() }),
    );
  },
});
