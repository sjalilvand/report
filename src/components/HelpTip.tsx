'use client'

// تولتیپ راهنما — درج راهنمای کوتاه روی هر دکمه و اقدام (بخش ۲۲ سند: تجربه کاربری فارسی و راست‌به‌چپ)

import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/** هر المان فرزند را با تولتیپ توضیحی می‌پوشاند — برای دکمه‌ها و اقدام‌ها */
export function Tip({
  label,
  children,
  side = 'top',
}: {
  label: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-72 text-xs leading-5">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** آیکون علامت سؤال با تولتیپ — برای کنار عنوان‌ها و فیلدهای مبهم */
export function HelpTip({ text, side = 'top' }: { text: string; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tip label={text} side={side}>
      <button type="button" aria-label="راهنما" className="inline-flex text-muted-foreground/70 hover:text-primary transition-colors cursor-help">
        <HelpCircle className="size-3.5" />
      </button>
    </Tip>
  )
}
