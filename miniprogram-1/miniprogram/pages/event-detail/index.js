const { page, service, navigate } = require("../../utils/page");
page({
  data: {registrationOpen:false,registrationValues:{},statusLabels:{registered:"已报名",cancelled:"已取消",terminated:"已终止"}},
  onLoad(q) {
    this.key = q.id === "first-step" ? undefined : q.id;
  },
  refresh() {
    return this.loadData(async () => {
      if (!this.key) this.key = (await service.listEvents())[0]?.id;
      const snapshot=await service.getSnapshot(),event=this.key?await service.getEvent(this.key):null;
      let cta="活动暂不可报名";
      if(event)cta=event.ownClaimed?"奖励已领取":event.canClaim?"领取全部奖励":event.ownRegistration?"已报名 · 查看进度":!snapshot.signedIn?"登录后报名":event.canEnroll?"立即报名":event.status!=="published"?"活动已终止":!event.remaining?"报名人数已满":event.scope!=="all"&&event.city!==snapshot.profile.city?"限"+event.city+"用户报名":event.phase;
      this.setData({event,signedIn:snapshot.signedIn,cta,ctaDisabled:!event||event.ownClaimed||(!event.canEnroll&&!event.ownRegistration&&snapshot.signedIn),startLabel:event?event.start.replace("T"," "):"",endLabel:event?event.end.replace("T"," "):"",regStartLabel:event?event.regStart.replace("T"," "):"",regEndLabel:event?event.regEnd.replace("T"," "):""});
    });
  },
  primary() {const e=this.data.event;if(!e)return;if(!this.data.signedIn)return navigate("/pages/account/index");if(e.canClaim)return this.act({currentTarget:{dataset:{a:"claim"}}});if(e.ownRegistration)return wx.pageScrollTo({selector:"#event-progress",duration:250});if(e.canEnroll)this.setData({registrationOpen:true});},
  closeRegistration(){if(!this.data.busy)this.setData({registrationOpen:false});},
  preventMove(){},
  registrationInput(e){this.setData({["registrationValues."+e.currentTarget.dataset.key]:e.detail.value});},
  confirmCancel(){wx.showModal({title:"取消报名",content:"确认取消本次活动报名？",success:r=>{if(r.confirm)this.act({currentTarget:{dataset:{a:"cancel"}}});}});},
  previewCover(){if(this.data.event.coverImage)wx.previewImage({urls:[this.data.event.coverImage],current:this.data.event.coverImage});},
  onShareAppMessage(){return {title:this.data.event?this.data.event.title:"轻动活动",path:"/pages/event-detail/index?id="+encodeURIComponent(this.key||"")};},
  enroll(e) {
    return this.action(async () => {
      await service.enrollEvent(this.key, e.detail.value);
      this.setData({registrationOpen:false,registrationValues:{}});
      await this.refresh();
      wx.showToast({title:"报名成功",icon:"success"});
    });
  },
  act(e) {
    return this.action(async () => {
      const a = e.currentTarget.dataset.a;
      if (a === "cancel") await service.cancelEventEnrollment(this.key);
      if (a === "claim") await service.claimEventReward(this.key);
      if (a === "withdraw") await service.withdrawEvent(this.key);
      await this.refresh();
    });
  },
  verify(e) {
    return this.action(async () => {
      const checks = this.data.event.conditions.map((x, i) =>
        (e.detail.value.checks || []).includes(String(i)),
      );
      await service.verifyEvent(this.key, e.currentTarget.dataset.user, checks);
      await this.refresh();
    });
  },
});
