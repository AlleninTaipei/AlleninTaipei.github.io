# AlleninTaipei.github.io

個人作品集網站: https://alleninTaipei.github.io/

## 架構

- 純靜態網頁, 以 CDN 載入 Bootstrap 5.3.3 與 Bootstrap Icons, 不需要建置工具.
- 專案資料來自 [AlleninTaipei](https://github.com/AlleninTaipei/AlleninTaipei) repo 的 `README.md` 與 `README-en.md`.
- 只顯示目前為 public 的 repo.

```
index.html               頁面結構
css/style.css            自訂樣式
js/i18n.js               介面文字的中英字典
js/main.js               渲染, 篩選, 搜尋, 語言切換
js/projects.js           專案資料 (自動產生, 勿手動修改)
tools/build_projects.py  從 README 產生 projects.js
```

## 更新專案清單

1. 在 AlleninTaipei repo 的兩份 README 新增或修改專案.
2. 執行 (需要已登入的 `gh` CLI):

   ```
   python tools/build_projects.py
   ```

   預設讀取並排的 `../allenintaipei` 資料夾, 其他位置用 `--readme-dir` 指定.
3. commit 並 push `js/projects.js`.
