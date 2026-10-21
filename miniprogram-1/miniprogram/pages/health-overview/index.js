const { page, service } = require("../../utils/page");
const { shiftDate } = require("../../utils/date");
page({
  data: {
    signedIn: false,
    date: "",
    today: "",
    overview: { nutrition: {}, calendar: [], restrictions: [] },
    curve: [],
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    paddingCells: [],
  },
  onLoad(o) {
    if (o.date) this.setData({ date: o.date });
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      const date =
        this.data.date && this.data.date <= s.date ? this.data.date : s.date;
      this.setData({ signedIn: s.signedIn, today: s.date, date });
      if (!s.signedIn) return;
      const overview = await service.getNutritionOverview(date);
      const values = overview.curve
          .flatMap((x) => [x.actual, x.scenario])
          .filter((x) => x !== null),
        min = values.length ? Math.min(...values) - 1 : 0,
        max = values.length ? Math.max(...values) + 1 : 1;
      const curve = overview.curve.map((x) => ({
        ...x,
        dateLabel: x.date.slice(5),
        actualHeight:
          x.actual === null
            ? 0
            : Math.max(8, ((x.actual - min) / (max - min)) * 150),
        scenarioHeight:
          x.scenario === null
            ? 0
            : Math.max(8, ((x.scenario - min) / (max - min)) * 150),
      }));
      this.setData({
        overview,
        curve,
        restrictionsText: overview.restrictions.join("、"),
        paddingCells: Array.from(
          { length: new Date(date.slice(0, 7) + "-01T00:00:00Z").getUTCDay() },
          (_, i) => i,
        ),
      });
    });
  },
  chooseDate(e) {
    this.setData({ date: e.detail.value });
    this.refresh();
  },
  calendarDate(e) {
    this.setData({ date: e.currentTarget.dataset.date });
    this.refresh();
  },
  shift(e) {
    this.setData({
      date: shiftDate(this.data.date, Number(e.currentTarget.dataset.days)),
    });
    this.refresh();
  },
});
