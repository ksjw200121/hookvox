import { createClient, SupabaseClient } from "@supabase/supabase-js"

/** 只保留 ISO-8859-1 字元，避免 fetch headers 觸發 "non ISO-8859-1 code point" 錯誤 */
function toLatin1(value: string): string {
  return value.replace(/[\u0100-\uFFFF]/g, "?")
}

function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!init?.headers) return fetch(input, init)
  const raw = init.headers
  let headers: Headers
  if (raw instanceof Headers) {
    headers = new Headers()
    raw.forEach((value, key) => headers.set(key, toLatin1(value)))
  } else if (Array.isArray(raw)) {
    headers = new Headers(raw.map(([k, v]) => [k, toLatin1(String(v))]))
  } else {
    const obj: Record<string, string> = {}
    for (const k of Object.keys(raw)) obj[k] = toLatin1(String((raw as Record<string, string>)[k]))
    headers = new Headers(obj)
  }
  return fetch(input, { ...init, headers })
}

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，請在 .env.local 設定")
      _client = createClient("https://placeholder.supabase.co", "placeholder", { global: { fetch: safeFetch } })
    } else {
      _client = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: safeFetch } })
    }
    return _client
  } catch (e) {
    console.error("Supabase init error:", e)
    _client = createClient("https://placeholder.supabase.co", "placeholder", { global: { fetch: safeFetch } })
    return _client
  }
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as Record<string, unknown>)[prop as string]
  },
})