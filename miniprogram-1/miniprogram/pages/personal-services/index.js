const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", userId: "", confirmation: "" },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      if (!snapshot.signedIn) {
        this.setData({ accessMessage: "请先登录查看服务" });
        return;
      }
      this.setData({
        services: await service.getPersonalServices(),
        settings: await service.getPlatformSettings(),
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  read(e) {
    return this.action(async () => {
      await service.readMessage(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  reminder(e) {
    this.setData({
      ["services.reminders." + e.currentTarget.dataset.key]: e.detail.value,
    });
  },
  save() {
    return this.action(async () => {
      await service.saveReminders(this.data.services.reminders);
      wx.showToast({ title: "偏好已保存" });
    });
  },
  unblock(e) {
    return this.action(async () => {
      await service.blockForumUser(e.currentTarget.dataset.id);
      await this.refresh();
    });
  },
  destroy() {
    wx.showModal({
      title: "确认注销账号",
      content:
        "清除本人记录、帖子、权益、订单与消息并退出登录。仅重置演示可重新体验。",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.deleteCommunityAccount(this.data.confirmation);
            navigate("/pages/account/index");
          });
      },
    });
  },
});
