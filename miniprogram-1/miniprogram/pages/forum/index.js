const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "" },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      this.setData({
        city: snapshot.profile.city,
        posts: await service.listForumPosts({
          mode: this.data.mode || "public",
          sort: this.data.sort || "new",
          kind: this.data.kind || "",
          city: this.data.sameCity ? snapshot.profile.city : "",
        }),
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  option(e) {
    this.setData({
      [e.currentTarget.dataset.key]: e.currentTarget.dataset.value,
    });
    this.refresh();
  },
  filter(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
    this.refresh();
  },
});
