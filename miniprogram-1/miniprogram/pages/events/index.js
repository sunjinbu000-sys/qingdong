const { page, service, navigate } = require("../../utils/page");
page({
  data: { managed: false },
  manage() {
    return this.action(async () => {
      const rows = await service.listManagedEvents();
      this.setData({ managed: true, rows });
    });
  },
  browse() {
    this.setData({ managed: false });
    return this.refresh();
  },
  refresh() {
    return this.loadData(async () =>
      this.setData({
        rows: this.data.managed
          ? await service.listManagedEvents()
          : await service.listEvents(),
      }),
    );
  },
});
