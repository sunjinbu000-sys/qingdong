const {page,service}=require("../../utils/page");
page({
 data:{filter:"available",mineFilter:"participated",signedIn:false,square:{available:[],ongoing:[],participated:[],rewards:[]},rows:[],filters:[{key:"available",label:"可参与活动"},{key:"ongoing",label:"正在进行的活动"},{key:"mine",label:"我的"}]},
 refresh(){return this.loadData(async()=>{const snapshot=await service.getSnapshot(),square=await service.getEventSquare();this.setData({signedIn:snapshot.signedIn,square});this.applyFilter();});},
 applyFilter(){this.setData({rows:this.data.filter==="mine"?this.data.square.participated:this.data.square[this.data.filter]||[]});},
 selectFilter(e){const filter=e.currentTarget.dataset.key;if(!this.data.filters.some(f=>f.key===filter))return;this.setData({filter});this.applyFilter();},
 selectMine(e){if(["participated","rewards"].includes(e.currentTarget.dataset.key))this.setData({mineFilter:e.currentTarget.dataset.key});}
});
