const { page, service, navigate } = require("../../utils/page");
const { timeGreeting } = require("../../utils/date");
page({
  data: {
    snapshot: { profile: {}, activities: [] },
    greeting: "你好",
    nutritionLedger: { intake: "0.00", exercise: "0.00", remaining: "—", protein: "—", carb: "—", fat: "—" },
    banners: [],
    events: [],
    browse: { city: "温州", month: "" },
    cities: ["温州", "杭州", "宁波"],
    shortcuts: [
      { title: "轻友论坛", route: "forum", icon: "forum" },
      { title: "我的小队", route: "team", icon: "team" },
      { title: "榜单", route: "rank", icon: "rank" },
      { title: "轻动计划", route: "ai-plan", icon: "ai-plan" },
      { title: "活动广场", route: "events", icon: "events" },
      { title: "邀请好友", route: "invite", icon: "invite" },
      { title: "成长勋章", route: "badges", icon: "badges" },
      { title: "体重趋势", route: "weight-trend", icon: "trend" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const [banners, events, hub] = await Promise.all([
        service.getHomeBanners(),
        service.listEvents(),
        service.getFeatureHub(),
      ]);
      const overview = snapshot.signedIn
        ? await service.getNutritionOverview(snapshot.date)
        : null;
      const nutritionLedger = overview ? {
        intake: Number(overview.nutrition.calories).toFixed(2),
        exercise: Number(overview.exerciseCalories).toFixed(2),
        remaining: Number(overview.remaining).toFixed(2),
        protein: String(overview.nutrition.protein),
        carb: String(overview.nutrition.carb),
        fat: String(overview.nutrition.fat),
      } : { intake: "0.00", exercise: "0.00", remaining: "—", protein: "—", carb: "—", fat: "—" };
      this.setData({
        nutritionLedger,
        banners,
        events: events.slice(0, 3),
        browse: hub.browse,
        platform: await service.getPlatformSettings(),
        snapshot,
        greeting: timeGreeting(),
      });
    });
  },
  browseCity(e) {
    this.action(async () => {
      await service.setBrowseContext({
        city: this.data.cities[e.detail.value],
      });
      await this.refresh();
    });
  },
  browseMonth(e) {
    this.action(async () => {
      await service.setBrowseContext({ month: e.detail.value.slice(0, 7) });
      await this.refresh();
    });
  },
  banner(e) {
    const b = this.data.banners[e.currentTarget.dataset.index];
    if (b.kind === "page") navigate(b.target);
    else if (b.kind === "web")
      navigate("/pages/web-link/index?url=" + encodeURIComponent(b.target));
    else if (b.kind === "qrcode") {
      if (b.imagePath)
        wx.previewImage({ current: b.imagePath, urls: [b.imagePath] });
      else wx.showToast({ title: "尚未配置二维码图片", icon: "none" });
    } else {
      const [appId, path] = b.target.split(/\s+/);
      wx.navigateToMiniProgram({
        appId,
        path: path || "",
        fail: () =>
          wx.showToast({
            title: "未能打开目标小程序，请核对配置",
            icon: "none",
          }),
      });
    }
  },
  checkIn() {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      await service.checkIn();
      wx.showToast({ title: "今天的坚持，已记下", icon: "success" });
      await this.refresh();
    });
  },
});
