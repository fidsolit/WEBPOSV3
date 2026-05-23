import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WEBPOSV3",
  description: "POS PRO VERSION 3",
  icons: {
    // Embedded sharp vector icon matching your sidebar terminal/growth line aesthetic
    icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%233b82f6"/><stop offset="1" stop-color="%231d4ed8"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="%2310b981"/><stop offset="1" stop-color="%23059669"/></linearGradient><rect width="100" height="100" rx="22" fill="%230f172a"/><path d="M25 35c0-6 6-11 12-11h26c6 0 12 5 12 11v36c0 4-4 8-8 8H33c-6 0-8-5-8-11z" fill="url(%23b)"/><path d="M30 29h40v20H30z" fill="%231e293b" opacity=".9"/><rect x="35" y="59" width="8" height="5" rx="1" fill="%23fff" opacity=".2"/><rect x="46" y="59" width="8" height="5" rx="1" fill="%23fff" opacity=".2"/><rect x="57" y="59" width="8" height="5" rx="1" fill="%23fff" opacity=".2"/><rect x="35" y="67" width="19" height="5" rx="1" fill="%23fff" opacity=".3"/><rect x="57" y="67" width="8" height="5" rx="1" fill="url(%23g)"/><path d="M20 63l20-18 14 10 24-25" fill="none" stroke="url(%23g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="78" cy="30" r="4" fill="%2310b981" stroke="%23fff" stroke-width="2"/></svg>`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootScript = `
    (function () {
      try {
        var savedTheme = window.localStorage.getItem("${THEME_STORAGE_KEY}");
        var theme = savedTheme === "light" || savedTheme === "dark"
          ? savedTheme
          : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.classList.add("light");
        document.documentElement.dataset.theme = "light";
        document.documentElement.style.colorScheme = "light";
      }
    })();
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
