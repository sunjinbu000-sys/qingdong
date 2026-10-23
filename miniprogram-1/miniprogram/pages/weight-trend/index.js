const { page, service } = require("../../utils/page");
const { shiftDate } = require("../../utils/date");
page({
  data: { days: 7, ranges: [7, 30, 90], current: "—", difference: "暂无对比", goalGap: "—", bmi: "—", records: [], points: [], lines: [], ticks: [], labels: [] },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const source = snapshot.signedIn ? await service.getWeightTrend() : { records: [] };
      this.source = source;
      this.today = snapshot.date;
      this.setData({ signedIn: snapshot.signedIn, today: snapshot.date });
      this.renderTrend();
    });
  },
  chooseRange(e) { this.setData({ days: Number(e.currentTarget.dataset.days) }); this.renderTrend(); },
  renderTrend() {
    const source = this.source || { records: [] }, all = source.records;
    const latest = all[all.length - 1], current = latest ? latest.kg : null;
    const initial = source.initialWeight || (all[0] && all[0].kg);
    const start = shiftDate(this.today, 1 - this.data.days);
    const byDay = new Map();
    all.filter(r => r.date >= start && r.date <= this.today).forEach(r => byDay.set(r.date, r));
    const rows = [...byDay.values()];
    const values = rows.map(r => r.kg);
    const min = values.length ? Math.floor(Math.min(...values) - 1) : 0;
    const max = values.length ? Math.ceil(Math.max(...values) + 1) : 1;
    const points = rows.map(r => ({ date: r.date, kg: r.kg, x: ((Date.parse(r.date + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000) / (this.data.days - 1) * 540, y: 260 - (r.kg - min) / (max - min) * 240 }));
    const lines = points.slice(1).map((p, i) => { const a = points[i], dx = p.x - a.x, dy = p.y - a.y; return { id: p.date, x: a.x, y: a.y, width: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) * 180 / Math.PI }; });
    this.setData({ current: current === null ? "—" : current, difference: current !== null && initial ? ((current - initial) > 0 ? "+" : "") + (current - initial).toFixed(1) + " kg" : "暂无对比",
      goalGap: current !== null && source.targetWeight ? Math.abs(current - source.targetWeight).toFixed(1) : "—",
      bmi: current !== null && source.height ? (current / (source.height / 100) ** 2).toFixed(1) : "—",
      points, lines, ticks: Array.from({ length: 4 }, (_, i) => ({ value: (max - (max - min) * i / 3).toFixed(1), y: 20 + i * 80 })),
      labels: Array.from({ length: 4 }, (_, i) => shiftDate(start, Math.round((this.data.days - 1) * i / 3)).slice(5).replace("-", ".")),
      records: all.slice().reverse().slice(0, 20), lastDate: latest ? latest.date : "暂无记录",
    });
  },
});
