const test = require("node:test");
const assert = require("node:assert/strict");
test("camera shutter uses camera context and propagates capture errors", async () => {
  const { takeFoodPhoto } = require("../miniprogram-1/miniprogram/utils/media");
  assert.equal(
    await takeFoodPhoto({
      createCameraContext: () => ({
        takePhoto: (o) => o.success({ tempImagePath: "wxfile://camera.jpg" }),
      }),
    }),
    "wxfile://camera.jpg",
  );
  await assert.rejects(
    () =>
      takeFoodPhoto({
        createCameraContext: () => ({
          takePhoto: (o) => o.fail({ errMsg: "camera stopped" }),
        }),
      }),
    /拍照/,
  );
  await assert.rejects(
    () =>
      takeFoodPhoto({
        createCameraContext: () => ({ takePhoto: (o) => o.success({}) }),
      }),
    /照片/,
  );
});
const {
  chooseFoodImage,
  persistFoodImage,
  clearOwnedImages,
} = require("../miniprogram-1/miniprogram/utils/media");
test("cancelling the picker returns null while other failures propagate", async () => {
  assert.equal(
    await chooseFoodImage({
      chooseMedia: (o) => o.fail({ errMsg: "chooseMedia:fail cancel" }),
    }),
    null,
  );
  await assert.rejects(
    chooseFoodImage({
      chooseMedia: (o) => o.fail({ errMsg: "camera unavailable" }),
    }),
    /相机|相册/,
  );
});
test("oversized images are rejected before persistence", async () => {
  await assert.rejects(
    chooseFoodImage({
      chooseMedia: (o) =>
        o.success({
          tempFiles: [{ tempFilePath: "tmp", size: 9 * 1024 * 1024 }],
        }),
    }),
    /8 MB/,
  );
});
test("persistence returns owned file path and propagates disk errors", async () => {
  const api = {
    env: { USER_DATA_PATH: "wxfile://usr" },
    getFileSystemManager: () => ({ copyFile: (o) => o.success() }),
  };
  assert.equal(
    await persistFoodImage(api, "tmp", "request-1"),
    "wxfile://usr/qingdong-food-request-1.jpg",
  );
  api.getFileSystemManager = () => ({
    copyFile: (o) => o.fail({ errMsg: "full" }),
  });
  await assert.rejects(persistFoodImage(api, "tmp", "request-2"), /保存/);
});
test("reset cleans only app-owned images, reporting failed deletions", async () => {
  const removed = [];
  const fs = {
    readdir: (o) =>
      o.success({
        files: ["qingdong-food-a.jpg", "other.jpg", "qingdong-food-b.jpg"],
      }),
    unlink: (o) => {
      removed.push(o.filePath);
      o.filePath.endsWith("b.jpg") ? o.fail() : o.success();
    },
  };
  const result = await clearOwnedImages({
    env: { USER_DATA_PATH: "wxfile://usr" },
    getFileSystemManager: () => fs,
  });
  assert.deepEqual(removed, [
    "wxfile://usr/qingdong-food-a.jpg",
    "wxfile://usr/qingdong-food-b.jpg",
  ]);
  assert.equal(result.failed, 1);
});
