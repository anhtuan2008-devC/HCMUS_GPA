import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HCMUS GPA",
  description: "Không gian tự quản lý GPA, tiến độ học tập và kế hoạch học kỳ cho sinh viên HCMUS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
