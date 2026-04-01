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
  const hashKey = getHashKey();
  const hashIV = getHashIV();
  const cipher = crypto.createCipheriv("aes-256-cbc", hashKey, hashIV);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * AES-256-CBC 解密 TradeInfo（hex → utf8 JSON string）
 */
export function decryptTradeInfo(encrypted: string): string {
  const hashKey = getHashKey();
  const hashIV = getHashIV();
  const decipher = crypto.createDecipheriv("aes-256-cbc", hashKey, hashIV);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * 產生 TradeSha（SHA256）
 * 公式: SHA256( HashKey={key}&{encryptedTradeInfo}&HashIV={iv} ) → 大寫 hex
 */
export function generateTradeSha(encryptedTradeInfo: string): string {
  const hashKey = getHashKey();
  const hashIV = getHashIV();
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
