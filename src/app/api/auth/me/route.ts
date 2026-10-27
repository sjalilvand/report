// وضعیت نشست جاری — کاربر واردشده و مجوزهایش

import { NextRequest } from 'next/server'
import { ok } from '@/lib/server'
import { getSessionUser, ROLE_LABELS, can, Role } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return ok({ user: null })
  const role = user.role as Role
  return ok({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role,
      roleLabel: ROLE_LABELS[role],
    },
  })
}
