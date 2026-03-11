# ViralScript AI 🚀

> 全台第一個 AI 爆款腳本生成器 - 分析爆款內容，一鍵生成 6 種風格短影音腳本

## 功能特色

- 🔍 **貼文 URL 分析** - 貼上任何公開 Instagram/TikTok/YouTube Shorts URL，AI 深度分析爆款原因
- ✍️ **6種風格腳本生成** - 教育型、爭議型、恐懼型、故事型、白話型、專家型
- 💥 **爆款標題生成** - 一次生成 20 個高點擊率標題
- 💡 **內容方向規劃** - 生成 30 個短影音創意
- 🔥 **爆款資料庫** - 儲存並搜尋所有分析過的爆款貼文
- 💳 **SaaS 訂閱** - 免費/Creator/Pro 三個方案

---

## 🛡️ 平台安全規範（重要）

本工具設計遵循以下安全原則，避免帳號被封：

- ❌ **絕不**登入 Instagram/TikTok/YouTube 帳號
- ❌ **絕不**自動化操作社群帳號
- ❌ **絕不**爬取私人資料、追蹤者清單、私訊
- ✅ **只分析**用戶手動貼上的公開貼文 URL
- ✅ 用戶自行複製文案、按讚數等數據貼入，AI 進行分析

---

## 技術架構

```
Next.js 14 + TypeScript + Tailwind CSS
Prisma ORM + PostgreSQL (Supabase)
Supabase Auth
OpenAI GPT-4o
TapPay 金流
Vercel 部署
```

---

## 快速開始

### 系統需求

- Node.js 18+（建議 20+）
- npm 9+

### 1. 安裝 Node.js

前往 https://nodejs.org 下載並安裝 LTS 版本

驗證安裝：
```bash
node --version  # 應顯示 v18.x.x 或以上
npm --version
```

### 2. 複製專案

```bash
git clone https://github.com/yourname/viralscript-ai.git
cd viralscript-ai
```

或手動下載 ZIP 解壓縮

### 3. 安裝依賴套件

```bash
npm install
```

### 4. 設定環境變數

複製範本並填入設定：

```bash
# Windows
copy .env.example .env.local

# Mac/Linux
cp .env.example .env.local
```

然後編輯 `.env.local`，填入以下內容：

```env
# Supabase 資料庫
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# OpenAI
OPENAI_API_KEY="sk-..."

# TapPay（可先跳過）
NEXT_PUBLIC_TAPPAY_APP_ID="your-app-id"
NEXT_PUBLIC_TAPPAY_APP_KEY="your-app-key"
TAPPAY_PARTNER_KEY="your-partner-key"
```

### 5. 設定 Supabase 資料庫

1. 前往 https://supabase.com 建立免費帳號
2. 建立新專案（選擇 Singapore 區域較快）
3. 前往 Settings > Database 取得連線資訊
4. 在 Settings > API 取得 anon key 和 service_role key

### 6. 推送資料庫 Schema

```bash
npm run db:push
```

### 7. 填入測試資料（可選）

```bash
npm run db:seed
```

### 8. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往：http://localhost:3000

---

## 部署到 Vercel

### 1. 安裝 Vercel CLI

```bash
npm i -g vercel
```

### 2. 部署

```bash
vercel
```

### 3. 設定環境變數

在 Vercel Dashboard > Project Settings > Environment Variables 新增所有 `.env.local` 中的變數

### 4. 重新部署

```bash
vercel --prod
```

---

## TapPay 金流設定

1. 前往 https://www.tappaysdk.com 申請開發者帳號
2. 建立 Merchant（商家）
3. 取得 App ID、App Key、Partner Key
4. 填入環境變數

測試信用卡：
- 卡號：4242 4242 4242 4242
- 到期：12/25
- CVV：123

---

## 常見錯誤排解

### ❌ DATABASE_URL 連線錯誤

**問題**：`Error: Can't reach database server`

**解法**：
1. 確認使用的是 Supabase **Transaction Pooler** URL（port 6543），不是 Direct URL
2. 確認密碼中的特殊字元已 URL encode（例如 `@` → `%40`）
3. 確認 `.env.local` 有兩個不同 URL：`DATABASE_URL`（port 6543）和 `DIRECT_URL`（port 5432）

```env
# ✅ 正確
DATABASE_URL="...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="...pooler.supabase.com:5432/postgres"
```

### ❌ Prisma 連線問題

**問題**：`prisma db push` 失敗

**解法**：
```bash
# 確認 prisma generate 已執行
npx prisma generate

# 再試一次
npx prisma db push
```

### ❌ Next.js 缺少 app 目錄

**問題**：`Error: Could not find a production build`

**解法**：
```bash
# 確認在正確目錄
ls src/app

# 重新建置
npm run build
```

### ❌ Windows 路徑問題

**問題**：路徑包含空格或中文

**解法**：
- 將專案放在 `C:\dev\viralscript-ai`，避免路徑含空格
- 避免放在 OneDrive 同步資料夾（OneDrive 路徑常有問題）

### ❌ OneDrive 同步問題

**問題**：OneDrive 資料夾中的 `node_modules` 被同步，造成錯誤

**解法**：
- 將專案移到非 OneDrive 目錄，例如 `C:\dev\`
- 或在 `.gitignore` 加入 `node_modules` 後，在 OneDrive 排除此資料夾

### ❌ Supabase Pooler Port 問題

**問題**：使用 port 5432 出現間歇性連線錯誤

**解法**：Prisma 在 Supabase 上必須使用以下設定：
- 一般查詢：port **6543**（Transaction Pooler）
- Migration/db push：port **5432**（Session Mode 或 Direct）

這就是為什麼 `schema.prisma` 需要同時設定 `url` 和 `directUrl`。

---

## 目錄結構

```
viralscript-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/           # 登入/註冊頁
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/      # 登入後的頁面
│   │   │   ├── dashboard/
│   │   │   ├── analyze/
│   │   │   ├── scripts/
│   │   │   ├── titles/
│   │   │   ├── ideas/
│   │   │   ├── viral-db/
│   │   │   ├── plans/
│   │   │   └── billing/
│   │   ├── api/              # API 路由
│   │   │   ├── analyze/
│   │   │   ├── scripts/
│   │   │   ├── titles/
│   │   │   ├── ideas/
│   │   │   ├── viral-db/
│   │   │   └── usage/
│   │   ├── layout.tsx
│   │   └── page.tsx          # 首頁
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   └── usage.ts
│   ├── services/ai/
│   │   ├── analyzeContent.ts
│   │   ├── generateScripts.ts
│   │   ├── generateTitles.ts
│   │   └── generateIdeas.ts
│   ├── prompts/
│   │   └── index.ts
│   └── middleware.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.example
├── .env.local          # 不提交到 Git
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 授權

MIT License

Made with ❤️ in Taiwan 🇹🇼
