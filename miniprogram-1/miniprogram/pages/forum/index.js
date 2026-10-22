const { page, service, navigate } = require("../../utils/page");
const { chooseForumCity } = require("../../utils/location");
page({
  data: {
    tab: "recommended",
    mine: "mine",
    posts: [],
    signedIn: false,
    region: null,
    locationError: "",
    tabs: [
      { id: "recommended", label: "推荐" },
      { id: "local", label: "本地" },
      { id: "national", label: "全国" },
      { id: "latest", label: "最新" },
      { id: "mine", label: "我的" },
    ],
    mineTabs: [
      { id: "mine", label: "我的文章" },
      { id: "liked", label: "我点赞的" },
      { id: "commented", label: "我评论过的" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      const revision = (this.revision || 0) + 1;
      this.revision = revision;
      const snapshot = await service.getSnapshot(),
        region = await service.getForumRegion();
      const tab = this.data.tab,
        mode = tab === "mine" ? this.data.mine : "public";
      let posts = [];
      if (
        !(tab === "mine" && !snapshot.signedIn) &&
        !(tab === "local" && !region)
      )
        posts = await service.listForumPosts({
          mode,
          feed: tab === "mine" ? "" : tab,
          sort: tab === "recommended" || tab === "national" ? "hot" : "new",
        });
      if (this.revision !== revision) return;
      this.setData({
        signedIn: snapshot.signedIn,
        region,
        posts,
        emptyText:
          tab === "mine"
            ? mode === "liked"
              ? "还没有点赞的文章"
              : mode === "commented"
                ? "还没有评论过的文章"
                : "还没有发布文章，分享你的第一篇吧"
            : tab === "local"
              ? "本地还没有公开文章，来分享你的生活吧"
              : tab === "recommended"
                ? "暂时没有推荐文章，去全国或最新看看吧"
                : "还没有公开文章",
      });
    });
  },
  changeTab(e) {
    const tab = e.currentTarget.dataset.id;
    if (!this.data.tabs.some((t) => t.id === tab)) return;
    this.setData({ tab, posts: [], error: "" });
    return this.refresh();
  },
  changeMine(e) {
    this.setData({ mine: e.currentTarget.dataset.id, posts: [] });
    return this.refresh();
  },
  locate() {
    return this.action(async () => {
      this.setData({ locationError: "" });
      try {
        const region = await chooseForumCity(wx);
        if (!region) return;
        await service.saveForumRegion(region);
        await this.refresh();
      } catch (error) {
        this.setData({ locationError: error.message });
      }
    });
  },
  publish() {
    navigate(
      this.data.signedIn ? "/pages/forum-editor/index" : "/pages/account/index",
    );
  },
  preview(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.current,
      urls: e.currentTarget.dataset.images,
    });
  },
});
