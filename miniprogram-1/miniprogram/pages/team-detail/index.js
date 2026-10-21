const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  onLoad(q) {
    this.key = q.id === "first-step" ? undefined : q.id;
  },
  refresh() {
    return this.loadData(async () => {
      if (!this.key) this.key = (await service.listTeams())[0]?.id;
      if (!this.key) {
        this.setData({ team: null });
        return;
      }
      this.setData({ team: await service.getTeam(this.key) });
    });
  },
  join(e) {
    return this.action(async () => {
      await service.joinTeam(this.key, e.detail.value.code);
      await this.refresh();
    });
  },
  act(e) {
    return this.action(async () => {
      const d = e.currentTarget.dataset;
      if (d.a === "reward") await service.claimTeamReward(this.key);
      if (d.a === "launch") await service.launchTeam(this.key);
      if (d.a === "leave") await service.leaveTeam(this.key);
      if (d.a === "task") await service.checkTeamTask(this.key, d.task);
      if (d.a === "approve")
        await service.approveTeamMember(this.key, d.user, d.pass === "yes");
      if (d.a === "transfer") await service.transferTeam(this.key, d.user);
      await this.refresh();
    });
  },
});
