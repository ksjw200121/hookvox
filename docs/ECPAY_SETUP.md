# 綠界 ECPay 金流 — 從申請到接好 Hookvox

> 照著做可以完成：註冊綠界、開通信用卡、取得參數、在專案裡設定測試／正式環境。

---

## 一、申請綠界特店（約 3～7 個工作天）

### 1. 註冊與登入

- 打開 [綠界科技官網](https://www.ecpay.com.tw)
- 點「**登入 / 註冊**」→ 若沒有帳號先「**加入會員**」
- 填寫 Email、密碼、基本資料並完成驗證

### 2. 申請「特約商店」／信用卡收款

- 登入後進入 **廠商後台**（或從首頁「收款設定」進入）
- 找到「**信用卡收款**」或「**申請服務**」相關選項
- 依畫面填寫：
  - **商店資料**：商店名稱、網站網址（可先填之後要上的網址或 Vercel 網址）
  - **負責人／公司資料**：身分證、聯絡人、地址等
  - **銀行帳戶**：用來收款的銀行帳號（綠界會把款項撥到這裡）
- 上傳身分證正反面、必要時門牌或地址證明
- 送出後等待審核，約 **3～5 個工作天**（信用卡收款有時會到 5～7 天）

### 3. 審核通過後

- 綠界會寄信或簡訊通知
- 再次登入廠商後台，開通後即可取得 **MerchantID、HashKey、HashIV**

---

## 二、在綠界後台取得三組參數

1. 登入 [綠界廠商後台](https://vendor.ecpay.com.tw)（或從官網「廠商登入」進入）
2. 左側選單找 **「系統開發管理」** 或 **「API 介接」** 相關
3. 找到 **「HashKey、HashIV、MerchantID」** 或 **「金鑰管理」**：
   - **MerchantID**：特店編號（一串數字）
   - **HashKey**：金鑰 1
   - **HashIV**：金鑰 2  
   這三組之後要填進 Hookvox 的環境變數

4. **付款結果通知網址（ReturnURL / Notify URL）**  
   同一個介面或「信用卡設定」裡，會有一欄「**付款結果通知網址**」或「**ReturnURL**」：
   - **測試**：可先填 ngrok 或 Vercel 測試網址，例如  
     `https://你的網址.vercel.app/api/ecpay/notify`
   - **正式**：上線後改成正式網域，例如  
     `https://你的正式網域/api/ecpay/notify`  
   綠界會在消費者付完款後，用 POST 打這個網址，你的後端才會更新訂閱狀態，所以**一定要填對且外網可連**。

---

## 三、測試環境 vs 正式環境

| 項目 | 測試環境（Stage） | 正式環境（Production） |
|------|-------------------|-------------------------|
| 綠界後台 | 有「測試環境」或「Stage」可選 | 一般廠商後台 |
| 金流網址 | `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` | `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5` |
| MerchantID / HashKey / HashIV | 測試用參數（後台會標示測試） | 正式開通後給的參數 |
| 信用卡 | 綠界提供測試卡號（如 4311-9522-2222-2222） | 真實卡會真的扣款 |

Hookvox 專案裡已用環境變數切換金流網址，見下一段。

---

## 四、在 Hookvox 專案裡設定環境變數

### 本機開發（.env.local）

在專案根目錄的 `.env.local` 加入或確認：

```env
# 綠界（測試時用「測試環境」的 MerchantID / HashKey / HashIV）
ECPAY_MERCHANT_ID=你的特店編號
ECPAY_HASH_KEY=你的HashKey
ECPAY_HASH_IV=你的HashIV

# 付款完成後綠界「伺服器端」回傳結果的網址（你的後端 API）
ECPAY_NOTIFY_URL=https://你的網址/api/ecpay/notify

# 付款完成後「使用者瀏覽器」要導回的網址
ECPAY_RETURN_URL=https://你的網址/payment/success

# 選填：不填則用測試金流網址；正式上線時改正式網址
# ECPAY_PAYMENT_URL=https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
```

- **本機**：`你的網址` 可以是 ngrok 網址（例如你之前的 `https://xxx.ngrok-free.dev`），這樣綠界才打得到你的 `/api/ecpay/notify`。
- **Vercel 部署**：`你的網址` 改成 Vercel 給的網址（例如 `https://hookvox-ai-xxx.vercel.app`），並在 Vercel 的 Environment Variables 裡設同樣的 `ECPAY_NOTIFY_URL`、`ECPAY_RETURN_URL`。

### 正式上線時

1. 在綠界後台改用「**正式**」的 MerchantID、HashKey、HashIV（若測試與正式不同）。
2. 在 Vercel（或你的主機）環境變數設：
   - `ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`：正式參數
   - `ECPAY_NOTIFY_URL`：`https://你的正式網域/api/ecpay/notify`
   - `ECPAY_RETURN_URL`：`https://你的正式網域/payment/success`
   - **ECPAY_PAYMENT_URL**：`https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`（正式金流網址）
3. 到綠界後台把「付款結果通知網址」改成上面的 `ECPAY_NOTIFY_URL`。
4. 重新部署一次（Vercel 會用新環境變數）。

---

## 五、流程整理（你做了什麼、綠界做了什麼）

1. **使用者在 Hookvox 點「升級」**  
   → 你的後端 `create-order` 用 MerchantID、HashKey、HashIV 產生訂單並組出綠界表單。

2. **使用者被導到綠界付款頁**  
   → 輸入信用卡、完成付款。

3. **綠界伺服器打你的 Notify URL**  
   → 你的 `/api/ecpay/notify` 收到 POST，驗證 CheckMacValue、更新資料庫訂閱與訂單狀態。

4. **使用者被導到 Return URL**  
   → 你的 `/payment/success` 顯示付款成功、額度更新。

所以 **Notify URL 一定要正確**，否則付了款但你的系統不會升級。

---

## 六、常見問題

**Q：審核要多久？**  
A：特約商店／信用卡開通約 3～7 個工作天，補件會再延。

**Q：測試時沒有正式網址怎麼辦？**  
A：本機可用 ngrok 把 `http://localhost:3000` 轉成 https 網址，把 ngrok 網址填在 `ECPAY_NOTIFY_URL` 和綠界後台；或先部署到 Vercel 用 Vercel 網址測試。

**Q：付款後沒升級、Notify 沒收到？**  
A：確認 (1) `ECPAY_NOTIFY_URL` 是 **https** 且外網可連，(2) 綠界後台「付款結果通知網址」與之一致，(3) 防火牆／主機沒有擋綠界 IP。

**Q：CheckMacValue 錯誤？**  
A：HashKey、HashIV 與綠界後台完全一致（含大小寫、前後空白），且用「同一環境」的參數（測試對測試、正式對正式）。

---

把以上參數設好、Notify/Return 網址填對，Hookvox 的綠界金流就可以正常運作。部署步驟請看 **DEPLOY_VERCEL.md**。
