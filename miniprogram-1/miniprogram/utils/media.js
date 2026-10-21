function chooseFoodImage(api) {
  return new Promise((resolve, reject) => {
    api.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success(result) {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file || !file.tempFilePath)
          return reject(new Error("没有找到选择的照片，请重试"));
        if (!Number.isFinite(file.size) || file.size > 8 * 1024 * 1024)
          return reject(new Error("请选择小于 8 MB 的照片"));
        resolve(file.tempFilePath);
      },
      fail(error) {
        if (/cancel/i.test(error.errMsg || "")) resolve(null);
        else reject(new Error("无法打开相机或相册，请检查授权后重试"));
      },
    });
  });
}
function persistFoodImage(api, tempFilePath, requestId) {
  const safeId = requestId.replace(/[^a-zA-Z0-9-]/g, "");
  const path = api.env.USER_DATA_PATH + "/qingdong-food-" + safeId + ".jpg";
  return new Promise((resolve, reject) => {
    api
      .getFileSystemManager()
      .copyFile({
        srcPath: tempFilePath,
        destPath: path,
        success: () => resolve(path),
        fail: () =>
          reject(new Error("照片保存失败，请检查设备空间，额度未扣减")),
      });
  });
}
function clearOwnedImages(api) {
  return new Promise((resolve) => {
    const fs = api.getFileSystemManager();
    fs.readdir({
      dirPath: api.env.USER_DATA_PATH,
      fail: () => resolve({ failed: 1 }),
      success(result) {
        const files = result.files.filter((name) =>
          /^qingdong-food-[a-zA-Z0-9-]+\.jpg$/.test(name),
        );
        Promise.all(
          files.map(
            (name) =>
              new Promise((done) => {
                fs.unlink({
                  filePath: api.env.USER_DATA_PATH + "/" + name,
                  success: () => done(0),
                  fail: () => done(1),
                });
              }),
          ),
        ).then((results) =>
          resolve({ failed: results.reduce((sum, value) => sum + value, 0) }),
        );
      },
    });
  });
}
module.exports = { chooseFoodImage, persistFoodImage, clearOwnedImages };
