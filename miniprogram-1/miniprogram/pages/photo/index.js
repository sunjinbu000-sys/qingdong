const { page, service, errorMessage } = require("../../utils/page");
const { chooseFoodImage, persistFoodImage } = require("../../utils/media");
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
  },
  onLoad(query) {
    this.setData({ planId: query.planId || "" });
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
      if (!s.signedIn) {
        this.pending = null;
        this.setData({ preview: "", result: null, photoError: "" });
      }
    });
  },
  choose() {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      const path = await chooseFoodImage(wx);
      if (!path) return;
      this.pending = {
        requestId:
          "photo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        tempFilePath: path,
      };
      this.setData({ preview: path, result: null, photoError: "" });
      await this.processPending();
    });
  },
  retryRecognition() {
    this.action(async () => {
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
      });
      this.setData({
        result,
        preview: p.imagePath,
        photoError: "",
        slotLabel: slots[result.slot],
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
      this.setData({ result: null, preview: "" });
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
