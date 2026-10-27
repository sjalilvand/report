// نقطه ورود سرویس‌های پس‌زمینه — Next.js هنگام شروع سرور register() را فراخوانی می‌کند
// زمان‌بند خودکار ارزیابی هشدارها (بخش ۲۶.۲) فقط در رانتایم Node.js فعال می‌شود

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAlertScheduler } = await import('./lib/scheduler')
    startAlertScheduler()
  }
}
