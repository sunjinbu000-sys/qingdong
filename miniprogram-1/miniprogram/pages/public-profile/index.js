const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "" },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      this.setData({
        profile: await service.getPublicProfile(
          this.data.userId || "demo-author",
        ),
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  block() {
    return this.action(async () => {
      await service.blockForumUser(this.data.userId || "demo-author");
      await this.refresh();
    });
  },
});
