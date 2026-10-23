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
    overview: { nutrition: {}, calendar: [] },
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    paddingCells: [],
    dayCheckedIn: false,
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
      const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
      const weekEnd = date >= shiftDate(s.date, -6) ? s.date : date;
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const dayDate = shiftDate(weekEnd, i - 6);
        return { date: dayDate, day: Number(dayDate.slice(8)), weekday: weekdayNames[new Date(dayDate + "T00:00:00Z").getUTCDay()], selected: dayDate === date, hasRecords: false, future: dayDate < "2000-01-01" };
      });
      this.setData({ signedIn: s.signedIn, today: s.date, date, weekDates,
        dateTitle: Number(date.slice(5, 7)) + " 月 " + Number(date.slice(8)) + " 日",
        weekdayTitle: "周" + weekdayNames[new Date(date + "T00:00:00Z").getUTCDay()],
      });
      if (!s.signedIn) {
        this.setData({
          diary: { summary: { calories: 0, minutes: 0, weight: "—" }, meals: [], exercises: [], weights: [] },
          mealGroups: [],
          dayCheckedIn: false,
          monthLabel: date.slice(0, 7),
          paddingCells: Array.from({ length: new Date(date.slice(0, 7) + "-01T00:00:00Z").getUTCDay() }, (_, i) => i),
          overview: {
            exerciseCalories: 0,
            nutrition: { protein: 0, carb: 0, fat: 0 },
            calendar: Array.from({ length: new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate() }, (_, i) => {
              const dayDate = date.slice(0, 7) + "-" + String(i + 1).padStart(2, "0");
              return { date: dayDate, day: i + 1, selected: dayDate === date, future: dayDate > s.date, hasRecords: false, checkedIn: false };
            }),
          },
        });
        return;
      }
      const [diary, overview] = await Promise.all([service.getDiary(date), service.getNutritionOverview(date)]);
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
      this.setData({ diary, mealGroups, overview,
        weekDates: weekDates.map(day => ({ ...day, hasRecords: overview.calendar.some(x => x.date === day.date && (x.hasRecords || x.checkedIn)) })),
        monthLabel: date.slice(0, 7),
        dayCheckedIn: overview.calendar.some(day => day.date === date && day.checkedIn),
        paddingCells: Array.from({ length: new Date(date.slice(0, 7) + "-01T00:00:00Z").getUTCDay() }, (_, i) => i),
      });
    });
  },
  selectCalendarDate(e) {
    this.setData({ date: e.currentTarget.dataset.date });
    return this.refresh();
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
