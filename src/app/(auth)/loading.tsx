export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 animate-pulse">
        {/* Logo 骨架 */}
        <div className="text-center space-y-2">
          <div className="h-8 w-32 bg-white/10 rounded-lg mx-auto" />
          <div className="h-4 w-48 bg-white/5 rounded mx-auto" />
        </div>

        {/* 表單骨架 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-white/10 rounded" />
              <div className="h-11 w-full bg-white/10 rounded-xl" />
            </div>
          ))}
          <div className="h-11 w-full bg-white/10 rounded-xl" />
          <div className="h-3 w-40 bg-white/5 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
