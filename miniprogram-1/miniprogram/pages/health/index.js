const { page, service, takeDiaryDate } = require("../../utils/page");
const { shiftDate } = require("../../utils/date");
const groups = [
  ["breakfast", "早餐", "sun"],
  ["lunch", "午餐", "cup"],
  ["dinner", "晚餐", "leaf"],
  ["snack", "加餐", "sprout"],
];
page({
  data: {
    signedIn: false,
    date: "",
    today: "",
    diary: { summary: {}, meals: [], exercises: [], weights: [] },
    mealGroups: [],
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      const requestedDate = takeDiaryDate();
      const followedToday =
        !this.data.date || this.data.date === this.data.today;
      const chosenDate =
        requestedDate || (followedToday ? s.date : this.data.date);
      const date =
        chosenDate >= "2000-01-01" && chosenDate <= s.date
          ? chosenDate
          : s.date;
      this.setData({ signedIn: s.signedIn, today: s.date, date });
      if (!s.signedIn) {
        this.setData({
          diary: { summary: {}, meals: [], exercises: [], weights: [] },
          mealGroups: [],
        });
        return;
      }
      const diary = await service.getDiary(date);
      const mealGroups = groups.map(([key, label, icon]) => {
        const records = diary.meals.filter((x) => x.slot === key);
        return {
          key,
          label,
          icon,
          records,
          total: Math.round(records.reduce((n, r) => n + r.kcal, 0)),
        };
      });
      this.setData({ diary, mealGroups });
    });
  },
  selectDate(e) {
    this.setData({ date: e.detail.value });
    this.refresh();
  },
  shift(e) {
    this.setData({
      date: shiftDate(this.data.date, Number(e.currentTarget.dataset.days)),
    });
    this.refresh();
  },
  remove(e) {
    wx.showModal({
      title: "删除这条记录？",
      content: "删除后无法恢复，其他记录会保留。",
      confirmColor: "#1d6651",
      success: (r) => {
        if (r.confirm)
          this.action(async () => {
            await service.deleteRecord(e.currentTarget.dataset.id);
            await this.refresh();
          });
      },
    });
  },
});
