"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latencyInfo, setLatencyInfo] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLatencyInfo("📡 Measuring network latency...");

    try {
      const latency = await authClient.latency.measure(3);
      setLatencyInfo(`📡 Measured latency: ${latency.toFixed(1)}ms - This will be your baseline!`);

      await new Promise((r) => setTimeout(r, 500));

      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Sign up failed");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-gray-400 mt-2">Start shortening your links</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {latencyInfo && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-green-400">
                {latencyInfo}
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">
            🔐 When you sign up, we establish your network latency baseline.
            Future logins with significantly higher latency will be blocked.
          </p>
        </div>
      </div>
    </div>
  );
}
