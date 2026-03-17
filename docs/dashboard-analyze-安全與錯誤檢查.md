# Dashboard / Analyze / Viral-db / Plans / Billing 檢查結果

## 一、安全檢查結果

| 項目 | 狀態 | 說明 |
|------|------|------|
| **Auth** | ✅ | 所有相關 API（/api/usage、/api/billing、/api/analyze、/api/viral-database、create-order 等）皆需登入或 Bearer token；未登入回傳 401。 |
| **Viral-database** | ✅ | GET 僅查 `userId`，使用者只能看到自己的資料。 |
| **Analyze** | ✅ | 需登入、限流、額度檢查；storagePath 限定為 `userId/...`，無法讀取他人檔案；URL 僅允許 YouTube Shorts。 |
| **逐字稿長度** | ✅ 已補強 | 新增上限 50,000 字，超過回傳 400，避免單次請求 token/成本過大。 |
| **Plans / Billing** | ✅ | 依 session 呼叫 /api/usage、/api/billing，無直接渲染使用者輸入。 |
| **paymentHtml (innerHTML)** | ✅ | 表單 HTML 由後端 ECPay create-order / continue-payment 產生，參數已 escape 雙引號；非使用者輸入，風險可控。 |

**結論**：未發現需立即修補的安全漏洞；已加上逐字稿長度上限作為成本與 DoS 防護。

---

## 二、錯誤與邊界

| 項目 | 狀態 |
|------|------|
| Dashboard | 依賴 /api/usage，401 會導向登入頁；fallback 額度顯示正常。 |
| Billing | 無 token 時顯示免費方案與空訂單；載入失敗有 error state。 |
| Plans | usage 讀取失敗時不阻斷頁面，僅不顯示當前方案。 |
| Viral-db | 無 token 時為訪客、不拉資料；401 導向登入。 |
| Analyze | 錯誤訊息與 400/403/429/503 皆有對應處理。 |

---

## 三、Analyze Prompt 強化（已套用）

- **輸出品質**：要求「具體、可執行」，避免空泛形容詞；hook 須為可直接念出的第一句話；keyFormula 要可套用到其他題目。
- **情緒與爆紅原因**：emotionalTriggers / viralReasons 需寫「具體觸發情境」與「誰在什麼情境會共鳴」。
- **replicability**：明確定義高/低分（可拆解、可套用 vs 太個人化）。
- **鉤子類型**：新增「故事懸念型、身份對比型、承諾型」等選項。
- **評分準則**：hookScore / viralPotential / replicability 的給分標準寫得更具體。

以上已寫入 `src/app/api/analyze/route.ts` 的 ANALYSIS_SYSTEM_PROMPT 與逐字稿長度檢查。
