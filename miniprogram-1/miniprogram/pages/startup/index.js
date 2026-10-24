const startup=require("../../utils/startup-display");
const service=require("../../services/index");
Page({
 data:{loading:false,config:{},canSkip:false,skipRemaining:0,skipTop:70},
 refresh(){return Promise.resolve();},
 onLoad(){
  const config=startup.getCurrent();if(!config){this.close();return;}this.config=config;this._visible=true;
  const info=wx.getSystemInfoSync();this.setData({config,skipTop:(info.statusBarHeight||24)+48,canSkip:config.skipAfter===0,skipRemaining:config.skipAfter});
  this.watchdog=setTimeout(()=>this.mediaError(),10000);
  if(config.type==="tencent")this.showTencent();
 },
 onShow(){this._visible=true;},onHide(){this._visible=false;},
 mediaReady(){
  if(this._closed||this._ready)return;this._ready=true;clearTimeout(this.watchdog);
  service.finishStartupDisplay(this.config.receiptId,true).catch(()=>{});
  let elapsed=0;this.timer=setInterval(()=>{if(!this._visible)return;elapsed++;this.setData({canSkip:elapsed>=this.config.skipAfter,skipRemaining:Math.max(0,this.config.skipAfter-elapsed)});if(elapsed>=this.config.duration)this.close();},1000);
 },
 showTencent(){
  try{
   if(!wx.createInterstitialAd)return this.mediaError();
   const ad=this.ad=wx.createInterstitialAd({adUnitId:this.config.unitId});
   ad.onError(()=>this.mediaError());ad.onClose(()=>this.close());
   ad.onLoad(()=>{if(this._closed||this._adShowing)return;this._adShowing=true;Promise.resolve(ad.show()).then(()=>{if(this._closed)return;clearTimeout(this.watchdog);this._ready=true;service.finishStartupDisplay(this.config.receiptId,true).catch(()=>{});}).catch(()=>this.mediaError());});
  }catch(_){this.mediaError();}
 },
 skip(){if(this.data.canSkip)this.close();},
 mediaError(){this.close();},
 cleanup(){clearTimeout(this.watchdog);clearInterval(this.timer);if(this.ad){const ad=this.ad;this.ad=null;if(ad.destroy)ad.destroy();}},
 close(){if(this._closed)return;this._closed=true;this.cleanup();if(this.config&&!this._ready)service.finishStartupDisplay(this.config.receiptId,false).catch(()=>{});startup.finish();if(getCurrentPages().length>1)wx.navigateBack();else wx.switchTab({url:"/pages/index/index"});},
 onUnload(){this.cleanup();if(!this._closed){this._closed=true;if(this.config&&!this._ready)service.finishStartupDisplay(this.config.receiptId,false).catch(()=>{});startup.finish();}},
});
