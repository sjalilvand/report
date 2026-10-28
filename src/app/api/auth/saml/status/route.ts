// وضعیت ورود سازمانی SAML — عمومی (برای نمایش دکمه ورود در صفحه ورود)

import { NextRequest } from 'next/server'
import { ok } from '@/lib/server'
import { errorResponse } from '@/lib/auth'
import { resolveSamlConfig } from '@/lib/saml'

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') ?? req.nextUrl.origin
    const cfg = await resolveSamlConfig(origin)
    return ok({ enabled: cfg !== null })
  } catch (e) {
    return errorResponse(e)
  }
}
