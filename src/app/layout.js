import { Suspense } from "react";
import { Source_Sans_3, Geist_Mono } from "next/font/google";
import ThemeProvider from "../components/layout/ThemeProvider";
import AppShell from "../components/layout/AppShell";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Call Intelligence | AI Call Review",
  description:
    "AI Call Intelligence Platform — analyze call transcripts, score by profile, route exceptions, and simulate safe internal actions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <Suspense fallback={<div className="content">Loading workspace…</div>}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
