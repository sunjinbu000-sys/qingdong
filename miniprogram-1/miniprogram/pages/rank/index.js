const { page, service, navigate } = require("../../utils/page");
page({
  data: { query: { scope: "national", metric: "checkin" }, city: "", metrics: [{ id: "checkin", title: "坚持榜" }, { id: "loss", title: "减重榜" }, { id: "teamTotal", title: "团队榜" }], rank: { rows: [] }, podium: [], remainingRows: [] },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const city = snapshot.profile.city || "";
      const query = { ...this.data.query, month: snapshot.date.slice(0, 7), city };
      if (query.scope === "city" && !city) query.scope = "national";
      const rank = await service.getFullRank(query);
      this.setData({ city, query, rank, date: snapshot.date,
        podium: rank.rows.slice(0, 3).map((row, i) => ({ ...row, position: i + 1, initial: row.nickname.slice(0, 1) })),
        remainingRows: rank.rows.slice(3),
        unit: query.metric === "loss" ? "kg" : query.metric === "teamTotal" ? "次" : "天",
      });
    });
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
