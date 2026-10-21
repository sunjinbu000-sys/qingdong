const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  refresh() {
    return this.loadData(async () =>
      this.setData({ dashboard: await service.getWeightDashboard() }),
    );
  },
  submit(e) {
    return this.action(async () => {
      await service.submitWeightEvidence(e.detail.value);
      await this.refresh();
    });
  },
  appeal(e) {
    return this.action(async () => {
      await service.appealWeight(
        e.currentTarget.dataset.id,
        e.detail.value.note,
      );
      await this.refresh();
    });
  },
  photo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      success: (r) =>
        wx.saveFile({
          tempFilePath: r.tempFiles[0].tempFilePath,
          success: (s) => this.setData({ evidence: s.savedFilePath }),
          fail: () =>
            wx.showToast({ title: "照片保存失败，请重试", icon: "none" }),
        }),
    });
  },
});
