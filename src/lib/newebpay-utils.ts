import crypto from "crypto";

/**
 * 藍新金流 MPG 加解密 + TradeSha 產生工具
 * AES-256-CBC 加密/解密 + SHA256 雜湊
 */

const getHashKey = () => process.env.NEWEBPAY_HASH_KEY!;
const getHashIV = () => process.env.NEWEBPAY_HASH_IV!;

/**
 * 將 TradeInfo 參數物件轉成 URL-encoded query string
 */
export function buildQueryString(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/**
 * AES-256-CBC 加密 TradeInfo → hex string
 */
export function encryptTradeInfo(data: string): string {
  const hashKey = getHashKey().trim();
  const hashIV = getHashIV().trim();
  const cipher = crypto.createCipheriv("aes-256-cbc", hashKey, hashIV);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * AES-256-CBC 解密 TradeInfo（hex → utf8 JSON string）
 *
 * 依序嘗試三種解密策略，提高對各種編碼/填充方式的相容性：
 *  1. hex + PKCS#7 自動填充（NewebPay Version 2.0 標準）
 *  2. hex + 停用自動填充 + 去除尾端 null bytes（零填充）
 *  3. base64 + PKCS#7 自動填充（舊版或特殊情境）
 */
export function decryptTradeInfo(encrypted: string): string {
  const hashKey = getHashKey().trim();
  const hashIV = getHashIV().trim();

  // 驗證 key / IV 長度，提早給出明確錯誤而非 "bad decrypt"
  if (!hashKey || hashKey.length !== 32) {
    throw new Error(
      `NEWEBPAY_HASH_KEY 長度錯誤（實際 ${hashKey.length} chars，需要 32 chars）`
    );
  }
  if (!hashIV || hashIV.length !== 16) {
    throw new Error(
      `NEWEBPAY_HASH_IV 長度錯誤（實際 ${hashIV.length} chars，需要 16 chars）`
    );
  }

  const trimmed = encrypted.trim();
  const diag = `[len=${trimmed.length} prefix=${trimmed.slice(0, 32)}]`;

  // ── 策略 1：hex + PKCS#7（標準）────────────────────────────────
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", hashKey, hashIV);
    let dec = decipher.update(trimmed, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch (e1: any) {
    // 若非 bad decrypt 就直接拋出（例如 invalid hex）
    if (!String(e1?.message || "").includes("bad decrypt")) {
      throw new Error(`解密失敗(hex/pkcs7): ${e1?.message} ${diag}`);
    }

    // ── 策略 2：hex + 停用填充（零填充相容）──────────────────────
    try {
      const decipher2 = crypto.createDecipheriv("aes-256-cbc", hashKey, hashIV);
      decipher2.setAutoPadding(false);
      const buf = Buffer.concat([
        decipher2.update(Buffer.from(trimmed, "hex")),
        decipher2.final(),
      ]);
      // 移除尾端填充的 null bytes 或 PKCS#7 padding bytes
      let end = buf.length;
      const lastByte = buf[end - 1];
      if (lastByte >= 1 && lastByte <= 16) {
        // 可能是 PKCS#7：確認最後 lastByte 個 byte 都相同
        let validPkcs = true;
        for (let i = end - lastByte; i < end; i++) {
          if (buf[i] !== lastByte) { validPkcs = false; break; }
        }
        if (validPkcs) end -= lastByte;
      }
      // 去除尾端 null bytes（零填充）
      while (end > 0 && buf[end - 1] === 0) end--;
      const result = buf.slice(0, end).toString("utf8").trim();
      if (result.startsWith("{")) return result; // 確認是 JSON
    } catch {
      // 繼續嘗試下一個策略
    }

    // ── 策略 3：base64 + PKCS#7（舊版 / 特殊情境）───────────────
    try {
      const decipher3 = crypto.createDecipheriv("aes-256-cbc", hashKey, hashIV);
      let dec = decipher3.update(trimmed, "base64", "utf8");
      dec += decipher3.final("utf8");
      return dec;
    } catch (e3: any) {
      // 全部失敗，拋出含診斷資訊的錯誤
      throw new Error(
        `解密失敗 (hex/pkcs7: ${e1?.message}; base64/pkcs7: ${e3?.message}) ${diag}`
      );
    }
  }
}

/**
 * 產生 TradeSha（SHA256）
 * 公式: SHA256( HashKey={key}&{encryptedTradeInfo}&HashIV={iv} ) → 大寫 hex
 */
export function generateTradeSha(encryptedTradeInfo: string): string {
  const hashKey = getHashKey().trim();
  const hashIV = getHashIV().trim();
  const raw = `HashKey=${hashKey}&${encryptedTradeInfo}&HashIV=${hashIV}`;
  return crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
}

/**
 * 驗證藍新回傳的 TradeSha 是否正確
 */
export function verifyTradeSha(encryptedTradeInfo: string, receivedSha: string): boolean {
  const expected = generateTradeSha(encryptedTradeInfo);
  return expected === receivedSha;
}
