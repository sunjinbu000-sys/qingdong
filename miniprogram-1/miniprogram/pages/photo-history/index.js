const { page, service } = require("../../utils/page");
page({
  data: { signedIn: false, photos: [] },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        signedIn: s.signedIn,
        photos: s.signedIn ? await service.getPhotoHistory() : [],
      });
    });
  },
  preview(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.path,
      urls: this.data.photos.map((x) => x.imagePath),
    });
  },
  remove(e) {
    wx.showModal({
      title: "删除这条饮食记录？",
      content: "删除后日记同步移除，已使用额度不会返还。",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.deleteRecord(e.currentTarget.dataset.id);
            await this.refresh();
          });
      },
    });
  },
});
