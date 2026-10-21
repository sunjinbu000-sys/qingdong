const { page, service } = require("../../utils/page");
const { exportWorkbook } = require("../../utils/export");
page({
  data: { issues: [], done: 0, canEdit: false },
  refresh() {
    return this.loadData(async () => {
      const h = await service.getFeatureHub();
      const issues = (await service.getDiscussions()).map((i) => ({
        ...i,
        selected: i.options.indexOf(i.choice),
      }));
      this.setData({
        issues,
        done: issues.filter((i) => i.choice !== "待讨论").length,
        canEdit: h.signedIn && ["hq", "admin", "operator"].includes(h.role),
      });
    });
  },
  choice(e) {
    const i = Number(e.currentTarget.dataset.index),
      n = Number(e.detail.value);
    this.setData({
      ["issues." + i + ".choice"]: this.data.issues[i].options[n],
      ["issues." + i + ".selected"]: n,
    });
  },
  note(e) {
    this.setData({
      ["issues." + e.currentTarget.dataset.index + ".note"]: e.detail.value,
    });
  },
  save() {
    this.action(async () => {
      for (const i of this.data.issues) await service.saveDiscussion(i);
      await this.refresh();
      wx.showToast({ title: "讨论已保存" });
    });
  },
  copy() {
    wx.setClipboardData({
      data: this.data.issues
        .map((i) => i.title + "\n" + i.choice + "\n" + i.note)
        .join("\n\n"),
    });
  },
  exportFile() {
    this.action(() =>
      exportWorkbook(
        [
          ["讨论项", "说明", "方案", "补充"],
          ...this.data.issues.map((i) => [i.title, i.desc, i.choice, i.note]),
        ],
        "qingdong-discussion",
      ),
    );
  },
});
