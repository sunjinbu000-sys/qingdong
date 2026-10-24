const {page,service,navigate}=require("../../utils/page");
page({
 data:{form:{name:"",phone:""},event:null,submitted:false},
 onLoad(q={}){this.key=q.id||"";},
 refresh(){return this.loadData(async()=>{if(!(await this.requireAccount()))return;if(!this.key)return;const event=await service.getEvent(this.key);this.setData({event,registered:!!event.ownRegistration});});},
 input(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});},
 submit(e){return this.action(async()=>{
  if(this.data.submitted)return;
  await service.enrollEventWithContact(this.key,e.detail.value);
  this.setData({submitted:true,registered:true});
  const success=()=>wx.showToast({title:"报名成功",icon:"success"});
  if(getCurrentPages().length>1)wx.navigateBack({success});else wx.redirectTo({url:"/pages/event-detail/index?id="+encodeURIComponent(this.key),success});
 });},
 detail(){navigate("/pages/event-detail/index?id="+encodeURIComponent(this.key));},
});
