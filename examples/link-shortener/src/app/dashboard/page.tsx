"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface Link {
  id: string;
  short_code: string;
  original_url: string;
  clicks: number;
  created_at: string;
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchLinks();
    }
  }, [session]);

  const fetchLinks = async () => {
    const res = await fetch("/api/links");
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (res.ok) {
      setUrl("");
      fetchLinks();
    }
    setIsLoading(false);
  };

  const copyToClipboard = (shortCode: string) => {
    const shortUrl = `${window.location.origin}/${shortCode}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(shortCode);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Link Shortener</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{session.user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Create Link Form */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-lg font-semibold mb-4">Shorten a URL</h2>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your/long/url"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 font-medium rounded-lg transition-colors"
            >
              {isLoading ? "..." : "Shorten"}
            </button>
          </form>
        </div>

        {/* Links List */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Your Links</h2>
          </div>

          {links.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No links yet. Create your first short link above!
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono">
                          /{link.short_code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(link.short_code)}
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          {copied === link.short_code ? "✓ Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-gray-500 text-sm truncate mt-1">
                        {link.original_url}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{link.clicks}</div>
                      <div className="text-gray-500 text-xs">clicks</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
