'use client'

// راهنمای هر بخش — کارت جمع‌شو «گام به گام» بالای هر تب تا هر کاربری بتواند با سامانه کار کند

import { ChevronDown, Lightbulb, Compass } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface GuideStep {
  title: string
  desc?: string
}

/**
 * کارت راهنمای بخش: شماره‌گذاری گام‌ها + نکته طلایی
 * steps: گام‌های ترتیبی این بخش | tip: نکته مهم | defaultOpen: باز بودن پیش‌فرض
 */
export function GuideCard({
  steps,
  tip,
  title = 'راهنمای این بخش — گام به گام',
  defaultOpen = false,
}: {
  steps: GuideStep[]
  tip?: string
  title?: string
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="rounded-xl border border-primary/25 bg-gradient-to-l from-primary/[0.07] via-primary/[0.03] to-transparent overflow-hidden">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-2.5 text-right cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Compass className="size-4" />
            {title}
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1">
            <ol className="space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground num-fa">
                    {i + 1}
                  </span>
                  <span className="text-xs leading-5">
                    <b className="font-semibold">{s.title}</b>
                    {s.desc ? <span className="text-muted-foreground"> — {s.desc}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
            {tip ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 px-3 py-2">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] leading-5 text-amber-800 dark:text-amber-300">{tip}</p>
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
