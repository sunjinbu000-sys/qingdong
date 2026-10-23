const { page, service, navigate } = require("../../utils/page");
const { exportWorkbook } = require("../../utils/export");
const { clearOwnedImages } = require("../../utils/media");
page({
  data: { signedIn: false, reminderTime: "10:00", privacy: { publicRank: false } },
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
  togglePoster(e) {
    return this.action(async () => {
      if (!(await this.requireAccount())) return;
      try { await service.savePrivacy({ showPosterWeight: !e.detail.value }); } finally { await this.refresh(); }
    });
  },
  reminderTime(e) { this.setData({ reminderTime: e.detail.value }); },
  addCalendar() {
    return this.action(async () => {
      if (!wx.addPhoneRepeatCalendar) throw Error("当前微信不支持添加日历提醒，请在手机日历中设置。");
      const start = new Date(), [hour, minute] = this.data.reminderTime.split(":").map(Number);
      start.setHours(hour, minute, 0, 0);
      if (start.getTime() <= Date.now()) start.setDate(start.getDate() + 1);
      await new Promise((resolve, reject) => wx.addPhoneRepeatCalendar({ title: "轻动 · 每日打卡", description: "记录饮食与活动，照顾自己的每一天。", startTime: Math.floor(start.getTime() / 1000), endTime: Math.floor(start.getTime() / 1000) + 300, repeatInterval: "day", alarm: true, alarmOffset: 0, success: resolve, fail: () => reject(Error("未完成日历添加，请检查系统日历权限或稍后重试。")) }));
      wx.showToast({ title: "请在系统日历确认", icon: "none" });
    });
  },
  policy() { wx.showModal({ title: "隐私政策与授权管理", content: "当前为本机模拟版本：健康记录与照片保存在此设备。公开坚持榜仅展示昵称和签到数据；减重榜需单独开启且只使用核验通过的变化值。海报体重由你自主控制。相机、相册、定位及日历权限仅在你使用对应功能时请求，可在微信设置中调整。", confirmText: "授权设置", success: r => { if (r.confirm) wx.openSetting({}); } }); },
  exportRecords() {
    return this.action(async () => {
      if (!(await this.requireAccount())) return;
      const records = await service.exportHealthRecords();
      await exportWorkbook([["日期", "类型", "名称", "餐次", "热量(千卡)", "蛋白质(克)", "碳水(克)", "脂肪(克)", "运动(分钟)", "体重(kg)"], ...records.map(r => [r.date, r.type, r.name || "", r.slot || "", r.kcal ?? "", r.protein ?? "", r.carb ?? "", r.fat ?? "", r.minutes ?? "", r.kg ?? ""])], "qingdong-health");
    });
  },
  deleteRecords() { this.confirmSensitive("删除健康记录", "将删除本机本人保存的饮食、运动和体重日记记录，无法恢复。签到、核验材料与榜单存档不受影响。输入“确认删除”继续。", "确认删除", async value => { await service.deleteHealthRecords(value); await this.refresh(); wx.showToast({ title: "日记记录已删除", icon: "none" }); }); },
  deleteAccount() { this.confirmSensitive("申请注销账户", "将清除本人记录、帖子、权益、订单和消息并退出登录，无法恢复。输入“确认注销”继续。", "确认注销", async value => { await service.deleteCommunityAccount(value); navigate("/pages/account/index"); }); },
  confirmSensitive(title, content, expected, work) { wx.showModal({ title, content, editable: true, placeholderText: expected, confirmColor: "#d66c88", success: r => { if (!r.confirm) return; this.action(async () => { if (!(await this.requireAccount())) return; if (r.content !== expected) throw Error("请输入“" + expected + "”以确认"); await work(r.content); }); } }); },
  logout() { wx.showModal({ title: "退出登录？", content: "本机记录会保留。", success: r => { if (r.confirm) this.action(async () => { await service.logout(); await this.refresh(); navigate("/pages/index/index"); }); } }); },
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
