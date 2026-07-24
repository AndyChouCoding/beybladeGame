import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "陀螺比賽轉播系統",
  description: "Spinning Top Tournament Broadcaster",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              regs.forEach(r => r.unregister());
            });
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
