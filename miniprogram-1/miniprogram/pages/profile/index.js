const { page, service } = require("../../utils/page");
page({
  data: { snapshot: { profile: {} }, initial: "轻",
    menuGroups: [
      { title: "健康与记录", items: [
        { title: "个人与健康档案", subtitle: "昵称、城市、身高与目标", route: "account", icon: "sprout" },
        { title: "我的健康日记", subtitle: "按日期查看饮食、运动和健康记录", route: "health", icon: "camera" },
        { title: "体重与营养变化", route: "health-overview", icon: "weight" },
        { title: "拍照识餐历史", subtitle: "查看照片与营养分析", route: "photo-history", icon: "camera" },
      ] },
      { title: "轻动与成长", items: [
        { title: "我的小队", route: "team", icon: "flag" },
        { title: "我的轻动计划", route: "ai-plan", icon: "sun" },
        { title: "成长勋章", route: "badges", icon: "gift" },
        { title: "邀请好友", route: "invite", icon: "gift" },
        { title: "打卡分享海报", route: "share", icon: "camera" },
        { title: "我的奖励", route: "rewards", icon: "gift" },
      ] },
      { title: "会员与服务", items: [
        { title: "我的会员权益", subtitle: "体验卡、识餐额度与会员权益", route: "membership", icon: "member" },
        { title: "会员补卡与提醒", route: "member-services", icon: "member" },
        { title: "订单 · 消息 · 收藏", route: "personal-services", icon: "shield" },
      ] },
      { title: "设置与更多", items: [
        { title: "隐私与数据", subtitle: "分享多少，由你决定", route: "privacy", icon: "shield" },
      ] },
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
