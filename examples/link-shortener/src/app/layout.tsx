import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link Shortener - Latency Security Demo",
  description: "A link shortener with keystroke latency detection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
