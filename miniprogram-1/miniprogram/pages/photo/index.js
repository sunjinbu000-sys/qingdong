const { page, service, errorMessage, navigate } = require("../../utils/page");
const {
  chooseFoodImage,
  persistFoodImage,
  takeFoodPhoto,
} = require("../../utils/media");
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
    access: { remaining: 0 },
    planId: "",
    editName: "",
    editKcal: "",
    video: null,
    membership: { remaining: 0, dailyLimit: 0 },
    preview: "",
    result: null,
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
          photoError: "照片已准备好，点击“识别并保存”继续。",
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
    if (this.data.preview) {
      this.retake();
      return;
    }
    return this.action(async () => {
      if (!this.data.cameraReady) throw Error("相机尚未就绪，请稍后重试");
      const path = await takeFoodPhoto(wx);
      await this.acceptImage(path);
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
    });
    if (!snapshot.signedIn || !snapshot.profile.city) {
      this.setData({
        needsAccount: true,
        photoError: "照片已拍好，登录并确认城市后即可识别保存。",
      });
      return;
    }
    await this.processPending();
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
  retryRecognition() {
    return this.action(async () => {
      if (!(await this.requireAccount())) return;
      await this.processPending();
    });
  },
  async processPending() {
    if (!this.pending) return;
    try {
      const p = this.pending;
      if (!p.imagePath)
        p.imagePath = await persistFoodImage(wx, p.tempFilePath, p.requestId);
      const result = await service.recognizeMeal({
        imagePath: p.imagePath,
        requestId: p.requestId,
        slot: p.slot,
      });
      this.setData({
        result,
        preview: p.imagePath,
        photoError: "",
        slotLabel: slots[result.slot],
        selectedSlot: result.slot,
        needsAccount: false,
      });
      if (this.data.planId) {
        try {
          await service.completePlanTask({
            planId: this.data.planId,
            type: "photo",
            recordId: result.recordId,
          });
        } catch (error) {
          wx.showToast({
            title: "餐食已保存；" + errorMessage(error),
            icon: "none",
          });
        }
      }
      this.setData({ editName: result.name, editKcal: result.kcal });
      this.pending = null;
      await this.refresh();
      wx.showToast({ title: "模拟记录已保存", icon: "success" });
    } catch (error) {
      this.setData({ photoError: errorMessage(error) });
      throw error;
    }
  },
  editInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  correctMeal() {
    this.action(async () => {
      const result = await service.editRecognizedMeal({
        recordId: this.data.result.recordId,
        name: this.data.editName,
        kcal: Number(this.data.editKcal),
        slot: this.data.result.slot,
      });
      this.setData({ result });
      wx.showToast({ title: "已调整，不重复扣次", icon: "success" });
    });
  },
  deleteMeal() {
    this.action(async () => {
      await service.deleteRecord(this.data.result.recordId);
      this.pending = null;
      this.setData({
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
