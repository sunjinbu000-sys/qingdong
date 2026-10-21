const { page, service, navigate } = require("../../utils/page");
page({
  data: { id: "", kind: "", accessMessage: "", form: null, featureText: "" },
  onLoad(q = {}) {
    this.setData({
      id: q.id || "",
      kind: q.kind || "",
      queryType: q.type || "",
    });
  },
  refresh() {
    return this.loadData(async () => {
      const hub = await service.getFeatureHub();
      this.setData({
        role: hub.role,
        signedIn: hub.signedIn,
        canHQ: hub.role === "hq",
        canAdmin: ["hq", "admin"].includes(hub.role),
        canEdit: ["hq", "admin", "operator"].includes(hub.role),
        accessMessage: hub.signedIn ? "" : "请先登录查看完整服务",
      });
      const kind = this.data.kind || "plan";
      if (this.data.form) {
        this.setData({ kind });
        return;
      }
      let form;
      if (kind === "banner") {
        const list =
          this.data.canHQ && hub.signedIn
            ? await service.getBannerSettings()
            : await service.getHomeBanners();
        form = this.data.id
          ? list.find((x) => x.id === this.data.id)
          : {
              title: "",
              subtitle: "",
              kind: "page",
              target: "/pages/events/index",
              sort: 1,
              enabled: true,
              imagePath: "",
            };
      } else {
        const list = await service.getCatalog();
        form = this.data.id
          ? list.find((x) => x.id === this.data.id)
          : {
              name: "",
              days: 7,
              dailyLimit: 5,
              price: 0,
              perUserLimit: 10,
              features: ["photo", "adFree"],
              enabled: true,
            };
      }
      if (!form) {
        this.setData({ accessMessage: "配置不存在或当前身份不可见" });
        return;
      }
      this.setData({
        kind,
        form,
        featureText: (form.features || []).join(","),
        featureOptions: [
          { id: "photo", label: "拍照识餐" },
          { id: "adFree", label: "免广告使用额度" },
          { id: "plan", label: "AI完整周期计划" },
        ].map((x) => ({ ...x, checked: (form.features || []).includes(x.id) })),
      });
    });
  },
  features(e) {
    this.setData({ featureText: e.detail.value.join(",") });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  bannerKind(e) {
    this.setData({
      "form.kind": ["page", "web", "mini", "qrcode"][+e.detail.value],
    });
  },
  image() {
    return this.action(async () => {
      const m = require("../../utils/media");
      let p = await m.chooseFoodImage(wx);
      if (p) {
        p = await m.persistFoodImage(wx, p, "banner-" + Date.now());
        this.setData({ "form.imagePath": p });
      }
    });
  },
  removeImage() {
    this.setData({ "form.imagePath": "" });
  },
  save() {
    return this.action(async () => {
      const value = { ...this.data.form };
      let result;
      if (this.data.kind === "banner") {
        if (value.kind === "qrcode" && !value.imagePath)
          throw Error("请上传二维码图片");
        if (
          value.kind === "mini" &&
          !/^wx[0-9a-f]{16}(\s|\/|$)/i.test(value.target)
        )
          throw Error("请填写小程序AppID，可后接空格与页面路径");
        result = await service.saveBanner(value);
      } else {
        value.perUserLimit = Number(
          value.perUserLimit == null ? 10 : value.perUserLimit,
        );
        if (
          !Number.isInteger(value.perUserLimit) ||
          value.perUserLimit < 1 ||
          value.perUserLimit > 1000
        )
          throw Error("套餐每人累计限领须为1–1000整数");
        value.features = this.data.featureText
          .split(/[,，\s]+/)
          .filter(Boolean);
        if (
          !value.features.length ||
          value.features.some((f) => !["photo", "adFree", "plan"].includes(f))
        )
          throw Error("功能仅支持 photo,adFree,plan");
        result = await service.saveCatalogPlan(value);
      }
      this.setData({ id: result.id, form: result });
      wx.showToast({ title: "保存成功" });
    });
  },
});
