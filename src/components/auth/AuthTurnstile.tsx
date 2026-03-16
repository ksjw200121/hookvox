"use client";

import { Turnstile } from "@marsidev/react-turnstile";

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
};

export default function AuthTurnstile({
  onVerify,
  onExpire,
  onError,
}: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
        尚未設定真人驗證金鑰，請先補上
        <span className="ml-1 font-semibold">
          NEXT_PUBLIC_TURNSTILE_SITE_KEY
        </span>
        。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <Turnstile
          siteKey={siteKey}
          onSuccess={onVerify}
          onExpire={onExpire}
          onError={onError}
          options={{
            theme: "dark",
            size: "flexible",
          }}
        />
      </div>
      <p className="text-center text-xs text-white/40">
        若驗證無法載入或一直失敗，請確認此網址已加入 Cloudflare Turnstile 後台的網域清單。
      </p>
    </div>
  );
}