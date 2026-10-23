const { page, service } = require("../../utils/page");
page({
  data: { snapshot: { profile: {} }, initial: "轻",
    healthMenus: [
      { title: "我的健康档案", subtitle: "身高、体重与个人目标", route: "health-profile", icon: "sprout" },
      { title: "我的体重记录", route: "health-overview", icon: "weight" },
      { title: "拍照识餐历史", subtitle: "查看原照片和营养分析", route: "photo-history", icon: "camera" },
      { title: "我的小队", route: "team", icon: "flag" },
      { title: "成长勋章", route: "badges", icon: "gift" },
    ],
    serviceMenus: [
      { title: "会员与订单", route: "personal-services", icon: "member" },
      { title: "更多好玩", route: "explore", icon: "sun" },
      { title: "消息与隐私设置", route: "personal-services", icon: "shield" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      this.setData({
        snapshot,
        stats: snapshot.signedIn
          ? await service.getProfileSummary()
          : { streak: 0, meals: 0, badges: 0 },
        initial: snapshot.profile.nickname.slice(0, 1),
      });
    });
  },
  logout() {
    wx.showModal({
      title: "退出登录？",
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
