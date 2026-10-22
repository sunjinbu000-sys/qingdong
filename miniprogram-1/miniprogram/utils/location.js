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
module.exports = { cityFromMapAddress, chooseForumCity };
