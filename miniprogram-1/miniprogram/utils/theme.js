// Shared palette: native chrome, page surfaces and feature entrances use the same family.
const families = {
  home:{name:"轻动首页",primary:"#7560BA",canvas:"#F1EDFA",soft:"#EAE3F8",edge:"#E0D8EF",ink:"#30354B",muted:"#707486"},
  diary:{name:"健康日记",primary:"#307F65",canvas:"#F0F7F2",soft:"#E2F1E7",edge:"#D6E7DC",ink:"#293E36",muted:"#5E7064"},
  social:{name:"轻友论坛",primary:"#267F83",canvas:"#FFFFFF",soft:"#DEF0EE",edge:"#D3E6E4",ink:"#293F44",muted:"#5B6F72"},
  challenge:{name:"轻动挑战",primary:"#986524",canvas:"#FAF5EA",soft:"#F6EAD2",edge:"#EBDDBF",ink:"#443B2E",muted:"#7C7261"},
  profile:{name:"我的轻动",primary:"#805D9F",canvas:"#F5F0F8",soft:"#EDE3F3",edge:"#E4D8EC",ink:"#3D354A",muted:"#7A7084"},
  team:{name:"我的小队",primary:"#287D73",canvas:"#EEF7F3",soft:"#DCF0E7",edge:"#CCE5DB",ink:"#2B413B",muted:"#5B7067"},
  event:{name:"活动广场",primary:"#A36241",canvas:"#FCF2EB",soft:"#FAE6D8",edge:"#EED8C8",ink:"#463B35",muted:"#75685F"},
  weight:{name:"体重与变化",primary:"#4A729E",canvas:"#F0F5FA",soft:"#E1EDF7",edge:"#D2E0EC",ink:"#2F3E50",muted:"#627180"},
  plan:{name:"轻动计划",primary:"#447D45",canvas:"#F1F7EB",soft:"#E5F0DB",edge:"#D8E5CB",ink:"#34432F",muted:"#627057"},
  reward:{name:"成长与权益",primary:"#96672F",canvas:"#FBF6EC",soft:"#F7EAD2",edge:"#EBDDC3",ink:"#453B30",muted:"#746757"},
  ops:{name:"管理与设置",primary:"#556B83",canvas:"#F1F4F8",soft:"#E5EBF2",edge:"#D7DFE9",ink:"#303E50",muted:"#627183"},
};
const pageThemes = {
  index:"home",startup:"home",health:"diary",challenges:"challenge",profile:"profile",
  account:"profile",activity:"challenge","ads-config":"ops","ai-config":"ops","ai-plan":"plan",badges:"reward","banner-ops":"ops",catalog:"reward","config-editor":"ops",discussion:"ops",
  "event-detail":"event","event-enroll":"event","event-editor":"event",events:"event",explore:"home","food-library":"diary",forum:"social","forum-relations":"social","forum-detail":"social","forum-editor":"social","forum-ops":"ops","full-rewards":"reward","health-overview":"diary","health-profile":"profile",invite:"event","invite-data":"event","invite-register":"event","member-services":"reward",membership:"reward",ops:"ops",orders:"reward","payment-config":"ops","personal-services":"profile",photo:"home","photo-history":"home","platform-ops":"ops",privacy:"profile","prize-ops":"ops","public-profile":"social",rank:"challenge","rank-history":"challenge",records:"diary","reward-editor":"ops","reward-ledger":"reward","reward-ops":"ops","reward-tasks":"reward",rewards:"reward",settings:"profile",share:"event",team:"team","team-task-members":"team","team-detail":"team","team-editor":"team","team-invite":"team","web-link":"home",weight:"weight","weight-trend":"weight","weight-review":"ops","word-ops":"ops","daily-meals":"diary","daily-exercise":"diary",exercise:"diary","team-join":"team",
};
function themeForRoute(route) {return families[pageThemes[String(route||"").split("/")[1]] || "home"];}
function applyTheme(route) {
  if (typeof wx === "undefined" || !route || route === "pages/startup/index") return;
  const theme=themeForRoute(route);
  if(wx.setNavigationBarColor)wx.setNavigationBarColor({frontColor:"#000000",backgroundColor:theme.canvas,animation:{duration:0,timingFunc:"linear"}});
  if(wx.setBackgroundColor)wx.setBackgroundColor({backgroundColor:theme.canvas,backgroundColorTop:theme.canvas,backgroundColorBottom:theme.canvas});
  if(["pages/index/index","pages/health/index","pages/forum/index","pages/challenges/index","pages/profile/index"].includes(route)&&wx.setTabBarStyle)
    wx.setTabBarStyle({color:"#747C8A",selectedColor:theme.primary,backgroundColor:"#FFFFFF",borderStyle:"white"});
}
module.exports={families,pageThemes,themeForRoute,applyTheme};
