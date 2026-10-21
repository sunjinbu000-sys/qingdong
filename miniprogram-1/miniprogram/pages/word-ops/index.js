const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "", word: "", category: "涉政", importText: "" },
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
        this.setData(await service.getWordSettings());
      } catch (e) {
        this.setData({ accessMessage: e.message });
      }
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  category(e) {
    this.setData({ category: this.data.categories[+e.detail.value] });
  },
  save() {
    return this.action(async () => {
      await service.saveWord({
        word: this.data.word,
        category: this.data.category,
        id: this.data.editId,
      });
      this.setData({ editId: "", word: "" });
      await this.refresh();
    });
  },
  edit(e) {
    const x = this.data.entries.find(
      (x) => x.id === e.currentTarget.dataset.id,
    );
    this.setData({ editId: x.id, word: x.word, category: x.category });
  },
  remove(e) {
    return this.action(async () => {
      await service.deleteWord(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  importWords() {
    return this.action(async () => {
      const r = await service.importWords(
        this.data.importText,
        this.data.category,
      );
      wx.showToast({
        title: "新增" + r.added + " 跳过" + r.skipped,
        icon: "none",
      });
      await this.refresh();
    });
  },
  restore() {
    wx.showModal({
      title: "恢复内置词库",
      content: "覆盖自定义词语，确认恢复？",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.restoreWords();
            await this.refresh();
          });
      },
    });
  },
});
