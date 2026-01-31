import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Link Shortener</h1>
          <div className="flex gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-5xl font-bold mb-6">
              Shorten Links.{" "}
              <span className="text-blue-400">Stay Secure.</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              A link shortener with built-in security that detects unauthorized
              remote access via network latency analysis.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex px-8 py-4 bg-blue-600 hover:bg-blue-700 text-lg font-medium rounded-xl transition-colors"
            >
              Start Shortening Links
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold mb-2">Instant Short Links</h3>
              <p className="text-gray-400 text-sm">
                Paste any URL and get a short link instantly. Track clicks and
                manage all your links.
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="text-lg font-semibold mb-2">Latency Detection</h3>
              <p className="text-gray-400 text-sm">
                We measure network latency to detect if someone is remotely
                controlling your device from overseas.
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="text-3xl mb-4">🚫</div>
              <h3 className="text-lg font-semibold mb-2">VPN Blocking</h3>
              <p className="text-gray-400 text-sm">
                Logins through VPNs or from distant locations are automatically
                blocked to protect your account.
              </p>
            </div>
          </div>

          {/* Demo Instructions */}
          <div className="mt-16 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-xl p-6 border border-yellow-800/50">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              🧪 Demo: Test the Security
            </h3>
            <ol className="text-gray-400 text-sm space-y-2">
              <li>1. Sign up and log in normally 2-3 times (establishes your baseline)</li>
              <li>2. Turn on a VPN → connect to a distant country (Japan, Australia, etc.)</li>
              <li>3. Try to log in → <span className="text-red-400 font-semibold">BLOCKED!</span></li>
              <li>4. Turn off VPN → log in normally again → works!</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          Built with Better Auth & Keystroke Latency Detection
        </div>
      </footer>
    </div>
  );
}
