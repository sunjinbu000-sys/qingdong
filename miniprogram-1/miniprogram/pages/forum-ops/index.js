const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "", notes: {} },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      if (!snapshot.signedIn) {
        this.setData({ accessMessage: "请先登录查看服务" });
        return;
      }
      try {
        this.setData(await service.listModeration());
      } catch (e) {
        this.setData({ accessMessage: e.message });
      }
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  note(e) {
    this.setData({ ["notes." + e.currentTarget.dataset.id]: e.detail.value });
  },
  review(e) {
    return this.action(async () => {
      await service.moderateForumPost(
        e.currentTarget.dataset.id,
        e.currentTarget.dataset.status,
        this.data.notes[e.currentTarget.dataset.id] || "",
      );
      await this.refresh();
    });
  },
  recommend(e) {
    return this.action(async () => {
      await service.recommendForumPost(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  resolve(e) {
    return this.action(async () => {
      await service.resolveForumReport(
        e.currentTarget.dataset.post,
        e.currentTarget.dataset.id,
        this.data.notes[e.currentTarget.dataset.post] || "",
      );
      await this.refresh();
    });
  },
});
