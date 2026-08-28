import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import SyncStatusButton from "@/components/SyncStatusButton";
import { getRecentSyncRuns } from "@/lib/get-sync-runs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PARTA — аналитика",
  description: "Отчёты по данным PARTA",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Если Supabase недоступен — не роняем весь сайт из-за одной кнопки,
  // просто покажем пустую историю.
  const syncRuns = await getRecentSyncRuns().catch(() => []);

  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="site-header">
          <Link href="/">PARTA — аналитика</Link>
          <SyncStatusButton runs={syncRuns} />
        </header>
        {children}
      </body>
    </html>
  );
}
