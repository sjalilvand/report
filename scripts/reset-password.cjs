#!/usr/bin/env node
// بازنشانی گذرواژه کاربران — اجرا در پوشه پروژه:
//   node scripts/reset-password.mjs                        ← فهرست کاربران + بازنشانی مدیر نخست به گذرواژه پیش‌فرض
//   node scripts/reset-password.mjs --list                 ← فقط فهرست کاربران
//   node scripts/reset-password.mjs admin MyNewPass123     ← بازنشانی گذرواژه کاربر admin
//   node scripts/reset-password.mjs --create admin "نام مدیر" MyNewPass123  ← ساخت مدیر جدید اگر فراموش شده
// هش با همان الگوریتم سامانه (scrypt با نمک تصادفی، قالب salt:hash) ساخته می‌شود — بخش ۲۹ سند.

const path = require('path')
const fs = require('fs')
const { randomBytes, scryptSync } = require('crypto')

// Prisma Client از node_modules همان پروژه بارگذاری می‌شود
const prismaDir = path.join(__dirname, '..')
const PrismaClient = require(path.join(prismaDir, 'node_modules', '@prisma', 'client')).PrismaClient

const DEFAULT_ADMIN_PASSWORD = 'Admin@1404'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  const db = new PrismaClient({
    datasources: { db: { url: `file:${path.join(prismaDir, 'db', 'custom.db')}` } },
  })
  const args = process.argv.slice(2)

  try {
    if (args[0] === '--list') {
      const users = await db.user.findMany({ select: { username: true, name: true, role: true, active: true }, orderBy: { createdAt: 'asc' } })
      if (users.length === 0) {
        console.log('هیچ کاربری در پایگاه‌داده وجود ندارد. با --create نخستین مدیر را بسازید.')
      } else {
        console.log('کاربران سامانه:')
        for (const u of users) {
          console.log(`  - ${u.username} | ${u.name} | نقش: ${u.role} | ${u.active ? 'فعال' : 'غیرفعال'}`)
        }
      }
      return
    }

    if (args[0] === '--create') {
      const username = (args[1] || '').trim().toLowerCase()
      const name = (args[2] || 'مدیر سامانه').trim()
      const password = args[3] || DEFAULT_ADMIN_PASSWORD
      if (!username || password.length < 6) {
        console.error('خطا: نام کاربری الزامی و گذرواژه باید حداقل ۶ نویسه باشد. نمونه: node scripts/reset-password.mjs --create admin "مدیر سامانه" MyPass123')
        process.exitCode = 1
        return
      }
      const exists = await db.user.findUnique({ where: { username } })
      if (exists) {
        console.log(`کاربر «${username}» از قبل وجود دارد؛ گذرواژه او بازنشانی می‌شود.`)
        await db.user.update({ where: { username }, data: { passwordHash: hashPassword(password), active: true, role: 'admin' } })
      } else {
        await db.user.create({ data: { username, name, passwordHash: hashPassword(password), role: 'admin' } })
        console.log(`مدیر جدید «${username}» ساخته شد.`)
      }
      // ابطال همه نشست‌های کاربر پس از تغییر گذرواژه — بخش ۲۹ سند
      const u = await db.user.findUnique({ where: { username } })
      if (u) await db.session.deleteMany({ where: { userId: u.id } })
      console.log(`✔ گذرواژه با موفقیت تنظیم شد.`)
      console.log(`  نام کاربری: ${username}`)
      console.log(`  گذرواژه جدید: ${password}`)
      console.log('  (نشست‌های قبلی این کاربر باطل شده‌اند؛ دوباره وارد شوید.)')
      return
    }

    const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
    if (users.length === 0) {
      console.log('هیچ کاربری وجود ندارد. برای ساخت مدیر: node scripts/reset-password.mjs --create admin "نام شما" گذرواژه')
      return
    }

    const username = (args[0] || '').trim().toLowerCase()
    const newPassword = args[1] || DEFAULT_ADMIN_PASSWORD
    let target = username ? users.find(u => u.username === username) : users.find(u => u.role === 'admin') || users[0]
    if (username && !target) {
      console.error(`خطا: کاربر «${username}» یافت نشد. فهرست کاربران با --list قابل مشاهده است.`)
      process.exitCode = 1
      return
    }
    if (newPassword.length < 6) {
      console.error('خطا: گذرواژه باید حداقل ۶ نویسه باشد.')
      process.exitCode = 1
      return
    }
    await db.user.update({ where: { id: target.id }, data: { passwordHash: hashPassword(newPassword), active: true } })
    await db.session.deleteMany({ where: { userId: target.id } })
    console.log(`✔ گذرواژه کاربر «${target.username}» (${target.name}) با موفقیت بازنشانی شد.`)
    console.log(`  نام کاربری: ${target.username}`)
    console.log(`  گذرواژه جدید: ${newPassword}`)
    console.log('  (نشست‌های قبلی باطل شدند؛ حساب نیز در صورت غیرفعالی، فعال شد.)')
    if (!args[1]) {
      console.log('  ⚠ این گذرواژه پیش‌فرض است؛ پس از ورود از بخش «مدیریت کاربران» یا «پروفایل» آن را تغییر دهید.')
    }
  } finally {
    await db.$disconnect()
  }
}

main().catch(e => {
  console.error('خطا:', e instanceof Error ? e.message : e)
  console.error('نکته: ابتدا «npm install» یا «npm run db:push» را در پوشه پروژه اجرا کرده باشید و برنامه در حال اجرا نباشد.')
  process.exitCode = 1
})
