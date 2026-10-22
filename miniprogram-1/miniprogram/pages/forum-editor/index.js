const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    id: "",
    userId: "",
    text: "",
    title: "",
    images: [],
    anonymous: true,
    kind: "",
    kinds: ["生活分享", "饮食打卡", "运动打卡", "小队打卡"],
    kindOptions: ["请选择分类", "生活分享", "饮食打卡", "运动打卡", "小队打卡"],
    kindIndex: 0,
  },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      if (this.data.id) {
        const post = await service.getForumPost(this.data.id);
        this.setData({
          ...post,
          kindIndex: this.data.kinds.indexOf(post.kind) + 1,
        });
      }
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  kind(e) {
    const kindIndex = Number(e.detail.value);
    this.setData({ kindIndex, kind: this.data.kinds[kindIndex - 1] || "" });
  },
  anon(e) {
    this.setData({ anonymous: e.detail.value });
  },
  addImage() {
    return this.action(async () => {
      if (this.data.images.length >= 3) throw Error("最多3张");
      const m = require("../../utils/media");
      let p = await m.chooseFoodImage(wx);
      if (p) {
        p = await m.persistFoodImage(wx, p, "forum-" + Date.now());
        this.setData({ images: this.data.images.concat(p) });
      }
    });
  },
  remove(e) {
    this.setData({
      images: this.data.images.filter(
        (_, i) => i !== +e.currentTarget.dataset.index,
      ),
    });
  },
  save(e) {
    return this.action(async () => {
      if (!(await this.requireAccount())) return;
      if (
        !e.currentTarget.dataset.draft &&
        !this.data.kinds.includes(this.data.kind)
      )
        throw Error("发布前请选择分类");
      const v = {
        text: this.data.text,
        title: this.data.title,
        images: this.data.images,
        anonymous: this.data.anonymous,
        kind: this.data.kind,
        draft: !!e.currentTarget.dataset.draft,
      };
      const p = this.data.id
        ? await service.editForumPost(this.data.id, v)
        : await service.createForumPost(v);
      wx.showToast({
        title: v.draft ? "草稿已保存" : "已提交人工审核",
        icon: "success",
      });
      navigate("/pages/forum-detail/index?id=" + p.id);
    });
  },
});
