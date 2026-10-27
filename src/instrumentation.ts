// نقطه ورود سرویس‌های پس‌زمینه — Next.js هنگام شروع سرور register() را فراخوانی می‌کند
// فقط در رانتایم Node.js فعال می‌شود:
//   ۱) زمان‌بند خودکار ارزیابی هشدارها + همگام‌سازی منابع خارجی (بخش‌های ۲۶.۲ و ۳۱)
//   ۲) موتور صف پردازش خروجی با بازیابی کارهای یتیم (بخش ۳۰.۲)

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAlertScheduler } = await import('./lib/scheduler')
    startAlertScheduler()
    const { startJobQueue } = await import('./lib/jobs')
    startJobQueue()
  }
}
