const { pageThemes } = require("../../utils/theme");
const { page, service } = require("../../utils/page");
page({
  data: { profileReady: false, snapshot: { profile: {} }, initial: "轻",
    menuGroups: [
      { title: "健康与记录", items: [
        { title: "个人与健康档案", subtitle: "昵称、城市、身高与目标", route: "account", icon: "sprout" },
        { title: "我的健康日记", subtitle: "按日期查看饮食、运动和健康记录", route: "health", icon: "book" },
        { title: "体重与营养变化", route: "health-overview", icon: "weight" },
        { title: "拍照识餐历史", subtitle: "查看照片与营养分析", route: "photo-history", icon: "camera" },
      ] },
      { title: "轻动与成长", items: [
        { title: "我的小队", route: "team", icon: "flag" },
        { title: "我的轻动计划", route: "ai-plan", icon: "sun" },
        { title: "成长勋章", route: "badges", icon: "medal" },
        { title: "邀请好友", route: "invite", icon: "gift" },
        { title: "打卡分享海报", route: "share", icon: "camera" },
        { title: "我的奖励", route: "rewards", icon: "reward" },
      ] },
      { title: "会员与服务", items: [
        { title: "我的会员权益", subtitle: "体验卡、识餐额度与会员权益", route: "membership", icon: "member" },
        { title: "会员补卡与提醒", route: "member-services", icon: "member" },
        { title: "会员与订单", route: "personal-services", icon: "shield" },
      ] },
      { title: "设置与更多", items: [
        { title: "隐私与数据", subtitle: "分享多少，由你决定", route: "privacy", icon: "shield" },
      ] },
    ].map(group => ({...group,items:group.items.map(item=>({...item,theme:pageThemes[item.route] || "profile"}))})),
  },
  onPageScroll(event) {
    if (!this._restoringScroll && Number.isFinite(event.scrollTop)) this._scrollTop = Math.max(0, event.scrollTop);
  },
  onHide() {
    this._resumeScrollTop = this._scrollTop || 0;
  },
  async refresh() {
    const resumeScrollTop = this._resumeScrollTop;
    if (resumeScrollTop !== undefined) this._restoringScroll = true;
    await this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      this.setData({
        snapshot,
        profileReady: true,
        stats: snapshot.signedIn
          ? await service.getProfileSummary()
          : { streak: 0, meals: 0, badges: 0 },
        initial: snapshot.profile.nickname.slice(0, 1),
      });
    });
    if (resumeScrollTop !== undefined) {
      const restore = () => {
        if (wx.pageScrollTo) wx.pageScrollTo({ scrollTop: resumeScrollTop, duration: 0, complete: () => { this._restoringScroll = false; } });
        else this._restoringScroll = false;
        this._scrollTop = resumeScrollTop;
        this._resumeScrollTop = undefined;
      };
      if (wx.nextTick) wx.nextTick(restore); else restore();
    }
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
