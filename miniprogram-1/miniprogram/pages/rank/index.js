const { page, service, navigate } = require("../../utils/page");
page({
  data: { query: { scope: "national", metric: "checkin" }, city: "", metrics: [{ id: "checkin", title: "坚持榜" }, { id: "loss", title: "减重榜" }, { id: "teamTotal", title: "团队总榜" }, { id: "teamAverage", title: "团队人均榜" }], rank: { rows: [] }, podium: [], remainingRows: [] },
  onLoad(options) {
    if (["checkin", "loss", "teamTotal", "teamAverage"].includes(options.metric)) this.setData({ query: { ...this.data.query, metric: options.metric } });
  },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const city = snapshot.profile.city || "";
      const query = { ...this.data.query, month: this.data.query.month || snapshot.date.slice(0, 7), city };
      if (query.scope === "city" && !city) query.scope = "national";
      const rank = await service.getFullRank(query);
      this.setData({ city, query, rank, date: snapshot.date, todayMonth: snapshot.date.slice(0, 7),
        podium: rank.rows.slice(0, 3).map((row, i) => ({ ...row, position: i + 1, initial: row.nickname.slice(0, 1) })),
        remainingRows: rank.rows.slice(3),
        unit: query.metric === "loss" ? "kg" : (query.metric === "teamTotal" || query.metric === "teamAverage") ? "次" : "天",
      });
    });
  },
  chooseMonth(e) {
    this.setData({ query: { ...this.data.query, month: e.detail.value.slice(0, 7) } });
    return this.refresh();
  },
  chooseScope(e) {
    const scope = e.currentTarget.dataset.scope;
    if (scope === "city" && !this.data.city) return navigate("/pages/account/index");
    this.setData({ query: { ...this.data.query, scope } });
    return this.refresh();
  },
  chooseMetric(e) {
    this.setData({ query: { ...this.data.query, metric: e.currentTarget.dataset.metric } });
    return this.refresh();
  },
  filter(e) { this.setData({ query: e.detail.value }); return this.refresh(); },
});
