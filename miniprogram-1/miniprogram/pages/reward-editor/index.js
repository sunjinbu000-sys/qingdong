const { bizDate } = require("../../utils/date");
const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    id: "",
    kind: "",
    accessMessage: "",
    form: null,
    plans: [],
    typeKeys: [
      "checkin",
      "forum",
      "invite",
      "video",
      "event",
      "team",
      "rank",
      "manual",
    ],
    typeLabels: [
      "累计签到",
      "连续发帖",
      "邀请注册",
      "激励视频",
      "线下活动核验",
      "小队全员达标",
      "榜单结算",
      "线下人工确认",
    ],
  },
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
      const plans = (await service.getCatalog()).filter((p) => p.enabled);
      let activities =
        this.data.canEdit && hub.signedIn
          ? await service.getRewardActivities()
          : await service.getRewardTasks();
      let form = this.data.form;
      if (this.data.id) {
        form = activities.find((x) => x.id === this.data.id);
        if (!form) {
          this.setData({ accessMessage: "活动不在当前身份或城市可见范围" });
          return;
        }
      } else if (!form) {
        const date = bizDate();
        form = {
          title: "",
          type: this.data.queryType || "checkin",
          city: "all",
          start: date,
          end: date,
          claimUntil: date,
          claimMode: "all",
          published: false,
          tiers: [
            {
              name: "第一档",
              target: 1,
              quota: 100,
              perUserLimit: 1,
              rewardType: "member",
              planId: plans[0]?.id || "",
              productName: "",
            },
          ],
        };
      }
      this.setData({
        plans,
        planNames: plans.map(
          (p) => p.name + " · " + p.days + "天 / " + p.dailyLimit + "次",
        ),
        form,
      });
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  select(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      ["form." + key]:
        key === "type"
          ? this.data.typeKeys[+e.detail.value]
          : ["all", "highest"][+e.detail.value],
    });
  },
  rewardType(e) {
    this.setData({
      ["form.tiers." + e.currentTarget.dataset.index + ".rewardType"]: [
        "member",
        "physical",
        "product",
      ][+e.detail.value],
    });
  },
  plan(e) {
    this.setData({
      ["form.tiers." + e.currentTarget.dataset.index + ".planId"]:
        this.data.plans[+e.detail.value].id,
    });
  },
  addTier() {
    if (this.data.form.tiers.length >= 10) {
      wx.showToast({ title: "最多10个奖励档位", icon: "none" });
      return;
    }
    this.setData({
      "form.tiers": this.data.form.tiers.concat({
        name: "新增档位",
        target: this.data.form.tiers.length + 1,
        quota: 100,
        perUserLimit: 1,
        rewardType: "member",
        planId: this.data.plans[0]?.id || "",
        productName: "",
      }),
    });
  },
  removeTier(e) {
    if (this.data.form.tiers.length <= 1) {
      wx.showToast({ title: "至少保留一个档位", icon: "none" });
      return;
    }
    this.setData({
      "form.tiers": this.data.form.tiers.filter(
        (_, i) => i !== +e.currentTarget.dataset.index,
      ),
    });
  },
  save() {
    return this.action(async () => {
      if (this.data.form.tiers.length < 1 || this.data.form.tiers.length > 10)
        throw Error("奖励档位须为1–10档");
      if (
        this.data.form.tiers.some(
          (t) =>
            !Number.isInteger(
              Number(t.perUserLimit == null ? 1 : t.perUserLimit),
            ) ||
            Number(t.perUserLimit == null ? 1 : t.perUserLimit) < 1 ||
            Number(t.perUserLimit == null ? 1 : t.perUserLimit) > 1000,
        )
      )
        throw Error("每人限领须为1–1000整数");
      const result = await service.saveRewardActivity(this.data.form);
      this.setData({ id: result.id, form: result });
      wx.showToast({ title: "配置已保存" });
    });
  },
});
