function shareImage(api, path) {
  if (!path) return Promise.reject(Error("请先生成海报"));
  return new Promise((resolve, reject) => {
    const preview = () => api.previewImage({ current:path, urls:[path], success:()=>{api.showToast({title:"长按图片选择分享方式",icon:"none"});resolve({preview:true});},fail:()=>reject(Error("无法打开海报，请稍后重试")) });
    if (typeof api.showShareImageMenu !== "function") return preview();
    api.showShareImageMenu({path,success:()=>resolve({opened:true}),fail:error=>{if(/cancel/i.test(error.errMsg||""))resolve({cancelled:true});else preview();}});
  });
}
module.exports={shareImage};
