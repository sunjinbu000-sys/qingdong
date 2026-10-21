const { workbook } = require("../services/reference/excel-export");
function exportWorkbook(rows, name = "qingdong", api = wx) {
  const bytes = workbook(rows);
  const filePath =
    api.env.USER_DATA_PATH +
    "/" +
    name.replace(/[^a-zA-Z0-9-]/g, "") +
    "-" +
    Date.now() +
    ".xlsx";
  return new Promise((resolve, reject) => {
    api
      .getFileSystemManager()
      .writeFile({
        filePath,
        data: bytes.buffer,
        success: () =>
          api.openDocument({
            filePath,
            fileType: "xlsx",
            showMenu: true,
            success: () => resolve(filePath),
            fail: () => reject(Error("文件已生成，但无法预览，请在真机中打开")),
          }),
        fail: () => reject(Error("导出失败，请检查本机存储空间")),
      });
  });
}
module.exports = { exportWorkbook };
