const {page,service,navigate}=require("../../utils/page");
page({
 data:{scope:"national",city:"",filter:"available",mineFilter:"participated",signedIn:false,square:{available:[],ongoing:[],participated:[],rewards:[]},rows:[],filters:[{key:"available",label:"可参与活动"},{key:"ongoing",label:"正在进行的活动"},{key:"mine",label:"我的"}]},
 refresh(){return this.loadData(async()=>{const snapshot=await service.getSnapshot(),square=await service.getEventSquare({scope:this.data.scope});this.setData({signedIn:snapshot.signedIn,city:snapshot.profile.city||"",square});this.applyFilter();});},
 chooseScope(e){const scope=e.currentTarget.dataset.scope;if(!["national","city"].includes(scope))return;if(scope==="city"&&!this.data.city)return navigate("/pages/account/index");this.setData({scope});return this.refresh();},
 applyFilter(){this.setData({rows:this.data.filter==="mine"?this.data.square.participated:this.data.square[this.data.filter]||[]});},
 selectFilter(e){const filter=e.currentTarget.dataset.key;if(!this.data.filters.some(f=>f.key===filter))return;this.setData({filter});this.applyFilter();},
 selectMine(e){if(["participated","rewards"].includes(e.currentTarget.dataset.key))this.setData({mineFilter:e.currentTarget.dataset.key});}
});
