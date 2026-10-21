const { page, service, navigate } = require('../../utils/page');
const cities = ['温州','杭州','宁波','上海','北京','广州','深圳','成都'];
page({ data: { signedIn:false, cities, cityIndex:0, form:{nickname:'',city:'',height:'',targetWeight:''} },
 refresh() { return this.loadData(async () => { const s=await service.getSnapshot(); this.setData({signedIn:s.signedIn,form:s.profile,cityIndex:Math.max(0,cities.indexOf(s.profile.city))}); }); },
 input(e) { this.setData({['form.'+e.currentTarget.dataset.field]:e.detail.value}); },
 selectCity(e) { this.setData({cityIndex:Number(e.detail.value),'form.city':cities[e.detail.value]}); },
 login() { this.action(async()=>{ await service.loginDemo(); await this.refresh(); }); },
 save() { this.action(async()=>{ await service.saveProfile(this.data.form); wx.showToast({title:'资料已保存',icon:'success'}); if(getCurrentPages().length>1) wx.navigateBack(); else navigate('/pages/index/index'); }); }
});
