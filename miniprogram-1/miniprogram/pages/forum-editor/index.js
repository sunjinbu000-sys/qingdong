const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    id: "",
    userId: "",
    text: "",
    title: "",
    images: [],
    anonymous: true,
    kind: "生活分享",
    kinds: ["生活分享", "饮食打卡", "运动打卡", "小队打卡"],
  },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      if (this.data.id) this.setData(await service.getForumPost(this.data.id));
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  kind(e) {
    this.setData({ kind: this.data.kinds[+e.detail.value] });
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
      navigate("/pages/forum-detail/index?id=" + p.id);
    });
  },
});
