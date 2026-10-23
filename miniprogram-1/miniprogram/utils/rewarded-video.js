function watchRewardedVideo(api, adUnitId) {
  if (!api.createRewardedVideoAd || !/^adunit-[a-zA-Z0-9_-]+$/.test(adUnitId || "")) return Promise.reject(Error("激励视频广告尚未配置或当前微信不支持，请稍后重试或查看会员权益"));
  return new Promise((resolve, reject) => {
    let settled = false;
    const ad = api.createRewardedVideoAd({ adUnitId });
    const finish = (error, ended) => {
      if (settled) return; settled = true;
      try {
        if (ad.offClose) ad.offClose(onClose);
        if (ad.offError) ad.offError(onError);
        if (ad.destroy) ad.destroy();
      } catch (_) {}
      if (error) reject(error); else resolve(ended);
    };
    const onClose = event => finish(null, !!event && event.isEnded === true);
    const onError = () => finish(Error("视频加载失败，请稍后重试，本次未获得或扣除次数"));
    ad.onClose(onClose); ad.onError(onError);
    Promise.resolve().then(() => ad.show()).catch(() => ad.load().then(() => ad.show())).catch(onError);
  });
}
module.exports = { watchRewardedVideo };
