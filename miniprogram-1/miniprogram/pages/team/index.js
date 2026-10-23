const { page, service, navigate } = require("../../utils/page");
page({
  data: { rows: [], myTeams: [] },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const rows = await service.listTeams({ city: snapshot.profile.city || undefined });
      this.setData({ rows, myTeams: rows.filter(t => t.isMember) });
    });
  },
  joinInvite() { navigate("/pages/team-join/index"); },
  teamRank() { navigate("/pages/rank/index?metric=teamTotal"); },
});
