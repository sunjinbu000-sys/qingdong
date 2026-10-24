const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "", anonymousComment: true, comment: "", composerOpen: false, inputFocus: false, keyboardHeight: 0, emojis: ["😊","👏","👍","❤️","💪","🎉","🌷","😂"] },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      this.setData({
        signedIn: snapshot.signedIn, viewerId: snapshot.profile.userId || snapshot.userId || "",
        post: await service.getForumPost(this.data.id || "forum-demo-1"),
      });
    });
  },
  async openComposer() {
    if (!(await this.requireAccount())) return;
    this.setData({ composerOpen: true, inputFocus: true });
  },
  closeComposer() { this.setData({ composerOpen: false, inputFocus: false, keyboardHeight: 0 }); },
  preventMove() {},
  keyboardChange(e) { this.setData({ keyboardHeight: Math.max(0, Number(e.detail.height) || 0) }); },
  addEmoji(e) { this.setData({ comment: (this.data.comment + e.currentTarget.dataset.emoji).slice(0,500) }); },
  follow() { return this.action(async()=>{if(!(await this.requireAccount()))return;await service.followForumUser(this.data.post.userId);await this.refresh();}); },
  more() {
    const p=this.data.post;
    wx.showActionSheet({itemList:p.mine?["编辑笔记","撤回笔记","删除笔记"]:["举报笔记"],success:r=>{
      if(p.mine&&r.tapIndex===0)return navigate("/pages/forum-editor/index?id="+p.id);
      wx.showModal({title:p.mine?(r.tapIndex===1?"撤回笔记":"删除笔记"):"举报笔记",content:p.mine?"确认操作这篇笔记？":"",editable:!p.mine,placeholderText:"请填写举报原因",success:result=>{if(result.confirm)this.action(async()=>{
        if(!(await this.requireAccount()))return;
        await service[p.mine?(r.tapIndex===1?"withdrawForumPost":"deleteForumPost"):"reportForumPost"](p.id,result.content);
        if(p.mine){wx.navigateBack();return;}wx.showToast({title:"举报已提交",icon:"success"});
      });}});
    }});
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
    this.setData({ parentId: e.currentTarget.dataset.id, replyAuthor: e.currentTarget.dataset.author || "轻友" });
    return this.openComposer();
  },
  cancelReply() { this.setData({parentId:"",replyAuthor:""}); },
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
      if (!["commentForumPost","likeForumPost","favoriteForumPost","withdrawForumPost","deleteForumPost","reportForumPost"].includes(m)) return;
      if (!(await this.requireAccount())) return;
      await service[m](
        this.data.post.id,
        m === "commentForumPost" ? this.data.comment : this.data.reason,
        this.data.parentId,
        this.data.anonymousComment,
      );
      if (m === "commentForumPost") { this.setData({ comment: "", parentId: "", replyAuthor: "" }); this.closeComposer(); wx.showToast({title:"评论成功",icon:"success"}); }
      await this.refresh();
    });
  },
});
