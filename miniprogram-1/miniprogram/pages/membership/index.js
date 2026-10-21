const { page, service } = require("../../utils/page");
page({
  data: {
    signedIn: false,
    plans: [],
    membership: { timeline: [], remaining: 0, used: 0, dailyLimit: 0 },
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      const info = wx.getDeviceInfo
        ? wx.getDeviceInfo()
        : wx.getSystemInfoSync
          ? wx.getSystemInfoSync()
          : {};
      const device =
        info.platform === "ios"
          ? "ios"
          : info.platform === "android"
            ? "android"
            : "devtools";
      const entry = await service.getPurchaseEntry(device);
      this.setData({
        entry,
        signedIn: s.signedIn,
        plans: await service.listMembershipPlans(),
        membership: s.signedIn
          ? await service.getMembership()
          : { timeline: [], remaining: 0, used: 0, dailyLimit: 0 },
      });
    });
  },
  purchase(event) {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      const deviceInfo = wx.getDeviceInfo
        ? wx.getDeviceInfo()
        : wx.getSystemInfoSync
          ? wx.getSystemInfoSync()
          : {};
      const device =
        deviceInfo.platform === "ios"
          ? "ios"
          : deviceInfo.platform === "android"
            ? "android"
            : "devtools";
      const confirmed = await new Promise((resolve) =>
        wx.showModal({
          title: "确认模拟购买",
          content: "此操作仅生成本地模拟订单与会员权益，不会真实扣款。",
          success: (r) => resolve(r.confirm),
          fail: () => resolve(false),
        }),
      );
      if (!confirmed) return;
      await service.purchaseMembership({
        planId: event.currentTarget.dataset.id,
        device,
        revision: this.data.entry.revision,
        requestId:
          "purchase-" +
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2, 7),
      });
      await this.refresh();
      wx.showToast({ title: "模拟权益已加入队列", icon: "success" });
    });
  },
});
