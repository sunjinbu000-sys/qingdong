const { page, service, navigate } = require("../../utils/page");
const { clearOwnedImages } = require("../../utils/media");
page({
  data: { signedIn: false, privacy: { publicRank: false } },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        signedIn: s.signedIn,
        privacy: s.signedIn
          ? await service.getPrivacy()
          : { publicRank: false },
      });
    });
  },
  toggleLoss(e) {
    this.action(async () => {
      try {
        await service.savePrivacy({ lossRank: e.detail.value });
      } finally {
        await this.refresh();
      }
    });
  },
  toggleRank(e) {
    this.action(async () => {
      try {
        await service.savePrivacy({ publicRank: e.detail.value });
      } finally {
        await this.refresh();
      }
    });
  },
  reset() {
    wx.showModal({
      title: "清除全部演示数据？",
      content:
        "本机的记录、照片与模拟权益将被清除且无法恢复。不会影响真实微信账号。",
      confirmText: "确认清除",
      confirmColor: "#aa5548",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.resetDemo();
            const result = await clearOwnedImages(wx);
            if (result.failed)
              wx.showModal({
                title: "记录已重置",
                content:
                  "部分本机图片未能清理，可重试清除，或在微信设置中清理小程序缓存。",
                showCancel: false,
              });
            else wx.showToast({ title: "已重置，可以重新开始", icon: "none" });
            await this.refresh();
            navigate("/pages/index/index");
          });
      },
    });
  },
});
