const { page, service } = require("../../utils/page");
const { bizDate } = require("../../utils/date");
page({
  data: {
    type: "meal",
    today: "",
    slots: ["早餐", "午餐", "晚餐", "加餐"],
    slotIndex: 1,
    form: { date: "", name: "", kcal: "", minutes: "", kg: "" },
  },
  onLoad(options) {
    const type = ["meal", "exercise", "weight"].includes(options.type)
      ? options.type
      : "meal";
    this.setData({ type, "form.date": options.date || bizDate() });
  },
  refresh() {
    this.setData({ today: bizDate(), loading: false });
  },
  input(e) {
    this.setData({ ["form." + e.currentTarget.dataset.field]: e.detail.value });
  },
  dateChange(e) {
    this.setData({ "form.date": e.detail.value });
  },
  slotChange(e) {
    this.setData({ slotIndex: Number(e.detail.value) });
  },
  save() {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      await service.saveRecord(
        Object.assign({}, this.data.form, {
          type: this.data.type,
          slot: ["breakfast", "lunch", "dinner", "snack"][this.data.slotIndex],
        }),
      );
      wx.showToast({ title: "记录已保存", icon: "success" });
      wx.navigateBack();
    });
  },
});
