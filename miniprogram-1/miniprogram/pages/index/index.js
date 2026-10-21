const { page, service } = require('../../utils/page');
page({ data: { snapshot: {profile:{},activities:[]}, greeting: '你好' },
 refresh() { return this.loadData(async () => { const snapshot = await service.getSnapshot(); const hour = (new Date().getUTCHours() + 8) % 24; this.setData({ snapshot, greeting: hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好' }); }); },
 checkIn() { this.action(async () => { if (!await this.requireAccount()) return; await service.checkIn(); wx.showToast({title:'今天的坚持，已记下',icon:'success'}); await this.refresh(); }); }
});
