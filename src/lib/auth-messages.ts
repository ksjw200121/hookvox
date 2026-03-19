export function translateSupabaseAuthError(message: string) {
  const msg = String(message || "").trim();

  if (!msg) return "發生未知錯誤，請稍後再試。";

  const exactMap: Record<string, string> = {
    "Invalid login credentials": "帳號或密碼錯誤。",
    "Email not confirmed": "請先到你的 Email 完成驗證後再登入。",
    "User already registered": "這個 Email 已經註冊過了，請直接登入。",
    "Signup is disabled": "目前暫時無法註冊新帳號。",
    "Email rate limit exceeded": "寄信太頻繁了，請稍後再試。",
    "Password should be at least 6 characters": "密碼至少要 6 碼。",
    "Unable to validate email address: invalid format":
      "Email 格式不正確，請重新輸入。",
    "Anonymous sign-ins are disabled": "目前不開放匿名登入。",
    "Invalid Refresh Token: Refresh Token Not Found":
      "登入狀態已失效，請重新登入。",
    "Token has expired or is invalid":
      "驗證連結已過期或無效，請重新申請。",
    "New password should be different from the old password":
      "新密碼不能和舊密碼相同。",
  };

  if (exactMap[msg]) return exactMap[msg];

  const includesMap: Array<[string, string]> = [
    ["invalid login credentials", "帳號或密碼錯誤。"],
    ["email not confirmed", "請先到你的 Email 完成驗證後再登入。"],
    ["user already registered", "這個 Email 已經註冊過了，請直接登入。"],
    ["password should be", "密碼格式不符合要求。"],
    ["rate limit", "操作太頻繁了，請稍後再試。"],
    ["captcha", "真人驗證尚未完成，請等待驗證框顯示「成功」後再試。"],
    ["failed to fetch", "無法連線到伺服器，請確認網路連線正常後重試。若持續失敗，可能是伺服器暫時維護中。"],
    ["networkerror", "網路連線失敗，請確認網路後重試。"],
    ["network", "網路連線異常，請稍後再試。"],
    ["timeout", "連線逾時，請確認網路穩定後重試。"],
    ["etimedout", "連線逾時，請稍後再試。"],
    ["econnrefused", "伺服器暫時無法連線，請稍後再試。"],
    ["expired", "連結已過期，請重新操作。"],
    ["invalid", "資料無效，請重新確認後再試。"],
    ["email", "Email 有誤，請重新確認。"],
  ];

  const lower = msg.toLowerCase();

  for (const [keyword, translated] of includesMap) {
    if (lower.includes(keyword)) return translated;
  }

  return `操作失敗：${msg}`;
}

export function validateStrongPassword(password: string) {
  const value = String(password || "");

  if (value.length < 8) {
    return "密碼至少要 8 碼。";
  }

  if (!/[a-z]/.test(value)) {
    return "密碼必須包含至少 1 個英文小寫字母。";
  }

  if (!/[A-Z]/.test(value)) {
    return "密碼必須包含至少 1 個英文大寫字母。";
  }

  if (!/[0-9]/.test(value)) {
    return "密碼必須包含至少 1 個數字。";
  }

  return "";
}