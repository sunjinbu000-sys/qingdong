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
  joinInvite() {
    wx.showModal({ title: "加入轻动小队", editable: true, placeholderText: "输入朋友分享的邀请码", confirmText: "加入小队", confirmColor: "#8870d1", success: result => {
      if (!result.confirm) return;
      this.action(async () => {
        if (!(await this.requireAccount())) return;
        const joined = await service.joinTeamByInvite(result.content);
        wx.showToast({ title: joined.pending ? "申请已提交" : "已加入小队", icon: "success" });
        await this.refresh();
        navigate("/pages/team-detail/index?id=" + joined.id);
      });
    } });
  },
  teamRank() { navigate("/pages/rank/index?metric=teamTotal"); },
});
