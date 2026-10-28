// توضیح فرمول و خطا — بخش ۲۵ سند
// «توضیح فرمول و خطا» — قواعد محلی برای خطاهای رایج + غنی‌سازی با مدل زبانی (فقط متن فرمول؛ بدون رکورد)

import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { llmChat } from '@/lib/ai/llm'

interface LocalRule {
  re: RegExp
  title: string
  explanation: string
  suggestion: string
}

// قواعد محلی خطاهای رایج — بدون سرویس بیرونی
const LOCAL_RULES: LocalRule[] = [
  {
    re: /تقسیم\s*بر\s*صفر|division\s*by\s*zero|\/\s*0/i,
    title: 'تقسیم بر صفر',
    explanation: 'مخرج فرمول در برخی رکوردها صفر است؛ نتیجه چنین تقسیمی نامعین می‌شود.',
    suggestion: 'از تابع نسبت_ایمن(صورت؛ مخرج) استفاده کنید که مخرج صفر را مدیریت می‌کند (بخش ۱۷ سند).',
  },
  {
    re: /ستون\s+ناشناخته|unknown\s+(column|field)|فیلد\s+یافت\s+نشد/i,
    title: 'ستون ناشناخته',
    explanation: 'فرمول به ستونی ارجاع می‌دهد که در مدل داده وجود ندارد یا نامش تغییر کرده است.',
    suggestion: 'نام ستون‌ها را از فرهنگ داده یا برگه «مدل» بررسی و فرمول را اصلاح کنید.',
  },
  {
    re: /نوع\s+نامعتبر|type\s+mismatch|ناهمخوان/i,
    title: 'ناهمخوانی نوع داده',
    explanation: 'عملیات روی ستونی انجام می‌شود که نوع آن با عملیات سازگار نیست (مثلاً جمع روی متن).',
    suggestion: 'نوع ستون را در برگه ستون‌ها اصلاح کنید یا از تبدیل نوع در پاک‌سازی استفاده کنید.',
  },
  {
    re: /میانگین.*درصد|درصد.*میانگین/,
    title: 'میانگین ساده درصدها',
    explanation: 'میانگین ساده مقادیر درصدی در سطح گروه‌ها جمع‌پذیر نیست و نتیجه گمراه‌کننده می‌شود.',
    suggestion: 'میانگین وزنی با وزن مناسب (مثلاً مخرج واقعی نسبت) محاسبه کنید (بخش ۱۱.۴ سند).',
  },
  {
    re: /بازگشتی|recursion|تودرتو/,
    title: 'فراخوانی تودرتو',
    explanation: 'فرمول‌ها نمی‌توانند یکدیگر را فراخوانی کنند؛ ساختار فرمول باید تخت باشد.',
    suggestion: 'فرمول‌های میانی را به فیلد مشتق‌شده تبدیل کنید و از آن در فرمول بعدی استفاده کنید.',
  },
  {
    re: /حلق|دور|loop/i,
    title: 'حلقه در ارجاع',
    explanation: 'فرمول به خودش یا به زنجیره‌ای که به خودش برمی‌گردد ارجاع می‌دهد.',
    suggestion: 'ارجاع حلقوی را بشکنید؛ هر فیلد مشتق‌شده فقط به فیلدهای پایه وابسته باشد.',
  },
  {
    re: /جمع‌پذیر|نیمه‌جمع|غیرجمع/,
    title: 'جمع‌پذیری شاخص',
    explanation: 'برخی شاخص‌ها (میانگین، میانه، موجودی) در سطح گروه‌ها جمع‌پذیر نیستند و جمع‌کردنشان خطای محاسباتی است.',
    suggestion: 'قاعده تجمیع درست (بخش ۱۱.۴: جمع‌پذیر/نیمه‌جمع‌پذیر/غیرجمع‌پذیر) را در مدل ستون تنظیم کنید.',
  },
]

export async function POST(req: NextRequest) {
  try {
    await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const formula = String(body.formula ?? '').trim()
    const errorText = String(body.error ?? '').trim()
    const context = String(body.context ?? '').trim()
    if (!formula && !errorText) return fail('فرمول یا متن خطا را وارد کنید.', 400)
    if (formula.length > 2000 || errorText.length > 2000) return fail('متن ورودی بیش از حد بلند است.', 400)

    // قواعد محلی
    const haystack = `${formula} ${errorText}`
    const localHits = LOCAL_RULES.filter(r => r.re.test(haystack))

    // غنی‌سازی با مدل زبانی — فقط متن فرمول/خطا (بدون داده رکورد) → نیازمند aiEnabled، نه مجوز اشتراک داده
    let llmText: string | null = null
    let llmNote: string | null = null
    const res = await llmChat(
      'توضیح‌دهنده فرمول و خطای سامانه گزارش‌سازی هستی. فرمول یا خطای ارائه‌شده را در حداکثر ۵ سطر فارسی توضیح بده: ' +
      '۱) فرمول/خطا چه می‌کند یا چه می‌گوید ۲) منشا احتمالی ۳) پیشنهاد اصلاح. از اعداد یا ستون‌هایی که در ورودی نیست استفاده نکن.',
      { formula, error: errorText, context: context || undefined },
      { requireDataSharing: false },
    )
    if (res.ok) llmText = res.text
    else llmNote = res.unavailableReason ?? null

    return ok({
      formula, error: errorText,
      localRules: localHits.map(r => ({ title: r.title, explanation: r.explanation, suggestion: r.suggestion })),
      llmText,
      llmNote,
      source: 'قواعد محلی سامانه' + (llmText ? ' + مدل زبانی' : ''),
    })
  } catch (e) {
    return errorResponse(e)
  }
}
