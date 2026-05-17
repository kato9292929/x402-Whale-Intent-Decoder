import type { Metadata } from "next";
import { Space_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
});

export const metadata: Metadata = {
  title: "x402 Whale Intent Decoder",
  description: "$100K+の大口移動の「意図」をClaudeが推論する",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${spaceMono.variable} ${bebasNeue.variable} bg-[#040d1a] text-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
