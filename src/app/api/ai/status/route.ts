// وضعیت دستیار هوشمند — بخش ۲۵ سند
// موتور محلی همیشه فعال است؛ سرویس مدل زبانی تابع سیاست مدیر سامانه

import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { probeLlm, getLlmPolicy } from '@/lib/ai/llm'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const [probe, policy] = await Promise.all([probeLlm(), getLlmPolicy()])
    return ok({
      localEngine: true,
      llmConfigured: probe.available,
      llmReason: probe.reason,
      policy,
      engine: {
        features: [
          'پیشنهاد نوع داده و برچسب ستون',
          'پیشنهاد کلید یکتا',
          'پیشنهاد روابط',
          'پیشنهاد قواعد پاک‌سازی',
          'پیشنهاد نمودار مناسب',
          'پیشنهاد شاخص‌های قابل محاسبه',
          'پرسش به زبان طبیعی از داده',
          'تولید پیش‌نویس گزارش توصیفی',
          'توضیح فرمول و خطا',
          'یافتن الگوها و نقاط غیرعادی',
        ],
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
