# Hookvox 用 Vercel 部署 — 從零到上線

> 照著做就能把專案部署到網路上，讓大家用網址打開你的網站。

---

## 一、事前準備

1. **GitHub 帳號**（若沒有請先到 [github.com](https://github.com) 註冊）
2. **專案已經用 Git 管理**（你的專案已經是 git repo）
3. **程式碼推到 GitHub**
   - 在 GitHub 建立一個新 repository（例如 `hookvox-ai`）
   - 在本機專案資料夾執行（把 `你的帳號`、`hookvox-ai` 換成你的）：
   ```bash
   git remote add origin https://github.com/你的帳號/hookvox-ai.git
   git branch -M main
   git push -u origin main
   ```

---

## 二、用 Vercel 部署（第一次）

### 1. 註冊 Vercel

- 打開 [vercel.com](https://vercel.com)
- 點「Sign Up」→ 選擇 **Continue with GitHub**，用 GitHub 帳號登入並授權

### 2. 匯入專案

- 登入後點 **Add New…** → **Project**
- 在列表裡找到你的 **hookvox-ai**（或你取的 repo 名稱），點 **Import**
- **Framework Preset** 選 **Next.js**（通常會自動偵測）
- **Root Directory** 維持 `./` 即可
- 先不要點 Deploy，下一步要設環境變數

### 3. 設定環境變數（重要）

在「Environment Variables」區塊，把本機 `.env.local` 裡用到的變數一筆一筆加進去：

| 變數名稱 | 說明 | 哪裡找／怎麼填 |
|----------|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案網址 | Supabase 後台 → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | 同上 → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務金鑰 | 同上 → service_role（勿外流） |
| `DATABASE_URL` | Prisma 用資料庫連線 | Supabase → Settings → Database → Connection string（Transaction pooler, 5432） |
| `OPENAI_API_KEY` | OpenAI API 金鑰 | 你的 OpenAI 帳號 |
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰 | 你的 Anthropic 帳號 |
| `ECPAY_MERCHANT_ID` | 綠界特店編號 | 綠界後台（見 ECPAY_SETUP.md） |
| `ECPAY_HASH_KEY` | 綠界 HashKey | 綠界後台 |
| `ECPAY_HASH_IV` | 綠界 HashIV | 綠界後台 |
| `ECPAY_NOTIFY_URL` | 綠界付款結果回傳網址 | 部署完成後填：`https://你的網址.vercel.app/api/ecpay/notify` |
| `ECPAY_RETURN_URL` | 使用者付完款導回網址 | `https://你的網址.vercel.app/payment/success` |
| `NEXT_PUBLIC_APP_URL` | 網站網址 | `https://你的網址.vercel.app` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile 站點金鑰 | Cloudflare Turnstile 後台 |
| `ADMIN_SUPABASE_IDS` | 管理員 Supabase UID | 你的 Supabase Auth UID（可選） |
| 其他 | `NEXTAUTH_SECRET`、`AI_COST_*`、`RATE_LIMIT_*` 等 | 照 .env.local 複製，正式環境可設嚴一點 |

- 每一欄 **Key** 填變數名、**Value** 填值
- **Environment** 選 **Production**（之後可再補 Preview）
- 全部加完後再點 **Deploy**

### 4. 等待部署

- 部署中會顯示 Building…
- 完成後會出現 **Congratulations** 和一個網址，例如：`https://hookvox-ai-xxx.vercel.app`
- 點進去就是你的網站

### 5. 部署完成後必做兩件事

1. **改綠界回調網址**  
   到綠界後台（見 ECPAY_SETUP.md），把「付款結果通知網址」改成：  
   `https://你的實際網址.vercel.app/api/ecpay/notify`  
   並在 Vercel 的 Environment Variables 裡把 `ECPAY_NOTIFY_URL`、`ECPAY_RETURN_URL`、`NEXT_PUBLIC_APP_URL` 都改成這個實際網址，改完後在 Vercel 專案裡做一次 **Redeploy**。

2. **Supabase 授權網域**  
   Supabase 後台 → Authentication → URL Configuration → **Redirect URLs** 加上：  
   `https://你的實際網址.vercel.app/**`  
   這樣登入／註冊導回才不會被擋。

---

## 三、之後更新網站（日常使用）

程式碼改完、推上 GitHub 後：

1. 打開 [vercel.com](https://vercel.com) → 登入
2. 點進你的 **Hookvox 專案**
3. 會看到每次 push 產生的 **Deployment** 列表；最新一筆會自動在 push 後開始建置
4. 若沒有自動部署：點上方 **Deployments** → 選最新一筆 → 右側 **⋯** → **Redeploy**

也就是：**改 code → push 到 GitHub → Vercel 會自動重新部署**，不用再手動上傳檔案。

---

## 四、綁自己的網域（選用）

1. 在 Vercel 專案裡點 **Settings** → **Domains**
2. 輸入你的網域（例如 `hookvox.com`）→ Add
3. 照畫面上的說明，到你的網域商（如 Cloudflare、GoDaddy）新增 **CNAME** 或 **A 記錄**，指到 Vercel 給你的目標
4. 生效後，用 `https://你的網域` 就能開網站；記得把環境變數裡的 `NEXT_PUBLIC_APP_URL`、`ECPAY_RETURN_URL`、綠界通知網址等改成新網域，並再 Redeploy 一次

---

## 五、看錯誤與紀錄（簡單除錯）

- **Deployments**：點某次部署 → **Building** 或 **Runtime Logs** 可看建置／執行錯誤
- **Functions**：可看 Serverless 函式（例如 API route）的執行次數與錯誤
- 若畫面出現 500：先到 **Deployments** 點最新一筆，看 **Logs** 裡有沒有紅色錯誤訊息，多半是環境變數漏設或綠界回調網址錯誤

---

## 六、常見問題

**Q：改 .env.local 後網站沒變？**  
A：本機改只影響你電腦。線上的要改 Vercel → 專案 → Settings → Environment Variables，改完要 **Redeploy** 才會生效。

**Q：綠界付款後沒升級？**  
A：多半是 **ECPAY_NOTIFY_URL** 沒設對或綠界後台「付款結果通知網址」填錯，或沒用 **https**。確認網址可從外網連到、且與綠界後台一致。

**Q：登入後被導到錯誤頁？**  
A：到 Supabase → Authentication → URL Configuration，在 Redirect URLs 加上你 Vercel 的網址（例如 `https://xxx.vercel.app/**`）。

---

完成以上步驟，你的 Hookvox 就已經在 Vercel 上線，並可搭配綠界收款。綠界參數與後台設定請看 **ECPAY_SETUP.md**。
