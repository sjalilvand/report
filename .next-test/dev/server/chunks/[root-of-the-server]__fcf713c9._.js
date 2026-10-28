module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: [
        'query'
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[project]/src/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "ROLE_LABELS",
    ()=>ROLE_LABELS,
    "SESSION_COOKIE",
    ()=>SESSION_COOKIE,
    "SESSION_TTL_MS",
    ()=>SESSION_TTL_MS,
    "applyRowRules",
    ()=>applyRowRules,
    "can",
    ()=>can,
    "createSession",
    ()=>createSession,
    "destroySession",
    ()=>destroySession,
    "errorResponse",
    ()=>errorResponse,
    "getSessionUser",
    ()=>getSessionUser,
    "hashPassword",
    ()=>hashPassword,
    "maskFieldsMeta",
    ()=>maskFieldsMeta,
    "maskRecords",
    ()=>maskRecords,
    "maskValue",
    ()=>maskValue,
    "parseRowRules",
    ()=>parseRowRules,
    "requirePerm",
    ()=>requirePerm,
    "requireUser",
    ()=>requireUser,
    "seesSensitive",
    ()=>seesSensitive,
    "sessionCookie",
    ()=>sessionCookie,
    "verifyPassword",
    ()=>verifyPassword
]);
// احراز هویت و کنترل دسترسی مبتنی بر نقش — بخش ۵ و ۲۹ سند
// هش رمز عبور با scrypt، نشست با کوکی httpOnly، ماتریس مجوز نقش‌ها
// ماسک‌کردن اطلاعات حساس و قواعد دسترسی سطح سطر
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
;
;
const SESSION_COOKIE = 'data_platform_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // ۱۲ ساعت
;
const ROLE_LABELS = {
    admin: 'مدیر سامانه',
    steward: 'مدیر داده',
    analyst: 'تحلیلگر و طراح گزارش',
    viewer: 'مشاهده‌کننده',
    auditor: 'ناظر / حسابرس'
};
const ROLE_PERMISSIONS = {
    admin: [
        'project.create',
        'project.edit',
        'file.upload',
        'file.delete',
        'dataset.create',
        'dataset.edit',
        'relation.edit',
        'report.create',
        'report.submit',
        'report.approve',
        'report.publish',
        'report.delete',
        'export.run',
        'data.view',
        'user.manage',
        'settings.manage',
        'audit.view',
        'alert.manage'
    ],
    steward: [
        'file.upload',
        'file.delete',
        'dataset.create',
        'dataset.edit',
        'relation.edit',
        'report.create',
        'report.submit',
        'report.approve',
        'export.run',
        'data.view',
        'alert.manage'
    ],
    analyst: [
        'dataset.create',
        'dataset.edit',
        'relation.edit',
        'report.create',
        'report.submit',
        'export.run',
        'data.view'
    ],
    viewer: [
        'data.view'
    ],
    auditor: [
        'data.view',
        'audit.view',
        'export.run'
    ]
};
function can(role, perm) {
    const perms = ROLE_PERMISSIONS[role];
    return perms?.includes(perm) ?? false;
}
function seesSensitive(role) {
    return role === 'admin' || role === 'steward' || role === 'auditor';
}
function hashPassword(password) {
    const salt = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(16).toString('hex');
    const hash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["scryptSync"])(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const candidate = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["scryptSync"])(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(candidate, expected);
}
async function createSession(userId, ip, userAgent) {
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('hex');
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.create({
        data: {
            id: token,
            userId,
            ip,
            userAgent,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS)
        }
    });
    return token;
}
async function destroySession(token) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.deleteMany({
        where: {
            id: token
        }
    });
}
async function getSessionUser(req) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.findUnique({
        where: {
            id: token
        },
        include: {
            user: true
        }
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.deleteMany({
            where: {
                id: token
            }
        }).catch(()=>undefined);
        return null;
    }
    if (!session.user.active) return null;
    return {
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
        role: session.user.role,
        rowRules: parseRowRules(session.user.rowRules)
    };
}
function parseRowRules(raw) {
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch  {
        return [];
    }
}
function applyRowRules(records, rules, datasetId) {
    const mine = rules.filter((r)=>r.datasetId === datasetId);
    if (mine.length === 0) return records;
    return records.filter((r)=>mine.every((rule)=>{
            const v = r[rule.fieldId];
            const s = v === null || v === undefined ? '' : String(v).trim();
            switch(rule.op){
                case 'eq':
                    return s === String(rule.value ?? '');
                case 'neq':
                    return s !== String(rule.value ?? '');
                case 'in':
                    return (rule.values ?? []).map(String).includes(s);
                case 'contains':
                    return s.includes(String(rule.value ?? ''));
                default:
                    return true;
            }
        }));
}
function maskValue(v) {
    const s = v === null || v === undefined ? '' : String(v);
    if (s === '') return '';
    if (/@/.test(s)) {
        // ایمیل: حفظ کاربر و دامنه ابتدایی
        const [user, domain] = s.split('@');
        const head = user.slice(0, 2);
        return `${head}${'•'.repeat(Math.max(2, user.length - 2))}@${domain ?? '***'}`;
    }
    const head = s.slice(0, Math.min(2, s.length));
    return `${head}${'•'.repeat(Math.max(3, Math.min(10, s.length - 2)))}`;
}
function maskRecords(records, fields, role) {
    if (seesSensitive(role)) return records;
    const sensitive = fields.filter((f)=>f.sensitivity === 'confidential').map((f)=>f.id);
    if (sensitive.length === 0) return records;
    return records.map((r)=>{
        const out = {
            ...r
        };
        for (const id of sensitive){
            if (out[id] !== null && out[id] !== undefined && String(out[id]) !== '') out[id] = maskValue(out[id]);
        }
        return out;
    });
}
function maskFieldsMeta(fields, role) {
    if (seesSensitive(role)) return fields;
    return fields.map((f)=>f.sensitivity === 'confidential' ? {
            ...f,
            description: f.description ?? 'مقدارهای این ستون برای نقش شما ماسک شده‌اند (بخش ۲۹ سند)'
        } : f);
}
class ApiError extends Error {
    status;
    constructor(message, status = 403){
        super(message);
        this.status = status;
    }
}
async function requireUser(req) {
    const user = await getSessionUser(req);
    if (!user) throw new ApiError('برای ادامه باید وارد سامانه شوید (بخش ۲۹ سند: احراز هویت امن).', 401);
    return user;
}
async function requirePerm(req, perm) {
    const user = await requireUser(req);
    if (!can(user.role, perm)) {
        throw new ApiError(`نقش «${ROLE_LABELS[user.role]}» مجوز این عملیات را ندارد (کنترل دسترسی مبتنی بر نقش — بخش ۲۹ سند).`, 403);
    }
    return user;
}
function errorResponse(e) {
    if (e instanceof ApiError) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: e.message
    }, {
        status: e.status
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: e instanceof Error ? e.message : 'خطای داخلی سرور'
    }, {
        status: 500
    });
}
function sessionCookie(token) {
    return {
        name: SESSION_COOKIE,
        value: token,
        options: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            path: '/',
            maxAge: SESSION_TTL_MS / 1000
        }
    };
}
}),
"[project]/src/app/api/auth/logout/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
// خروج از سامانه و ابطال نشست — بخش ۲۹ سند (ابطال دسترسی)
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
;
;
async function POST(req) {
    const token = req.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_COOKIE"])?.value;
    if (token) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["destroySession"])(token).catch(()=>undefined);
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: true
    });
    res.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_COOKIE"], '', {
        httpOnly: true,
        path: '/',
        maxAge: 0
    });
    return res;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__fcf713c9._.js.map