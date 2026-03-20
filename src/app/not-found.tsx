import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="text-8xl font-black text-white/10">404</div>
        <h1 className="text-3xl font-black">找不到頁面</h1>
        <p className="text-white/60 leading-relaxed">
          你要找的頁面不存在或已被移除。
          <br />
          請確認網址是否正確，或回到首頁。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            回到控制台
          </Link>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/15 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            回到首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
