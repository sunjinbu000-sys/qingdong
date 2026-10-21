const { page, service } = require("../../utils/page");
page({
  data: { snapshot: { profile: {} }, initial: "轻" },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      this.setData({
        snapshot,
        initial: snapshot.profile.nickname.slice(0, 1),
      });
    });
  },
  logout() {
    wx.showModal({
      title: "退出模拟账号？",
      content: "本机健康记录会保留，再次使用模拟账号可继续查看。",
      confirmColor: "#1d6651",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.logout();
            await this.refresh();
          });
      },
    });
  },
});
