module.exports = [
"[project]/src/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// نقطه ورود سرویس‌های پس‌زمینه — Next.js هنگام شروع سرور register() را فراخوانی می‌کند
// فقط در رانتایم Node.js فعال می‌شود:
//   ۱) زمان‌بند خودکار ارزیابی هشدارها + همگام‌سازی منابع خارجی (بخش‌های ۲۶.۲ و ۳۱)
//   ۲) موتور صف پردازش خروجی با بازیابی کارهای یتیم (بخش ۳۰.۲)
__turbopack_context__.s([
    "register",
    ()=>register
]);
async function register() {
    if ("TURBOPACK compile-time truthy", 1) {
        const { startAlertScheduler } = await __turbopack_context__.A("[project]/src/lib/scheduler.ts [instrumentation] (ecmascript, async loader)");
        startAlertScheduler();
        const { startJobQueue } = await __turbopack_context__.A("[project]/src/lib/jobs.ts [instrumentation] (ecmascript, async loader)");
        startJobQueue();
    }
}
}),
];

//# sourceMappingURL=src_instrumentation_ts_18ea1a8f._.js.map