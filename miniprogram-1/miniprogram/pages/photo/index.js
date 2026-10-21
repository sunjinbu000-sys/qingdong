const {page,service,errorMessage}=require('../../utils/page');
const {chooseFoodImage,persistFoodImage}=require('../../utils/media');
const slots={breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'};
page({data:{signedIn:false,membership:{remaining:0,dailyLimit:0},preview:'',result:null,photoError:'',slotLabel:''},
 refresh(){return this.loadData(async()=>{const s=await service.getSnapshot();this.setData({signedIn:s.signedIn,membership:s.signedIn?await service.getMembership():{remaining:0,dailyLimit:0}});if(!s.signedIn){this.pending=null;this.setData({preview:'',result:null,photoError:''});}});},
 choose(){this.action(async()=>{if(!await this.requireAccount())return;const path=await chooseFoodImage(wx);if(!path)return;this.pending={requestId:'photo-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),tempFilePath:path};this.setData({preview:path,result:null,photoError:''});await this.processPending();});},
 retryRecognition(){this.action(async()=>{if(!await this.requireAccount())return;await this.processPending();});},
 async processPending(){if(!this.pending)return;try{const p=this.pending;if(!p.imagePath)p.imagePath=await persistFoodImage(wx,p.tempFilePath,p.requestId);const result=await service.recognizeMeal({imagePath:p.imagePath,requestId:p.requestId});this.setData({result,preview:p.imagePath,photoError:'',slotLabel:slots[result.slot]});this.pending=null;await this.refresh();wx.showToast({title:'模拟记录已保存',icon:'success'});}catch(error){this.setData({photoError:errorMessage(error)});throw error;}},
 previewPhoto(){if(this.data.preview)wx.previewImage({current:this.data.preview,urls:[this.data.preview]});}
});
