const service = require("../services/index");
let pending=false,active=false,current=null;
function requestEntry(){if(active)return;pending=true;setTimeout(()=>maybeShow().catch(()=>{}),120);}
async function maybeShow(){
 if(!pending||active)return;const pages=getCurrentPages();if(!pages.length)return;
 if(pages[pages.length-1].route==="pages/startup/index")return;
 pending=false;active=true;
 try{const config=await service.beginStartupDisplay();if(!config){active=false;return;}current=config;
 wx.navigateTo({url:"/pages/startup/index",fail:()=>{service.finishStartupDisplay(config.receiptId,false).catch(()=>{});finish();}});
 }catch(_){finish();}
}
function finish(){active=false;current=null;}
module.exports={requestEntry,maybeShow,finish,suspend:()=>{pending=false;},getCurrent:()=>current};
