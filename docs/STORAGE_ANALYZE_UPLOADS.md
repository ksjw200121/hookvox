# 爆款分析上傳用 Storage（analyze-uploads）

大檔（超過約 3MB）會先上傳到 Supabase Storage，分析完成後**自動刪除**，不佔空間。

## 1. 建立 Storage 桶

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard) → 選你的專案
2. 左側 **Storage** → **New bucket**
3. Name 填：**`analyze-uploads`**
4. **Public bucket** 可關閉（建議關閉，由後端用 service role 讀取）
5. 建立

## 2. 設定 Policy（讓登入用戶可上傳）

在 **Storage** → **Policies** → 選 `analyze-uploads`，新增 Policy：

- **Policy name**：`Users can upload to own folder`
- **Allowed operation**：INSERT（上傳）
- **Target roles**：authenticated
- **Policy definition**（USING expression）：
  - 若用「依路徑限制」：  
    `(bucket_id = 'analyze-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)`
  - 表示只允許上傳到「路徑第一段 = 自己 auth.uid()」的資料夾

再新增一條允許讀取（讓後端用 service role 下載後會刪除，若後端只用 service role 則可不開 SELECT 給 authenticated）：

- **Policy name**：`Users can read own folder`（可選）
- **Allowed operation**：SELECT
- **Policy definition**：同上，路徑第一段 = auth.uid()

後端使用 **SUPABASE_SERVICE_ROLE_KEY** 下載與刪除，不受 RLS 限制。

## 3. 流程摘要

- 前端：檔案 > 3MB → 上傳到 `analyze-uploads/{auth.uid()}/{timestamp}-{檔名}`，再呼叫分析 API 傳 `storagePath`
- 後端：依 `storagePath` 從 Storage 下載 → 轉錄 → 分析 → **刪除該檔案**

完成以上設定後，大檔分析即可正常使用，且分析完自動刪檔不佔空間。
