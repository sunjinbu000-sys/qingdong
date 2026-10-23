const test = require('node:test');
const assert = require('node:assert/strict');
const { watchRewardedVideo } = require('../miniprogram-1/miniprogram/utils/rewarded-video');

test('rewarded video requires an explicit completed close event', async () => {
  for (const event of [{ isEnded: true }, { isEnded: false }, {}]) {
    let closed;
    const api = { createRewardedVideoAd: () => ({
      onClose: fn => { closed = fn; }, onError: () => {},
      show: () => { setTimeout(() => closed(event), 0); return Promise.resolve(); },
    }) };
    assert.equal(await watchRewardedVideo(api, 'adunit-example'), event.isEnded === true);
  }
});

test('missing configuration and failed ad loading never complete a video', async () => {
  await assert.rejects(watchRewardedVideo({}, ''), /未配置/);
  const api = { createRewardedVideoAd: () => ({
    onClose: () => {}, onError: () => {},
    show: () => Promise.reject(Error('unavailable')),
    load: () => Promise.reject(Error('unavailable')),
  }) };
  await assert.rejects(watchRewardedVideo(api, 'adunit-example'), /加载失败/);
});
