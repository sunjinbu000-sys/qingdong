const { page, service } = require("../../utils/page");
page({
  data: { signedIn: false, date: "", today: "", showWeight: false, poster: "" },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.snapshot = s;
      this.setData({
        signedIn: s.signedIn,
        today: s.date,
        date: this.data.date || s.date,
        showWeight: s.signedIn
          ? (await service.getPrivacy()).showPosterWeight
          : false,
      });
    });
  },
  date(e) {
    this.setData({ date: e.detail.value, poster: "" });
  },
  weight(e) {
    this.action(async () => {
      await service.savePrivacy({ showPosterWeight: e.detail.value });
      this.setData({ showWeight: e.detail.value, poster: "" });
    });
  },
  generate() {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      const diary = await service.getDiary(this.data.date),
        s = await service.getSnapshot(),
        c = wx.createCanvasContext("sharePoster", this);
      c.setFillStyle("#f0f4e7");
      c.fillRect(0, 0, 300, 400);
      c.setFillStyle("#143f35");
      c.fillRect(0, 0, 300, 95);
      c.setFillStyle("#d4ed9c");
      c.setFontSize(30);
      c.fillText("轻动 QINGDONG", 22, 57);
      c.setFillStyle("#1d6651");
      c.setFontSize(24);
      c.fillText("每一份坚持，都算数。", 22, 145);
      c.setFontSize(18);
      c.fillText(s.profile.nickname.slice(0, 15), 22, 192);
      c.setFontSize(14);
      c.fillText(this.data.date + " · " + s.profile.city, 22, 224);
      c.fillText("累计坚持 " + s.totalDays + " 天", 22, 260);
      if (this.data.showWeight && diary.summary.weight !== "—")
        c.fillText("当日体重 " + diary.summary.weight + " kg", 22, 294);
      else c.fillText("认真照顾自己，就是今天的小成就。", 22, 294);
      c.setFontSize(11);
      c.setFillStyle("#839777");
      c.fillText("仅生成本机分享图片 · 由你决定分享给谁", 22, 369);
      await new Promise((r) => c.draw(false, r));
      const result = await new Promise((resolve, reject) =>
        wx.canvasToTempFilePath(
          { canvasId: "sharePoster", success: resolve, fail: reject },
          this,
        ),
      );
      this.setData({ poster: result.tempFilePath });
    });
  },
  preview() {
    wx.previewImage({ current: this.data.poster, urls: [this.data.poster] });
  },
  share() {
    return this.action(() => require("../../utils/share-image").shareImage(wx, this.data.poster));
  },
});
