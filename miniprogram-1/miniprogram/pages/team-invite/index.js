const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  onLoad(q) {
    this.key = q.id === "first-step" ? undefined : q.id;
  },
  refresh() {
    return this.loadData(async () => {
      if (!this.key) this.key = (await service.listTeams())[0]?.id;
      this.setData({ team: this.key ? await service.getTeam(this.key) : {} });
    });
  },
  copy() {
    wx.setClipboardData({ data: this.data.team.invite || this.data.team.id });
  },
  onShareAppMessage() {
    return {
      title: this.data.team.name,
      path: "/pages/team-detail/index?id=" + this.key,
    };
  },
});
