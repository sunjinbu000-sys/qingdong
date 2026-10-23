const { page, service } = require("../../utils/page");
page({
  data: {
    signedIn: false,
    selectedPlanId: "",
    agreed: false,
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
      const featureLabels = { photo: "拍餐识别", adFree: "识餐免广告", plan: "轻动计划", backfill: "会员补卡" };
      const plans = (await service.listMembershipPlans()).map(p => ({ ...p, featureLabels: (p.features || []).map(f => featureLabels[f] || f) }));
      this.setData({
        selectedPlanId: plans.some(p => p.id === this.data.selectedPlanId) ? this.data.selectedPlanId : (plans[0] ? plans[0].id : ""),
        entry,
        signedIn: s.signedIn,
        plans,
        membership: s.signedIn
          ? await service.getMembership()
          : { timeline: [], remaining: 0, used: 0, dailyLimit: 0 },
      });
    });
  },
  selectPlan(event) {
    this.setData({ selectedPlanId: event.currentTarget.dataset.id });
  },
  agreementChanged(event) {
    this.setData({ agreed: event.detail.value.includes("agree") });
  },
  showAgreement() {
    wx.showModal({ title: "会员服务说明（本地体验版）", content: "本版本只生成本地模拟订单，不发生真实扣款。套餐有效期、每日识餐额度以所选套餐为准，非自动续费。新权益按领取先后顺延；每日额度北京时间零点重置，不累积。退款申请可在订单页提交。识餐与计划为参考，实际支付及正式会员协议尚未接入。", showCancel: false, confirmText: "我知道了" });
  },
  purchase(event) {
    this.action(async () => {
      if (!this.data.agreed) { wx.showToast({ title: "请先阅读并同意会员服务说明", icon: "none" }); return; }
      if (!this.data.selectedPlanId) return;
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
        planId: this.data.selectedPlanId,
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
