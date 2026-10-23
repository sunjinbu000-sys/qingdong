const { page, service, navigate } = require("../../utils/page");
page({
  data: { signedIn: false, photos: [] },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        signedIn: s.signedIn,
        photos: s.signedIn ? (await service.getFoodAnalysisHistory()).map(p => ({ ...p, slotLabel: ({breakfast:"早餐",lunch:"午餐",dinner:"晚餐",snack:"加餐"})[p.slot] || "餐食", kcalLabel: Number.isFinite(p.kcal) ? p.kcal.toFixed(2) : "—" })) : [],
      });
    });
  },
  openReport(e) {
    const item = this.data.photos.find(p => p.id === e.currentTarget.dataset.id);
    if (item) navigate(item.legacy ? "/pages/health/index?date=" + item.date : "/pages/photo/index?analysisId=" + item.id);
  },
  preview(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.path,
      urls: this.data.photos.map((x) => x.imagePath),
    });
  },
  remove(e) {
    wx.showModal({
      title: "删除这条拍照识餐历史？",
      content: "历史报告将移除；若已保存为饮食记录，当天日记同步移除。已用次数不返还。",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            const item = this.data.photos.find(p => p.id === e.currentTarget.dataset.id);
            if (item && item.legacy) await service.deleteRecord(item.id);
            else if (item) await service.removeFoodAnalysis(item.id);
            await this.refresh();
          });
      },
    });
  },
});
