# Gujiapp 完整静态应用预览

这是 Gujiapp 移动端的完整静态交互原型，目标视口为 390 × 844。它不是单张首页截图，而是由五个主导航页面和关键业务浮层组成的轻量 SPA。

## 页面与交互

- `#home`：首页、IP 筛选、热门活动、快捷入口与商品流
- `#pool`：赏池分类、IP 筛选、热门赏池
- `#draw`：卡包预览、抽取数量与抽卡结果
- `#cart`：商品选择、数量调整、合计与结算确认
- `#mine`：用户资料、订单、赏品和常用服务
- 全局搜索、商品详情、结算确认、Toast 反馈与底部导航

## 本地预览

在仓库根目录执行：

```powershell
python -m http.server 4173 -d homepage-preview
```

然后打开 `http://127.0.0.1:4173/`。

页面无需构建工具，`index.html`、`styles.css` 和 `app.js` 可直接部署到任意静态托管平台。

线上预览：<https://ice-jsd.github.io/mangheapp-homepage-preview/>

> `assets/` 中含 Figma 的临时设计素材，仅用于界面预览；正式商用前仍需确认授权或替换。
