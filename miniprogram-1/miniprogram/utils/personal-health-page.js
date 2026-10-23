const { page, service, navigate } = require("./page");
const cities = ["温州", "杭州", "宁波", "上海", "北京", "广州", "深圳", "成都"];
module.exports = function registerPersonalHealthPage() {
page({
  data: {
    signedIn: false,
    sexes: ["未设置", "男", "女"], sexIndex: 0,
    directions: ["培养习惯，温和减重", "保持体重，规律生活", "仅记录日常"], directionIndex: 0,
    healthStates: ["无 / 不适用", "孕期或哺乳期", "需要专业指导的健康状态"], healthIndex: 0,
    consent: false,
    selector: null,
    cities,
    cityIndex: 0,
    form: { nickname: "", city: "", height: "", targetWeight: "" },
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      const extra = s.signedIn ? await service.getExtendedProfile() : {};
      const weight = s.signedIn ? await service.getWeightTrend() : { records: [] };
      const latest = weight.records[weight.records.length - 1];
      this.setData({
        consent: !!extra.healthConsent,
        sexIndex: Math.max(0, this.data.sexes.indexOf(extra.sex)),
        directionIndex: Math.max(0, this.data.directions.indexOf(extra.direction)),
        healthIndex: Math.max(0, this.data.healthStates.indexOf(extra.healthStatus)),
        signedIn: s.signedIn,
        form: { ...s.profile, ...extra, nickname: s.profile.nickname, city: s.profile.city,
          currentWeight: latest ? latest.kg : "", age: extra.age || "", sex: extra.sex || "未设置",
          direction: extra.direction || "培养习惯，温和减重", healthStatus: extra.healthStatus || "无 / 不适用",
          restrictions: (extra.restrictions || []).join("、"), calorieGoal: extra.calorieGoal || "", initialWeight: extra.initialWeight || "", goalDays: extra.goalDays || "",
        },
        cityIndex: Math.max(0, cities.indexOf(s.profile.city)),
      });
    });
  },
  input(e) {
    this.setData({ ["form." + e.currentTarget.dataset.field]: e.detail.value });
  },
  selectCity(e) {
    this.setData({
      cityIndex: Number(e.detail.value),
      "form.city": cities[e.detail.value],
    });
  },
  openSelector(e) {
    const key = e.currentTarget.dataset.field;
    const config = { city: ["所在城市", "cities", "cityIndex"], sex: ["性别", "sexes", "sexIndex"], direction: ["我的方向", "directions", "directionIndex"], healthStatus: ["特殊健康状态", "healthStates", "healthIndex"] }[key];
    if (!config) return;
    this.setData({ selector: { key, title: config[0], options: this.data[config[1]], indexKey: config[2], selected: this.data[config[2]], height: Math.min(650, this.data[config[1]].length * 108) } });
  },
  selectOption(e) { this.setData({ "selector.selected": Number(e.currentTarget.dataset.index) }); },
  closeSelector() { this.setData({ selector: null }); },
  stopScroll() {},
  confirmSelector() {
    const selector = this.data.selector;
    if (!selector || !selector.options[selector.selected]) return;
    this.setData({ ["form." + selector.key]: selector.options[selector.selected], [selector.indexKey]: selector.selected, selector: null });
  },
  pick(e) {
    const key = e.currentTarget.dataset.field, index = Number(e.detail.value);
    const config = { sex: ["sexes", "sexIndex"], direction: ["directions", "directionIndex"], healthStatus: ["healthStates", "healthIndex"] }[key];
    this.setData({ ["form." + key]: this.data[config[0]][index], [config[1]]: index });
  },
  consent(e) { this.setData({ consent: e.detail.value.includes("agree") }); },
  login() {
    this.action(async () => {
      await service.loginDemo();
      await this.refresh();
    });
  },
  save() {
    return this.action(async () => {
      if (!this.data.signedIn) throw Error("请先点击上方的使用模拟账号体验，再保存档案");
      await service.saveProfile({ ...this.data.form, healthConsent: this.data.consent });
      wx.showToast({ title: "资料已保存", icon: "success" });
      if (getCurrentPages().length > 1) wx.navigateBack();
      else navigate("/pages/index/index");
    });
  },
});

};
