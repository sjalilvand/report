// وضعیت نشست جاری — کاربر واردشده و مجوزهایش

import { NextRequest } from 'next/server'
import { ok } from '@/lib/server'
import { db } from '@/lib/db'
import { getSessionUser, ROLE_LABELS, can, Role } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return ok({ user: null })
  const role = user.role as Role
  // وضعیت MFA و SSO برای نمایش امنیت حساب — بخش ۲۹ سند
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true, ssoSubject: true },
  })
  return ok({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role,
      roleLabel: ROLE_LABELS[role],
      mfaEnabled: row?.mfaEnabled ?? false,
      hasSso: !!row?.ssoSubject,
    },
  })
}
