const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "", anonymousComment: true },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      this.setData({
        viewerId: snapshot.profile.userId || snapshot.userId || "",
        post: await service.getForumPost(this.data.id || "forum-demo-1"),
      });
    });
  },
  previewImages(e) { wx.previewImage({ current:e.currentTarget.dataset.path, urls:this.data.post.images }); },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  deleteComment(e) {
    return this.action(async () => {
      await service.deleteForumComment(
        this.data.post.id,
        e.currentTarget.dataset.id,
      );
      await this.refresh();
    });
  },
  commentAnonymous(e) {
    this.setData({ anonymousComment: e.detail.value });
  },
  commentAuthor(e) {
    if (e.currentTarget.dataset.anonymous) return;
    const userId = e.currentTarget.dataset.user;
    if (userId)
      navigate(
        "/pages/public-profile/index?userId=" + encodeURIComponent(userId),
      );
  },
  reply(e) {
    this.setData({ parentId: e.currentTarget.dataset.id });
  },
  onShareAppMessage() {
    const p = this.data.post;
    return p && p.status === "approved"
      ? {
          title: p.title || "轻友的生活分享",
          path: "/pages/forum-detail/index?id=" + p.id,
        }
      : { title: "轻友论坛", path: "/pages/forum/index" };
  },
  act(e) {
    return this.action(async () => {
      const m = e.currentTarget.dataset.method;
      await service[m](
        this.data.post.id,
        m === "commentForumPost" ? this.data.comment : this.data.reason,
        this.data.parentId,
        this.data.anonymousComment,
      );
      if (m === "commentForumPost") this.setData({ comment: "", parentId: "" });
      await this.refresh();
    });
  },
});
