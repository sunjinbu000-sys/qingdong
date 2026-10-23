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
      const team=await service.getTeam(this.key);
      const days=Math.round((Date.parse(team.end)-Date.parse(team.start))/86400000)+1;
      this.setData({team,days,needed:Math.max(0,3-team.members.length),taskLabels:team.tasks.map(id=>({id,label:({signin:"每日签到",early:"早起打卡",weight:"体重记录"})[id]||id}))});
    });
  },
  rules(){this.setData({rulesOpen:true});},
  closeRules(){this.setData({rulesOpen:false});},
  preventMove(){},
  dissolve(){wx.showModal({title:"解散这个小队？",content:"仅筹队期间可解散。解散后邀请码失效，伙伴不能继续加入；个人健康记录保留。",confirmText:"解散小队",confirmColor:"#b66b84",success:r=>{if(r.confirm)this.action(async()=>{await service.dissolveTeam(this.key);navigate("/pages/team/index");});}});},
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
