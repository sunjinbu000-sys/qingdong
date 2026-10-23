# 论坛动态与本地城市

帖子采用头像、作者、时间、正文与话题、图片或视频、记录提示、点赞评论的动态结构。匿名作者不显示关注和作者主页入口，保留九图上限与每行三列、审核及私有草稿规则。

点击“本地”时获取 GCJ-02 设备坐标，经腾讯位置服务逆地址解析为城市，仅保存城市，不把资料城市当作当前位置。定位拒绝、解析失败、未配置服务时不展示旧城市列表；可重试或手动地图选点。

## 上线配置

在 miniprogram-1/miniprogram/config/index.js 的 location.tencentMapKey 填入已开通 WebService 逆地址解析权限的腾讯位置服务 Key。当前值为空，自动识别处于未配置状态，手动选点仍可用。在微信小程序后台配置 request 合法域名 https://apis.map.qq.com，并完成 getLocation、chooseLocation 与用户隐私相关配置。请在真机核验授权、城市切换与城市筛选。

接口参考：[腾讯位置服务逆地址解析文档](https://github.com/TencentLBS/tencentmap-webservice-skill/blob/main/references/api-geocoder.md)。
