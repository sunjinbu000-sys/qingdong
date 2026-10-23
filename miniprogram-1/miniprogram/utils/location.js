function cityFromMapAddress(value) {
  const address = String(value || "")
    .replace(/\s/g, "")
    .replace(/^中国/, "");
  const municipality = /^(北京|上海|天津|重庆)市/.exec(address);
  if (municipality) return municipality[1];
  const match =
    /(?:省|自治区)([^省区县]+?市)/.exec(address) ||
    /^([^省区县]+?市)/.exec(address);
  if (!match) throw Error("地图地址未包含城市，请在地图中重新确认位置");
  return match[1].replace(/市$/, "");
}
function chooseForumCity(api) {
  return new Promise((resolve, reject) =>
    api.chooseLocation({
      success(result) {
        try {
          resolve({ city: cityFromMapAddress(result.address), source: "map" });
        } catch (error) {
          reject(error);
        }
      },
      fail(error) {
        if (/cancel/i.test(error.errMsg || "")) resolve(null);
        else reject(Error("暂时无法定位，请检查微信定位授权后重试"));
      },
    }),
  );
}
function locateForumCity(api, config = require("../config/index").location || {}) {
  return new Promise((resolve,reject)=>{
    if(!config.tencentMapKey)return reject(Error("自动识别城市服务尚未配置，请先手动选择位置"));
    if(!api.getLocation)return reject(Error("当前设备暂不支持自动定位，请手动选择位置"));
    api.getLocation({type:"gcj02",success:position=>{
      if(!Number.isFinite(position.latitude)||!Number.isFinite(position.longitude))return reject(Error("未获取到有效位置，请重试"));
      api.request({url:"https://apis.map.qq.com/ws/geocoder/v1/",method:"GET",timeout:10000,data:{key:config.tencentMapKey,location:position.latitude+","+position.longitude,get_poi:0},success:response=>{
        const body=response.data;const parts=body&&body.result&&body.result.address_component;
        const city=parts&&(parts.city||(/^(北京|上海|天津|重庆)市$/.test(parts.province||"")?parts.province:""));
        if(response.statusCode!==200||!body||body.status!==0||!city)return reject(Error("暂时无法识别当前城市，请重试或手动选择"));
        resolve({city:String(city).replace(/市$/,""),source:"gps"});
      },fail:()=>reject(Error("城市识别服务暂不可用，请重试或手动选择"))});
    },fail:()=>reject(Error("暂时无法定位，请开启微信定位授权后重试"))});
  });
}
module.exports = { cityFromMapAddress, chooseForumCity, locateForumCity };
