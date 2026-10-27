import type { Metadata } from "next";
import "vazirmatn/Vazirmatn-font-face.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی",
  description:
    "سامانه تحت وب گزارش‌ساز و تحلیل داده‌های اکسل: دریافت منعطف داده، آماده‌سازی قابل ردیابی، مدل‌سازی صحیح، گزارش‌سازی بدون کدنویسی و انتشار امن",
  keywords: ["گزارش‌ساز", "اکسل", "تحلیل داده", "داشبورد", "پروفایل داده", "تاریخ شمسی"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
