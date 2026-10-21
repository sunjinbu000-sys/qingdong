const { page, service } = require("../../utils/page");
page({
  data: {
    signedIn: false,
    form: { sex: "未设置" },
    sexes: ["未设置", "男", "女"],
    sexIndex: 0,
    restrictions: "",
    fields: [
      { key: "age", label: "年龄 / 岁" },
      { key: "height", label: "身高 / cm" },
      { key: "initialWeight", label: "起始体重 / kg" },
      { key: "targetWeight", label: "目标体重 / kg" },
      { key: "goalDays", label: "目标周期 / 天" },
      { key: "calorieGoal", label: "每日自设预算 / kcal" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({ signedIn: s.signedIn });
      if (s.signedIn) {
        const form = await service.getExtendedProfile();
        this.setData({
          form: { ...form, calorieGoal: form.calorieGoal || 1800 },
          sexIndex: ["未设置", "男", "女"].indexOf(form.sex),
          restrictions: form.restrictions.join("、"),
        });
      }
    });
  },
  input(e) {
    this.setData({ ["form." + e.currentTarget.dataset.key]: e.detail.value });
  },
  sex(e) {
    this.setData({
      sexIndex: Number(e.detail.value),
      "form.sex": this.data.sexes[e.detail.value],
    });
  },
  restrictions(e) {
    this.setData({ restrictions: e.detail.value });
  },
  save() {
    this.action(async () => {
      const input = { ...this.data.form, restrictions: this.data.restrictions };
      for (const k of ["age", "height", "initialWeight", "targetWeight"])
        if (input[k] === "") delete input[k];
      await service.saveExtendedProfile(input);
      wx.showToast({ title: "健康档案已保存" });
      await this.refresh();
    });
  },
});
