// وضعیت ورود یکپارچه سازمانی — عمومی (برای نمایش دکمه «ورود سازمانی» در صفحه ورود)

import { NextRequest } from 'next/server'
import { ok } from '@/lib/server'
import { errorResponse } from '@/lib/auth'
import { resolveSsoConfig } from '@/lib/sso'

export async function GET(_req: NextRequest) {
  try {
    const cfg = await resolveSsoConfig()
    return ok({
      enabled: cfg !== null,
      autoProvision: cfg?.autoProvision ?? false,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
