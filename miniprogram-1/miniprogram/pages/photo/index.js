const { page, service, errorMessage, navigate } = require("../../utils/page");
const {
  chooseFoodImage,
  persistFoodImage,
} = require("../../utils/media");
const { watchRewardedVideo } = require("../../utils/rewarded-video");
const { shiftDate } = require("../../utils/date");
const { mealSlot } = require("../../services/membership");
const slots = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};
page({
  data: {
    signedIn: false,
    screen: "capture",
    access: { remaining: 0 },
    planId: "",
    editName: "",
    editKcal: "",
    video: null,
    membership: { remaining: 0, dailyLimit: 0 },
    preview: "",
    result: null,
    mockScenario: "unknown",
    showPortions: false,
    portionInputs: [],
    suggestions: { meals: [] },
    photoError: "",
    slotLabel: "",
    cameraActive: true,
    cameraReady: false,
    cameraError: "",
    selectedSlot: mealSlot(Date.now()),
    mealSlots: Object.keys(slots).map((id) => ({ id, label: slots[id] })),
    showAccess: false,
    needsAccount: false,
  },
  onLoad(query = {}) {
    this.setData({
      planId: query.planId || "",
      selectedSlot: slots[query.slot] ? query.slot : mealSlot(Date.now()),
    });
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        signedIn: s.signedIn,
        adPlacement: await service.getAdPlacement("photoBanner"),
        access: s.signedIn
          ? await service.getRecognitionAccess()
          : { remaining: 0 },
        membership: s.signedIn
          ? await service.getMembership()
          : { remaining: 0, dailyLimit: 0 },
      });
      if (!s.signedIn && !(this.pending && this.pending.guest)) {
        const hadPreview = !!this.data.preview;
        this.pending = null;
        this.setData({
          screen: "capture",
          preview: "",
          result: null,
          photoError: "",
          needsAccount: false,
          ...(hadPreview ? { cameraActive: true, cameraReady: false } : {}),
        });
      } else if (
        s.signedIn &&
        s.profile.city &&
        this.pending &&
        this.data.needsAccount
      ) {
        this.setData({
          needsAccount: false,
          photoError: "照片已准备好，点击下方确认按钮继续。",
        });
      }
    });
  },
  choose() {
    return this.action(async () => {
      const path = await chooseFoodImage(wx, ["album"]);
      if (!path) return;
      await this.acceptImage(path);
    });
  },
  capture() {
    return this.action(async () => {
      const path = await chooseFoodImage(wx, ["camera"]);
      if (path) await this.acceptImage(path);
    });
  },
  async acceptImage(path) {
    const snapshot = await service.getSnapshot();
    this.pending = {
      requestId:
        "photo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tempFilePath: path,
      slot: this.data.selectedSlot,
      guest: !snapshot.signedIn,
    };
    this.setData({
      preview: path,
      result: null,
      photoError: "",
      cameraReady: false,
      screen: "capture",
      needsAccount: false,
    });
    if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: "拍照记餐" });
    if (!snapshot.signedIn || !snapshot.profile.city) {
      this.setData({
        needsAccount: true,
        photoError: "照片已拍好，登录并确认城市后即可识别保存。",
      });
      return;
    }
  },
  onCameraReady() {
    this.setData({ cameraReady: true, cameraError: "" });
  },
  onCameraError() {
    this.setData({
      cameraReady: false,
      cameraActive: false,
      cameraError: "无法打开相机，请检查相机权限，也可以从相册选图。",
    });
  },
  onCameraStop() {
    this.setData({
      cameraReady: false,
      cameraActive: false,
      cameraError: "相机已暂停，点击重新打开。",
    });
  },
  restartCamera() {
    this.setData({ cameraError: "", cameraActive: true, cameraReady: false });
  },
  cameraSettings() {
    wx.openSetting({});
  },
  retake() {
    if (this.data.busy) return;
    this.pending = null;
    this.setData({
      preview: "",
      result: null,
      photoError: "",
      needsAccount: false,
      cameraError: "",
      cameraReady: false,
      cameraActive: true,
    });
  },
  selectSlot(e) {
    const slot = e.currentTarget.dataset.slot;
    if (slots[slot] && !this.data.busy && !this.data.preview)
      this.setData({ selectedSlot: slot });
  },
  manualRecord() {
    navigate("/pages/records/index?type=meal&slot=" + this.data.selectedSlot);
  },
  toggleAccess() {
    this.setData({ showAccess: !this.data.showAccess });
  },
  retryRecognition() { return this.confirmPhoto(); },
  confirmPhoto() {
    return this.action(async () => {
      if (!this.pending) throw Error("请先拍照或选择一张餐食照片");
      if (!(await this.requireAccount())) return;
      const access = await service.getRecognitionAccess();
      this.setData({ access });
      if (!access.photoEnabled) throw Error("识餐功能暂未开放，请稍后重试");
      if (access.globalRemaining <= 0) throw Error("今日识餐服务额度已用完，请稍后重试");
      if (access.remaining <= 0) { this.setData({ screen: "access" }); if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: "识餐次数与权益" }); return; }
      this.setData({ screen: "capture" });
      await this.processPending();
    });
  },
  backToCapture() { this.setData({ screen: "capture" }); if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: "拍照记餐" }); },
  watchAndRecognize() {
    return this.action(async () => {
      if (!this.pending) throw Error("照片已失效，请返回重新拍照");
      if (!(await this.requireAccount())) return;
      const access = await service.getRecognitionAccess();
      this.setData({ access });
      if (!access.photoEnabled || access.globalRemaining <= 0) throw Error("识餐服务当前不可用，请稍后重试");
      if (access.remaining > 0) { this.setData({ screen: "capture" }); await this.processPending(); return; }
      if (!access.adsAvailable) throw Error("激励视频暂未开放或今日次数已用完，可查看会员权益");
      if (!wx.createRewardedVideoAd || !/^adunit-/.test(access.rewardedVideoAdUnitId || "")) throw Error("激励视频广告尚未配置，请稍后重试或查看会员权益");
      const video = await service.beginRewardedVideo();
      let completed = false;
      try { completed = await watchRewardedVideo(wx, access.rewardedVideoAdUnitId); }
      catch (error) { await service.completeRewardedVideo({ id: video.id, complete: false }); throw error; }
      const reward = await service.completeRewardedVideo({ id: video.id, complete: completed });
      await this.refresh();
      if (!reward.granted) { wx.showToast({ title: "中途关闭未获得次数，可重试", icon: "none" }); return; }
      this.setData({ screen: "capture" });
      await this.processPending();
    });
  },
  toggleMockScenario(e) { this.setData({ mockScenario: e.detail.value.includes("meal") ? "meal" : "unknown" }); },
  async processPending() {
    if (!this.pending) return;
    const pending = this.pending;
    this.setData({ screen: "scanning", photoError: "" });
    if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: "正在读懂这一餐" });
    try {
      if (!pending.imagePath) pending.imagePath = await persistFoodImage(wx, pending.tempFilePath, pending.requestId);
      this.setData({ preview: pending.imagePath });
      const [result] = await Promise.all([
        service.analyzeFoodPhoto({ imagePath: pending.imagePath, requestId: pending.requestId, slot: pending.slot, mockScenario: this.data.mockScenario }),
        this.data.access.mock ? new Promise(resolve => setTimeout(resolve, 850)) : Promise.resolve(),
      ]);
      let suggestions;
      try { suggestions = await service.getReportMealSuggestions(shiftDate(result.date, 1)); }
      catch (_) { suggestions = { date: shiftDate(result.date, 1), meals: [], notice: "当前档案限制下暂未生成可用参考搭配，请在轻动计划中完善或调整。" }; }
      this.setData({ result, screen: "result", preview: pending.imagePath, slotLabel: slots[result.slot], selectedSlot: result.slot, needsAccount: false, editName: result.name, portionInputs: result.ingredients.map(x => String(x.grams)), showPortions: false, suggestions });
      this.pending = null;
      if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: "营养分析结果" });
      await this.refresh();
    } catch (error) {
      this.setData({ screen: "capture", photoError: errorMessage(error) });
      if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: "拍照记餐" });
      throw error;
    }
  },
  adjustPortions() {
    if (!this.data.result.recognized) return this.manualRecord();
    const show = !this.data.showPortions;
    this.setData({ showPortions: show });
    if (show && wx.nextTick && wx.pageScrollTo) wx.nextTick(() => wx.pageScrollTo({ selector: ".analysis-edit-card", duration: 250 }));
  },
  portionInput(e) { this.setData({ ["portionInputs[" + Number(e.currentTarget.dataset.index) + "]"]: e.detail.value }); },
  saveAnalysis() {
    return this.action(async () => {
      if (!this.data.result || !this.data.result.recognized) throw Error("尚未识别到食物，请先手动记录");
      if (this.data.result.recordId) return navigate("/pages/health/index?date=" + this.data.result.date);
      const result = await service.saveFoodAnalysis(this.data.result.id);
      this.setData({ result });
      if (this.data.planId) {
        try { await service.completePlanTask({ planId: this.data.planId, type: "photo", recordId: result.recordId }); }
        catch (error) { wx.showToast({ title: "已保存；" + errorMessage(error), icon: "none" }); return; }
      }
      wx.showToast({ title: "这一餐已保存", icon: "success" });
    });
  },
  newPhoto() { return this.capture(); },
  generateReportPoster() {
    return this.action(async () => {
      const result = this.data.result;
      if (!result) return;
      const c = wx.createCanvasContext("mealReportPoster", this);
      c.setFillStyle("#f3edff"); c.fillRect(0, 0, 300, 420);
      c.drawImage(this.data.preview, 18, 18, 264, 185);
      c.setFillStyle("#303553"); c.setFontSize(19); c.fillText(result.name.slice(0, 16), 18, 240);
      c.setFontSize(13); c.fillText(this.data.slotLabel + " · " + result.date, 18, 268);
      c.setFillStyle("#8b69d1"); c.setFontSize(25); c.fillText(result.recognized ? result.kcal + " 千卡（样例估算）" : "未知热量", 18, 315);
      c.setFontSize(11); c.setFillStyle("#9b8cae"); c.fillText("仅本机演示，照片估算不能代替专业建议。", 18, 382);
      await new Promise(resolve => c.draw(false, resolve));
      const poster = await new Promise((resolve, reject) => wx.canvasToTempFilePath({ canvasId: "mealReportPoster", success: resolve, fail: () => reject(Error("海报生成失败，请在手机上重试")) }, this));
      wx.previewImage({ current: poster.tempFilePath, urls: [poster.tempFilePath] });
    });
  },
  editInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  correctMeal() {
    return this.action(async () => {
      const result = await service.updateFoodAnalysis({ analysisId: this.data.result.id, name: this.data.editName, portions: this.data.portionInputs.map(Number) });
      this.setData({ result, showPortions: false });
      wx.showToast({ title: "份量已更新，不重复扣次", icon: "success" });
    });
  },
  deleteMeal() {
    this.action(async () => {
      await service.deleteRecord(this.data.result.recordId);
      this.pending = null;
      this.setData({
        screen: "capture",
        result: null,
        preview: "",
        photoError: "",
        cameraError: "",
        cameraReady: false,
        cameraActive: true,
      });
      wx.showToast({ title: "已删除，额度不返还", icon: "none" });
    });
  },
  beginVideo() {
    this.action(async () => {
      this.setData({ video: await service.beginRewardedVideo() });
    });
  },
  endVideo(e) {
    this.action(async () => {
      const result = await service.completeRewardedVideo({
        id: this.data.video.id,
        complete: e.currentTarget.dataset.complete === "yes",
      });
      this.setData({ video: null });
      await this.refresh();
      wx.showToast({
        title: result.granted
          ? "完整观看，+" + result.granted + "次"
          : "已中断，不发放次数",
        icon: "none",
      });
    });
  },
  previewPhoto() {
    if (this.data.preview)
      wx.previewImage({
        current: this.data.preview,
        urls: [this.data.preview],
      });
  },
});
