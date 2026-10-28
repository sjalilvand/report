import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // distDir قابل تغییر برای اجرای موازی دو نمونه (آزمون خودکار) — پیش‌فرض .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // کتابخانه‌های بومی/سنگین سمت سرور خارج از باندلر — پایداری Turbopack
  serverExternalPackages: ["pptxgenjs", "@react-pdf/renderer", "nodemailer", "xlsx"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // دسترسی از شبکه محلی (LAN) — بدون این، Next.js 16 منابع dev و سوکت HMR را
  // برای درخواست‌های خارج از localhost مسدود می‌کند (خطای ERR_INVALID_HTTP_RESPONSE
  // و گیر کردن صفحه روی «در حال بررسی نشست…»).
  // اگر IP سرور تغییر کرد، IP جدید را به این فهرست اضافه کنید.
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.100.5"],
};

export default nextConfig;
