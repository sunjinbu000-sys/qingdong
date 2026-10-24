const { shiftDate } = require("../../utils/date");
const { page, service, navigate } = require("../../utils/page");
page({
  data: {memberFilter:"all",showAllMembers:false},
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
      const snapshot=await service.getSnapshot();
      const days=Math.round((Date.parse(team.end)-Date.parse(team.start))/86400000)+1;
      this.setData({team,days,needed:Math.max(0,3-team.members.length),taskLabels:team.tasks.map(id=>({id,label:({signin:"每日签到",early:"早起打卡",weight:"体重记录"})[id]||id,hint:id==="early"?"北京时间每天 "+(team.earlyBefore||"08:00")+" 前完成，队长与队员相同":id==="signin"?"每日全天可签到（北京时间）":"先保存今日体重，再完成小队任务"}))});
      this.renderDashboard(snapshot.date);
    });
  },
  renderDashboard(date){
    const t=this.data.team,tasks=t.tasksSnapshot||t.tasks,active=!!t.launched&&!t.closed&&!t.cancelled&&date>=t.start&&date<=t.end;
    const checkKey=(u,d,task)=>JSON.stringify([u,d,task]),checks=new Set(t.checks.map(c=>checkKey(c.userId,c.date,c.task)));
    const eligible=(userId,d)=>(t.memberships||[]).some(m=>(m.userId||m.user)===userId&&m.joined<=d&&(!m.left||d<m.left));
    const completed=(userId,d)=>eligible(userId,d)&&tasks.every(task=>checks.has(checkKey(userId,d,task)));
    const members=t.memberProfiles.map(m=>{const done=tasks.filter(task=>checks.has(checkKey(m.userId,date,task))).length;let streak=0,d=date>t.end?t.end:date;if(!completed(m.userId,d))d=shiftDate(d,-1);while(d>=t.start&&d<=t.end&&completed(m.userId,d)){streak++;d=shiftDate(d,-1);}return {...m,done,total:tasks.length,complete:active&&completed(m.userId,date),status:!active?(!t.launched&&!t.cancelled?"待开赛":date<t.start?"未开始":"已结束"):done===tasks.length?"今日完成":done?"部分完成":"未打卡",streak};});
    const completeCount=members.filter(m=>m.complete).length,percent=active&&members.length?Math.round(completeCount/members.length*100):0;
    const my=members.find(m=>m.isMe),todayTasks=this.data.taskLabels.map(task=>({...task,done:!!my&&checks.has(checkKey(my.userId,date,task.id))}));
    this.setData({dashboardMode:t.isMember,members,todayActive:active,todayTasks,completeCount,pendingCount:active?members.length-completeCount:0,todayPercent:percent,dayNumber:!t.launched?0:Math.min(this.data.days,Math.max(0,Math.floor((Date.parse(date)-Date.parse(t.start))/86400000)+1)),phase:t.cancelled?"已解散":!t.launched?"等待开赛":date<t.start?"等待开始":t.closed||date>t.end?"已结束":"挑战中",ringStyle:"background:conic-gradient(#ff943e "+percent+"%,#edf0ed 0)"});this.filterMembers();
  },
  filterMembers(){const members=this.data.members||[];const filtered=this.data.memberFilter==="pending"?members.filter(m=>this.data.todayActive&&!m.complete):members;this.setData({filteredCount:filtered.length,visibleMembers:this.data.showAllMembers?filtered:filtered.slice(0,8)});},
  chooseMemberFilter(e){this.setData({memberFilter:e.currentTarget.dataset.filter,showAllMembers:false});this.filterMembers();},
  toggleMembers(){this.setData({showAllMembers:!this.data.showAllMembers});this.filterMembers();},
  pendingMembers(){this.setData({memberFilter:"pending",showAllMembers:true});this.filterMembers();wx.pageScrollTo({selector:"#dashboard-members",duration:250});},
  onShareAppMessage(){return {title:(this.data.team?this.data.team.name:"我的小队")+"：一起完成今天的小习惯",path:"/pages/team-detail/index?id="+encodeURIComponent(this.key||"")};},
  rules(){this.setData({rulesOpen:true});},
  closeRules(){this.setData({rulesOpen:false});},
  preventMove(){},
  dissolve(){wx.showModal({title:"解散这个小队？",content:"仅筹队期间可解散。解散后所有成员将离开小队，邀请码失效，伙伴不能继续加入；个人健康记录保留。",confirmText:"解散小队",confirmColor:"#b66b84",success:r=>{if(r.confirm)this.action(async()=>{await service.dissolveTeam(this.key);navigate("/pages/team/index");});}});},
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
