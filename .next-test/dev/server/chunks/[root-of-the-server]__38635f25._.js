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
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/digits.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "groupThousands",
    ()=>groupThousands,
    "hasPersianOrArabicDigits",
    ()=>hasPersianOrArabicDigits,
    "numberToPersianWords",
    ()=>numberToPersianWords,
    "toLatinDigits",
    ()=>toLatinDigits,
    "toPersianDigits",
    ()=>toPersianDigits
]);
// مدیریت ارقام فارسی/عربی/لاتین — بخش ۱۰.۱ سند
// تبدیل ارقام فارسی، عربی و لاتین به یکدیگر
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const LATIN_DIGITS = '0123456789';
function toLatinDigits(input) {
    if (!input) return input;
    let out = '';
    for (const ch of String(input)){
        const pi = PERSIAN_DIGITS.indexOf(ch);
        if (pi >= 0) {
            out += LATIN_DIGITS[pi];
            continue;
        }
        const ai = ARABIC_DIGITS.indexOf(ch);
        if (ai >= 0) {
            out += LATIN_DIGITS[ai];
            continue;
        }
        out += ch;
    }
    return out;
}
function toPersianDigits(input) {
    if (input === null || input === undefined) return input;
    let out = '';
    for (const ch of String(input)){
        const li = LATIN_DIGITS.indexOf(ch);
        out += li >= 0 ? PERSIAN_DIGITS[li] : ch;
    }
    return out;
}
function hasPersianOrArabicDigits(input) {
    for (const ch of String(input)){
        if (PERSIAN_DIGITS.includes(ch) || ARABIC_DIGITS.includes(ch)) return true;
    }
    return false;
}
function groupThousands(s, separator = '،') {
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
}
// تبدیل عدد به حروف فارسی — بخش ۱۴.۳ (تبدیل مبلغ به حروف فارسی)
const ONES = [
    '',
    'یک',
    'دو',
    'سه',
    'چهار',
    'پنج',
    'شش',
    'هفت',
    'هشت',
    'نه'
];
const TEENS = [
    'ده',
    'یازده',
    'دوازده',
    'سیزده',
    'چهارده',
    'پانزده',
    'شانزده',
    'هفده',
    'هجده',
    'نوزده'
];
const TENS = [
    '',
    '',
    'بیست',
    'سی',
    'چهل',
    'پنجاه',
    'شصت',
    'هفتاد',
    'هشتاد',
    'نود'
];
const HUNDREDS = [
    '',
    'صد',
    'دویست',
    'سیصد',
    'چهارصد',
    'پانصد',
    'ششصد',
    'هفتصد',
    'هشتصد',
    'نهصد'
];
const SCALES = [
    '',
    ' هزار',
    ' میلیون',
    ' میلیارد',
    ' هزار میلیارد',
    ' میلیون میلیارد'
];
function threeDigitToWords(n) {
    const parts = [];
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (h > 0) parts.push(HUNDREDS[h]);
    if (rest >= 10 && rest < 20) {
        parts.push(TEENS[rest - 10]);
    } else {
        const t = Math.floor(rest / 10);
        const o = rest % 10;
        if (t > 0) parts.push(TENS[t]);
        if (o > 0) parts.push(ONES[o]);
    }
    return parts.join(' و ');
}
function numberToPersianWords(input) {
    let s = toLatinDigits(String(input)).replace(/[,\u060C]/g, '').trim();
    if (!s || !/^-?\d+$/.test(s)) return '';
    const neg = s.startsWith('-');
    s = s.replace('-', '');
    let n = BigInt(s);
    if (n === 0n) return 'صفر';
    const chunks = [];
    let scaleIdx = 0;
    const big1000 = 1000n;
    while(n > 0n){
        const chunk = Number(n % big1000);
        if (chunk > 0) {
            chunks.unshift(threeDigitToWords(chunk) + (SCALES[scaleIdx] ?? ''));
        }
        n = n / big1000;
        scaleIdx++;
    }
    return (neg ? 'منفی ' : '') + chunks.join(' و ');
}
}),
"[project]/src/lib/jalali.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FA_MONTHS",
    ()=>FA_MONTHS,
    "JALALI_SEASONS",
    ()=>JALALI_SEASONS,
    "JALALI_SEASON_MONTHS",
    ()=>JALALI_SEASON_MONTHS,
    "WEEKDAYS_FA",
    ()=>WEEKDAYS_FA,
    "excelSerialToDate",
    ()=>excelSerialToDate,
    "extractDateParts",
    ()=>extractDateParts,
    "parseDateValue",
    ()=>parseDateValue
]);
// مدیریت تاریخ، تقویم و دوره‌های زمانی — بخش ۱۵ سند
// پشتیبانی از تاریخ شمسی و میلادی، استانداردسازی و استخراج فیلدهای زمانی
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jalaali-js/dist/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
;
;
const FA_MONTHS = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند'
];
const JALALI_SEASONS = [
    'بهار',
    'تابستان',
    'پاییز',
    'زمستان'
] // فصل — بخش ۱۵.۲
;
const JALALI_SEASON_MONTHS = {
    'بهار': [
        'فروردین',
        'اردیبهشت',
        'خرداد'
    ],
    'تابستان': [
        'تیر',
        'مرداد',
        'شهریور'
    ],
    'پاییز': [
        'مهر',
        'آبان',
        'آذر'
    ],
    'زمستان': [
        'دی',
        'بهمن',
        'اسفند'
    ]
};
const WEEKDAYS_FA = [
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنجشنبه',
    'جمعه'
];
function parseDateValue(raw, calendar = 'auto') {
    if (raw === null || raw === undefined || raw === '') return {
        ok: false,
        kind: 'invalid',
        reason: 'خالی'
    };
    // Date واقعی (از اکسل)
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        const g = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toJalaali"])(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
        return {
            ok: true,
            kind: 'gregorian',
            jy: g.jy,
            jm: g.jm,
            jd: g.jd,
            iso: raw.toISOString()
        };
    }
    // عدد سریالی اکسل — بخش ۱۵.۱ (تشخیص تاریخ‌های سریالی اکسل)
    if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
        const d = excelSerialToDate(raw);
        const g = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toJalaali"])(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return {
            ok: true,
            kind: 'gregorian',
            jy: g.jy,
            jm: g.jm,
            jd: g.jd,
            iso: d.toISOString().slice(0, 10)
        };
    }
    let s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(raw)).trim().replace(/[.\-]/g, '/').replace(/\/+/g, '/');
    // قالب ISO میلادی
    const isoMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})([T ].*)?$/);
    if (isoMatch) {
        const y = +isoMatch[1], m = +isoMatch[2], d = +isoMatch[3];
        if (calendar === 'jalali' || calendar === 'auto' && y >= 1200 && y <= 1500) {
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isValidJalaaliDate"])(y, m, d)) {
                const g = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toGregorian"])(y, m, d);
                return {
                    ok: true,
                    kind: 'jalali',
                    jy: y,
                    jm: m,
                    jd: d,
                    iso: `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`
                };
            }
            return {
                ok: false,
                kind: 'invalid',
                reason: 'تاریخ شمسی نامعتبر'
            };
        }
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2200) {
            const g = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toJalaali"])(y, m, d);
            return {
                ok: true,
                kind: 'gregorian',
                jy: g.jy,
                jm: g.jm,
                jd: g.jd,
                iso: `${y}-${pad(m)}-${pad(d)}`
            };
        }
        return {
            ok: false,
            kind: 'invalid',
            reason: 'خارج از محدوده'
        };
    }
    return {
        ok: false,
        kind: 'invalid',
        reason: 'قالب تاریخ ناشناخته'
    };
}
function pad(n) {
    return String(n).padStart(2, '0');
}
function excelSerialToDate(serial) {
    // مبنای سریال اکسل: 1899-12-30
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function extractDateParts(raw) {
    const p = parseDateValue(raw);
    if (!p.ok) return null;
    const parts = {
        jy: p.jy,
        jm: p.jm,
        monthName: FA_MONTHS[(p.jm ?? 1) - 1],
        jd: p.jd,
        season: JALALI_SEASONS[Math.floor(((p.jm ?? 1) - 1) / 3)],
        quarter: Math.floor(((p.jm ?? 1) - 1) / 3) + 1,
        halfYear: (p.jm ?? 1) <= 6 ? 'نیم‌سال اول' : 'نیم‌سال دوم',
        // ابتدا و انتهای ماه — بخش ۱۵.۲
        monthStart: `${p.jy}/${pad(p.jm)}/01`,
        monthEnd: `${p.jy}/${pad(p.jm)}/${pad((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jalaaliMonthLength"])(p.jy, p.jm))}`
    };
    // روز هفته
    if (p.iso) {
        const d = new Date(p.iso + 'T00:00:00Z');
        // شنبه = 6 در getUTCDay؛ تبدیل: شنبه اول هفته شمسی
        const wd = d.getUTCDay() // 0=Sunday ... 6=Saturday
        ;
        parts.weekday = WEEKDAYS_FA[(wd + 1) % 7];
        parts.weekOfYear = Math.ceil(dayOfYearJalali(p.jy, p.jm, p.jd) / 7);
        parts.dayOfYear = dayOfYearJalali(p.jy, p.jm, p.jd);
        // دوره متناظر سال قبل — بخش ۱۵.۳
        parts.prevYearSame = `${p.jy - 1}/${pad(p.jm)}/${pad(p.jd)}`;
    }
    return parts;
}
function dayOfYearJalali(jy, jm, jd) {
    let n = jd;
    for(let m = 1; m < jm; m++)n += (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jalaali$2d$js$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jalaaliMonthLength"])(jy, m);
    return n;
}
;
}),
"[project]/src/lib/currency.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// مدیریت مبلغ و واحد پول — بخش ۱۴ سند
// تفکیک سه ویژگی: واحد ورودی، واحد ذخیره‌سازی مبنا، واحد نمایش
// مبنای ذخیره‌سازی: ریال (factor = 1)
__turbopack_context__.s([
    "CURRENCY_UNITS",
    ()=>CURRENCY_UNITS,
    "autoDisplayUnit",
    ()=>autoDisplayUnit,
    "detectUnitFromLabel",
    ()=>detectUnitFromLabel,
    "formatAmount",
    ()=>formatAmount,
    "formatNumber",
    ()=>formatNumber,
    "fromBaseRial",
    ()=>fromBaseRial,
    "getUnit",
    ()=>getUnit,
    "isCurrencyUnit",
    ()=>isCurrencyUnit,
    "safeSumAmounts",
    ()=>safeSumAmounts,
    "toBaseRial",
    ()=>toBaseRial
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
;
const CURRENCY_UNITS = [
    {
        code: 'rial',
        label: 'ریال',
        factor: 1
    },
    {
        code: 'toman',
        label: 'تومان',
        factor: 10
    },
    {
        code: 'k_rial',
        label: 'هزار ریال',
        factor: 1_000
    },
    {
        code: 'm_rial',
        label: 'میلیون ریال',
        factor: 1_000_000
    },
    {
        code: 'b_rial',
        label: 'میلیارد ریال',
        factor: 1_000_000_000
    },
    {
        code: 'k_toman',
        label: 'هزار تومان',
        factor: 10_000
    },
    {
        code: 'm_toman',
        label: 'میلیون تومان',
        factor: 10_000_000
    },
    {
        code: 'b_toman',
        label: 'میلیارد تومان',
        factor: 10_000_000_000
    },
    {
        code: 'hemt',
        label: 'همت (هزار میلیارد تومان)',
        factor: 10_000_000_000_000
    }
];
function getUnit(code) {
    return CURRENCY_UNITS.find((u)=>u.code === code) ?? CURRENCY_UNITS[0];
}
function detectUnitFromLabel(label) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(label)).replace(/[_\-\s]/g, '');
    const norms = [
        [
            /همت|هزارمیلیاردتومان/,
            'hemt'
        ],
        [
            /میلیاردتومان/,
            'b_toman'
        ],
        [
            /میلیونتومان/,
            'm_toman'
        ],
        [
            /هزارتومان/,
            'k_toman'
        ],
        [
            /تومان/,
            'toman'
        ],
        [
            /میلیاردریال/,
            'b_rial'
        ],
        [
            /میلیونریال/,
            'm_rial'
        ],
        [
            /هزارریال/,
            'k_rial'
        ],
        [
            /ریال/,
            'rial'
        ]
    ];
    for (const [re, code] of norms){
        if (re.test(t)) return code;
    }
    return undefined;
}
function toBaseRial(value, fromUnitCode) {
    const u = getUnit(fromUnitCode);
    return value * u.factor;
}
function fromBaseRial(baseValue, toUnitCode) {
    const u = getUnit(toUnitCode);
    return baseValue / u.factor;
}
function autoDisplayUnit(baseValue) {
    const abs = Math.abs(baseValue);
    if (abs >= 10_000_000_000_000) return 'hemt';
    if (abs >= 1_000_000_000_000) return 'b_toman';
    if (abs >= 1_000_000_000) return 'b_rial';
    if (abs >= 10_000_000) return 'm_toman';
    if (abs >= 1_000_000) return 'm_rial';
    if (abs >= 10_000) return 'k_toman';
    if (abs >= 1_000) return 'k_rial';
    return 'toman';
}
function isCurrencyUnit(code) {
    return CURRENCY_UNITS.some((u)=>u.code === code);
}
function formatAmount(baseValue, opts = {}) {
    if (baseValue === null || baseValue === undefined || Number.isNaN(baseValue)) return '—';
    const unitCode = opts.displayUnit || autoDisplayUnit(baseValue);
    const val = fromBaseRial(baseValue, unitCode);
    // گردکردن نمایشی مقدار ذخیره‌شده را تغییر نمی‌دهد — بخش ۱۴.۴
    const decimals = opts.decimals ?? (Number.isInteger(val) ? 0 : Math.abs(val) < 1 ? 3 : 2);
    const neg = val < 0;
    const absVal = Math.abs(val);
    let s = absVal.toFixed(decimals);
    if (decimals > 0) s = s.replace(/\.?0+$/, ''); // حذف صفرهای انتهایی نمایشی (مقدار ذخیره‌شده تغییر نمی‌کند)
    s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["groupThousands"])(s, opts.separator ?? '،');
    if (opts.persianDigits) {
        s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(s);
    }
    if (neg) {
        s = opts.negativeMode === 'paren' ? `(${s})` : `−${s}`;
    }
    if (opts.autoUnitLabel) {
        s += ' ' + getUnit(unitCode).label.replace(' (هزار میلیارد تومان)', '');
    }
    return s;
}
function formatNumber(v, persianDigits = false, decimals = 0) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    let s = Math.abs(v).toFixed(decimals);
    if (decimals > 0) s = s.replace(/\.?0+$/, '');
    s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["groupThousands"])(s);
    if (v < 0) s = '−' + s;
    return persianDigits ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(s) : s;
}
function safeSumAmounts(values) {
    if (values.length === 0) return {
        sum: 0
    };
    const noUnit = values.filter((v)=>!v.unit).length;
    if (noUnit > 0 && values.some((v)=>v.unit)) {
        return {
            sum: null,
            warning: `${noUnit} رکورد فاقد واحد پول مشخص است؛ تجمیع مبلغ‌های دارای واحد نامشخص مجاز نیست (بخش ۱۴.۳ سند).`
        };
    }
    return {
        sum: values.reduce((a, v)=>a + toBaseRial(v.value, v.unit ?? 'rial'), 0)
    };
}
}),
"[project]/src/lib/detect.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// تشخیص نوع داده و نقش تحلیلی — بخش ۸ سند
// تشخیص خودکار «پیشنهاد است نه تصمیم قطعی» — مبنای تأیید مدیر (بخش ۴)
__turbopack_context__.s([
    "checkUniqueness",
    ()=>checkUniqueness,
    "detectColumn",
    ()=>detectColumn,
    "suggestRoles",
    ()=>suggestRoles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jalali$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/jalali.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/currency.ts [app-route] (ecmascript)");
;
;
;
const AMOUNT_KEYWORDS = [
    'مبلغ',
    'بهای',
    'قیمت',
    'ارزش',
    'درآمد',
    'هزینه',
    'اعتبار',
    'بودجه',
    'وصولی',
    'پرداختی',
    'مانده'
];
const DATE_KEYWORDS = [
    'تاریخ',
    'زمان',
    'موعد'
];
const ID_KEYWORDS = [
    'شناسه',
    'کد',
    'شماره',
    'ای‌دی',
    'id',
    'نمبر'
];
const NAME_KEYWORDS = [
    'نام',
    'عنوان',
    'شرح',
    'استان',
    'شهر',
    'واحد',
    'گروه',
    'نوع'
];
function norm(v) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(v ?? '')).trim().replace('٫', '.') // ممیز فارسی/عربی
    ;
}
function isNumeric(s) {
    if (!s) return false;
    const lat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(s).replace('٫', '.');
    return /^-?[\d,.\u060C]+$/.test(lat.replace(/\s/g, '')) && /\d/.test(lat);
}
function toNumber(s) {
    // جداکننده اعشار فارسی/عربی (٫) و ارقام فارسی/عربی — بخش ۱۰.۱
    const clean = norm(s).replace(/[\u060C,]/g, '');
    if (!/^-?\d*\.?\d+$/.test(clean)) return null;
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : null;
}
function detectColumn(values, headerLabel) {
    const nonNull = values.filter((v)=>v !== null && v !== undefined && String(v).trim() !== '');
    const nullCount = values.length - nonNull.length;
    const sample = nonNull.slice(0, 500).map(String);
    if (nonNull.length === 0) {
        return {
            detectedType: 'text',
            confidence: 0.3,
            roleSuggestion: 'attribute',
            invalidIndices: [],
            distinctCount: 0,
            nullCount
        };
    }
    const header = norm(headerLabel).toLowerCase();
    const invalid = [];
    // ۱) بررسی تاریخ
    const dateHits = sample.filter((v)=>{
        const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(v).trim();
        return /^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/.test(s) || typeof values[sample.indexOf(v)] === 'number' && +v > 20000 && +v < 80000;
    }).length;
    const dateRatio = dateHits / sample.length;
    // ۲) بررسی عددی
    const numHits = sample.filter((v)=>isNumeric(v)).length;
    const numRatio = numHits / sample.length;
    // ۳) بررسی منطقی
    const boolVals = new Set([
        'بله',
        'خیر',
        'true',
        'false',
        'دارد',
        'ندارد',
        '0',
        '1',
        '1.0',
        '0.0'
    ]);
    const boolRatio = sample.filter((v)=>boolVals.has(v.trim().toLowerCase()) || boolVals.has(v.trim())).length / sample.length;
    // ۴) شناسه: صفر ابتدایی یا طول یکنواخت بدون معنای عددی — بخش ۸.۱ نکته مهم
    const leadingZero = sample.filter((v)=>/^0\d+$/.test((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(v).trim())).length;
    const allDigits = sample.filter((v)=>/^\d+$/.test((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(v).trim())).length;
    const lengths = new Set(sample.filter((v)=>/^\d+$/.test((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(v).trim())).map((v)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(v).trim().length));
    const idLike = leadingZero > 0 || allDigits === sample.length && lengths.size === 1 && sample[0].length >= 4 ? 1 : 0;
    // تصمیم‌گیری به ترتیب اولویت
    if (dateRatio >= 0.7 || dateRatio > 0 && DATE_KEYWORDS.some((k)=>header.includes(k)) && dateRatio > 0.3) {
        let bad = 0;
        nonNull.forEach((v, i)=>{
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jalali$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDateValue"])(v).ok) {
                invalid.push(i);
                bad++;
            }
        });
        const conf = Math.min(1, dateRatio * 0.7 + (DATE_KEYWORDS.some((k)=>header.includes(k)) ? 0.3 : 0));
        return {
            detectedType: 'date',
            confidence: Math.max(0.55, conf),
            roleSuggestion: 'dimension',
            invalidIndices: invalid,
            distinctCount: new Set(sample).size,
            nullCount
        };
    }
    if (boolRatio === 1 && sample.length > 1 && new Set(sample.map((v)=>v.trim())).size <= 3) {
        return {
            detectedType: 'boolean',
            confidence: 0.85,
            roleSuggestion: 'dimension',
            invalidIndices: [],
            distinctCount: new Set(sample).size,
            nullCount
        };
    }
    if (numRatio >= 0.85) {
        nonNull.forEach((v, i)=>{
            if (toNumber(String(v)) === null) invalid.push(i);
        });
        const nums = sample.map((v)=>toNumber(v)).filter((n)=>n !== null);
        const allInt = nums.every((n)=>Number.isInteger(n));
        const hasDecimal = sample.some((v)=>/[.,]\d{1,}/.test((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(v)));
        // پیشنهاد واحد پول از سرستون — بخش ۱۴
        const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["detectUnitFromLabel"])(headerLabel);
        let type = allInt && !hasDecimal ? 'integer' : 'decimal';
        let role = 'measure';
        if (idLike === 1) {
            // کدهایی با صفر ابتدایی باید شناسه/متن بمانند نه عدد — بخش ۸.۱
            type = 'identifier';
            role = 'identifier';
        } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isCurrencyUnit"])(unit) || AMOUNT_KEYWORDS.some((k)=>header.includes(k))) {
            type = 'amount';
        } else if (header.includes('درصد') || header.includes('نرخ')) {
            type = 'percent';
        } else if (allInt && new Set(nums).size <= Math.max(6, nums.length * 0.05) && !AMOUNT_KEYWORDS.some((k)=>header.includes(k))) {
            type = 'category';
            role = 'dimension'; // کد دسته‌بندی عددی کم‌مقدار
        }
        const conf = numRatio === 1 ? 0.95 : 0.7;
        return {
            detectedType: type,
            confidence: conf,
            roleSuggestion: role,
            unitSuggestion: type === 'amount' ? unit ?? 'rial' : undefined,
            invalidIndices: invalid,
            distinctCount: new Set(sample).size,
            nullCount
        };
    }
    if (idLike === 1 || ID_KEYWORDS.some((k)=>header.includes(k)) && new Set(sample).size / sample.length > 0.9) {
        return {
            detectedType: 'identifier',
            confidence: 0.8,
            roleSuggestion: 'identifier',
            invalidIndices: [],
            distinctCount: new Set(sample).size,
            nullCount
        };
    }
    // متن / دسته‌بندی
    const distinct = new Set(sample).size;
    const catRatio = distinct / sample.length;
    const type = catRatio <= 0.35 || NAME_KEYWORDS.some((k)=>header.includes(k)) ? catRatio <= 0.35 ? 'category' : 'text' : 'text';
    return {
        detectedType: type,
        confidence: catRatio <= 0.35 ? 0.8 : 0.65,
        roleSuggestion: type === 'category' ? 'dimension' : 'attribute',
        invalidIndices: [],
        distinctCount: distinct,
        nullCount
    };
}
function suggestRoles(fields) {
    const out = {};
    for (const f of fields){
        if (f.type === 'amount' || f.type === 'decimal' || f.type === 'integer' || f.type === 'percent') {
            out[f.id] = 'measure';
        } else if (f.type === 'identifier') {
            out[f.id] = 'identifier';
        } else {
            out[f.id] = 'dimension';
        }
    }
    // اطمینان از وجود حداقل یک سنجه؛ در نبود آن، ستون عددی پیشنهاد می‌شود
    if (!Object.values(out).includes('measure')) {
        const numeric = fields.find((f)=>[
                'integer',
                'decimal'
            ].includes(f.type));
        if (numeric) out[numeric.id] = 'measure';
    }
    return out;
}
function checkUniqueness(records, fieldIds) {
    const counts = new Map();
    for (const r of records){
        const key = fieldIds.map((f)=>String(r[f] ?? '')).join('§');
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const dupGroups = [];
    for (const [key, count] of counts){
        if (count > 1) dupGroups.push({
            key: key.split('§').join(' | '),
            count
        });
    }
    return {
        total: records.length,
        distinct: counts.size,
        duplicateGroups: dupGroups.slice(0, 50),
        unique: dupGroups.length === 0
    };
}
}),
"[project]/src/lib/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildFieldMetas",
    ()=>buildFieldMetas,
    "fail",
    ()=>fail,
    "logAudit",
    ()=>logAudit,
    "ok",
    ()=>ok,
    "parseJson",
    ()=>parseJson,
    "rekeyRecords",
    ()=>rekeyRecords
]);
// ابزارهای مشترک سمت سرور
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$detect$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/detect.ts [app-route] (ecmascript)");
;
;
;
function ok(data, init) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data, {
        status: init ?? 200
    });
}
function fail(message, status = 400) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: message
    }, {
        status
    });
}
async function logAudit(projectId, action, detail, actor = 'مدیر سامانه') {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditEvent.create({
        data: {
            projectId,
            action,
            detail,
            actor
        }
    });
}
function parseJson(raw, fallback) {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch  {
        return fallback;
    }
}
function buildFieldMetas(headers, records, colWidths) {
    const metas = headers.map((h, i)=>{
        const values = records.slice(0, 800).map((r)=>r[h]);
        const det = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$detect$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["detectColumn"])(values, h);
        return {
            id: `f${i + 1}_${h.replace(/[\s\u200c()]+/g, '_').replace(/[()٫]/g, '').slice(0, 40)}`,
            sourceName: h,
            label: h,
            type: det.detectedType,
            detectedType: det.detectedType,
            confidence: det.confidence,
            role: det.roleSuggestion,
            unit: det.unitSuggestion,
            unitKind: det.unitSuggestion ? 'currency' : det.detectedType === 'percent' ? 'percent' : undefined,
            format: det.detectedType === 'amount' ? 'currency' : det.detectedType === 'date' ? 'date' : det.detectedType === 'text' ? 'text' : 'number',
            calendar: det.detectedType === 'date' ? 'auto' : undefined,
            aggregation: det.roleSuggestion === 'measure' ? 'sum' : det.detectedType === 'identifier' ? 'countDistinct' : 'count',
            invalidCount: det.invalidIndices.length,
            examples: [
                ...new Set(values.filter((v)=>v !== null && String(v).trim() !== '').map((v)=>String(v)))
            ].slice(0, 3)
        };
    });
    // اطمینان از تفکیک ابعاد و سنجه‌ها — بخش ۱۱ سند
    const roles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$detect$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["suggestRoles"])(metas.map((m)=>({
            id: m.id,
            label: m.label,
            type: m.type,
            distinctCount: undefined
        })));
    for (const m of metas){
        if (roles[m.id]) m.role = roles[m.id];
    }
    return metas;
}
function rekeyRecords(records, fields) {
    const map = new Map(fields.map((f)=>[
            f.sourceName,
            f.id
        ]));
    return records.map((r)=>{
        const out = {};
        for (const [k, v] of Object.entries(r)){
            out[map.get(k) ?? k] = v;
        }
        return out;
    });
}
}),
"[project]/src/lib/query.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// موتور محاسبات و پرس‌وجو — بخش ۱۱، ۱۳ و ۲۰ سند
// تفکیک ابعاد و سنجه‌ها، انواع تجمیع، واحدها و تولید گزارش توصیفی
__turbopack_context__.s([
    "aggregateMeasure",
    ()=>aggregateMeasure,
    "applyFilters",
    ()=>applyFilters,
    "buildDescriptiveReport",
    ()=>buildDescriptiveReport,
    "matchFilter",
    ()=>matchFilter,
    "measureAlias",
    ()=>measureAlias,
    "num",
    ()=>num,
    "runQuery",
    ()=>runQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/currency.ts [app-route] (ecmascript)");
;
;
function num(v) {
    if (v === null || v === undefined) return null;
    // ممیز فارسی/عربی (٫) نیز پشتیبانی می‌شود — بخش ۱۰.۱
    const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(v)).replace(/[٫,\u060C\s]/g, (m)=>m === '٫' ? '.' : '');
    if (s === '' || s === '.') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
}
function keyOf(v) {
    if (v === null || v === undefined) return '—';
    return String(v);
}
function runQuery(records, fields, spec) {
    const warnings = [];
    const fieldById = new Map(fields.map((f)=>[
            f.id,
            f
        ]));
    // فیلترها
    let data = records;
    for (const flt of spec.filters ?? []){
        const f = fieldById.get(flt.fieldId);
        if (!f) {
            warnings.push(`فیلتر برای ستون ناشناخته «${flt.fieldId}» نادیده گرفته شد.`);
            continue;
        }
        data = data.filter((r)=>matchFilter(r[flt.fieldId], flt));
    }
    // جست‌وجوی متنی
    if (spec.searchText?.trim()) {
        const q = spec.searchText.trim();
        data = data.filter((r)=>fields.some((f)=>String(r[f.id] ?? '').includes(q)));
    }
    const scanned = data.length;
    // بدون گروه‌بندی: آمار کل
    if (spec.dimensions.length === 0) {
        const totals = {};
        for (const m of spec.measures){
            const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields);
            totals[alias] = aggregateMeasure(data, m, fields, warnings);
        }
        return {
            rows: [
                totals
            ],
            totals: {},
            rowCount: 1,
            scannedRecords: scanned,
            warnings
        };
    }
    // گروه‌بندی بر اساس ابعاد
    const groups = new Map();
    for (const r of data){
        const key = spec.dimensions.map((d)=>keyOf(r[d])).join('§');
        const arr = groups.get(key);
        if (arr) arr.push(r);
        else groups.set(key, [
            r
        ]);
    }
    const rows = [];
    for (const [key, recs] of groups){
        const row = {};
        spec.dimensions.forEach((d, i)=>{
            const f = fieldById.get(d);
            row[d] = key.split('§')[i] === '—' ? null : key.split('§')[i];
            // برچسب نمایشی
            row[`__label_${d}`] = f?.label ?? d;
        });
        for (const m of spec.measures){
            const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields);
            row[alias] = aggregateMeasure(recs, m, fields, warnings);
        }
        rows.push(row);
    }
    // مرتب‌سازی
    if (spec.orderBy?.length) {
        for (const ob of [
            ...spec.orderBy
        ].reverse()){
            rows.sort((a, b)=>{
                const av = a[ob.field], bv = b[ob.field];
                const an = typeof av === 'number' ? av : parseFloat(String(av));
                const bn = typeof bv === 'number' ? bv : parseFloat(String(bv));
                if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * (ob.dir === 'desc' ? -1 : 1);
                return String(av ?? '').localeCompare(String(bv ?? ''), 'fa') * (ob.dir === 'desc' ? -1 : 1);
            });
        }
    } else if (spec.measures.length > 0) {
        // پیش‌فرض: نزولی بر اساس نخستین سنجه
        const first = spec.measures[0];
        const alias = first.alias ?? measureAlias(first.fieldId, first.agg, fields);
        rows.sort((a, b)=>(typeof b[alias] === 'number' ? b[alias] : 0) - (typeof a[alias] === 'number' ? a[alias] : 0));
    }
    const limited = spec.limit ? rows.slice(0, spec.limit) : rows;
    // جمع کل — از مقادیر دقیق محاسبه شود نه اعداد گردشده (بخش ۱۴.۴)
    const totals = {};
    for (const m of spec.measures){
        const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields);
        totals[alias] = aggregateMeasure(data, m, fields, warnings);
    }
    // هشدار میانگین ساده سنجه‌های غیرجمع‌پذیر — بخش ۱۱.۴
    for (const m of spec.measures){
        const f = fieldById.get(m.fieldId ?? '');
        if (m.agg === 'avg' && f?.unitKind === 'percent') {
            warnings.push(`میانگین ساده «${f.label}» در سطح گروه‌ها غیرجمع‌پذیر است؛ میانگین وزنی را بررسی کنید (بخش ۱۱.۴ سند).`);
        }
    }
    return {
        rows: limited,
        totals,
        rowCount: limited.length,
        scannedRecords: scanned,
        warnings
    };
}
function matchFilter(v, flt) {
    const s = v === null || v === undefined ? '' : String(v).trim();
    switch(flt.op){
        case 'eq':
            return s === String(flt.value);
        case 'neq':
            return s !== String(flt.value);
        case 'in':
            return (flt.values ?? []).some((x)=>String(x) === s);
        case 'gt':
            {
                const a = num(v), b = num(flt.value);
                return a !== null && b !== null && a > b;
            }
        case 'gte':
            {
                const a = num(v), b = num(flt.value);
                return a !== null && b !== null && a >= b;
            }
        case 'lt':
            {
                const a = num(v), b = num(flt.value);
                return a !== null && b !== null && a < b;
            }
        case 'lte':
            {
                const a = num(v), b = num(flt.value);
                return a !== null && b !== null && a <= b;
            }
        case 'contains':
            return s.includes(String(flt.value));
        case 'notnull':
            return s !== '';
        case 'isnull':
            return s === '';
        default:
            return true;
    }
}
function applyFilters(records, filters, fields) {
    const fieldById = new Map(fields.map((f)=>[
            f.id,
            f
        ]));
    let data = records;
    for (const flt of filters){
        const f = fieldById.get(flt.fieldId);
        if (!f) continue;
        data = data.filter((r)=>matchFilter(r[flt.fieldId], flt));
    }
    return data;
}
function measureAlias(fieldId, agg, fields) {
    const f = fields.find((x)=>x.id === fieldId);
    const label = f?.label ?? fieldId ?? '';
    switch(agg){
        case 'sum':
            return `جمع ${label}`;
        case 'count':
            return 'تعداد رکورد';
        case 'countDistinct':
            return `${label} متمایز`;
        case 'avg':
            return `میانگین ${label}`;
        case 'weightedAvg':
            return `میانگین وزنی ${label}`;
        case 'min':
            return `کمینه ${label}`;
        case 'max':
            return `بیشینه ${label}`;
        case 'median':
            return `میانه ${label}`;
        case 'last':
            return `آخرین ${label}`;
        default:
            return label;
    }
}
function aggregateMeasure(recs, m, fields, warnings) {
    const fieldId = m.fieldId ?? '';
    const f = fields.find((x)=>x.id === fieldId);
    const raw = aggregate(recs, fieldId, m.agg, (r)=>num(r[fieldId]), warnings);
    if (!f) return raw;
    // مبلغ‌ها به مبنای ریال تبدیل می‌شوند تا جمع مبلغ‌های با واحد متفاوت صحیح باشد (بخش ۱۴.۳)
    if (f.type === 'amount' && f.unit && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isCurrencyUnit"])(f.unit) && [
        'sum',
        'avg',
        'min',
        'max',
        'median',
        'last',
        'weightedAvg'
    ].includes(m.agg)) {
        return raw * (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getUnit"])(f.unit).factor;
    }
    return raw;
}
// تجمیع با مدیریت مقادیر خالی — معیار پذیرش ۳۳.۹ سند
function aggregate(recs, fieldId, agg, extract, warnings) {
    const vals = recs.map(extract).filter((v)=>v !== null);
    switch(agg){
        case 'sum':
            return vals.reduce((a, b)=>a + b, 0);
        case 'count':
            return recs.length;
        case 'countDistinct':
            return new Set(recs.map((r)=>String(r[fieldId] ?? ''))).size;
        case 'avg':
            return vals.length ? vals.reduce((a, b)=>a + b, 0) / vals.length : 0;
        case 'weightedAvg':
            return vals.length ? vals.reduce((a, b)=>a + b, 0) / vals.length : 0 // MVP: ساده
            ;
        case 'min':
            return vals.length ? Math.min(...vals) : 0;
        case 'max':
            return vals.length ? Math.max(...vals) : 0;
        case 'median':
            {
                if (!vals.length) return 0;
                const s = [
                    ...vals
                ].sort((a, b)=>a - b);
                const mid = Math.floor(s.length / 2);
                return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
            }
        case 'last':
            return vals.length ? vals[vals.length - 1] : 0;
        default:
            return 0;
    }
}
function buildDescriptiveReport(records, fields, spec, result, datasetName, dateField) {
    const lines = [];
    const fieldById = new Map(fields.map((f)=>[
            f.id,
            f
        ]));
    // حجم داده و بازه پوشش — بخش ۲۰
    lines.push(`در مجموعه‌داده «${datasetName}» تعداد ${result.scannedRecords.toLocaleString('fa-IR')} رکورد با اعمال فیلترهای انتخابی بررسی شد.`);
    if (dateField && fieldById.get(dateField)?.type === 'date') {
        const vals = records.map((r)=>r[dateField]).filter(Boolean);
        if (vals.length > 0) {
            lines.push(`داده‌های زمانی مربوط به «${fieldById.get(dateField)?.label}» مبنای تحلیل روند قرار گرفته است.`);
        }
    }
    // مجموع و میانگین سنجه‌ها
    for (const m of spec.measures){
        const f = fieldById.get(m.fieldId ?? '');
        const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields);
        const val = result.totals[alias];
        if (typeof val !== 'number') continue;
        if (f?.type === 'amount') {
            // نمایش با واحد مناسب — واحد ورودی به مبنای ریال تبدیل شده و سپس نمایش داده می‌شود (بخش ۱۴ سند)
            const display = m.displayUnit && m.displayUnit !== 'auto' ? m.displayUnit : undefined;
            lines.push(`${alias} برابر ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$currency$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatAmount"])(val, {
                displayUnit: display,
                autoUnitLabel: true
            })} است.`);
        } else {
            lines.push(`${alias} برابر ${val.toLocaleString('fa-IR', {
                maximumFractionDigits: 2
            })} است.`);
        }
    }
    // گروه‌های برتر — بخش ۲۰
    if (spec.dimensions.length > 0 && spec.measures.length > 0 && result.rows.length > 0) {
        const firstMeasure = spec.measures[0];
        const alias = firstMeasure.alias ?? measureAlias(firstMeasure.fieldId, firstMeasure.agg, fields);
        const sorted = [
            ...result.rows
        ].sort((a, b)=>(typeof b[alias] === 'number' ? b[alias] : 0) - (typeof a[alias] === 'number' ? a[alias] : 0));
        const top = sorted[0];
        const dimLabel = fieldById.get(spec.dimensions[0])?.label ?? spec.dimensions[0];
        const total = typeof result.totals[alias] === 'number' ? result.totals[alias] : 0;
        const topVal = typeof top[alias] === 'number' ? top[alias] : 0;
        const share = total > 0 ? (topVal / total * 100).toFixed(1) : '0';
        if (top[spec.dimensions[0]] !== null && top[spec.dimensions[0]] !== undefined) {
            lines.push(`بیشترین سهم به «${top[spec.dimensions[0]]}» در بُعد ${dimLabel} اختصاص دارد (حدود ${share}٪ از کل).`);
        }
        const bottom = sorted[sorted.length - 1];
        if (sorted.length > 1 && bottom[spec.dimensions[0]] !== null) {
            lines.push(`کمترین مقدار مربوط به «${bottom[spec.dimensions[0]]}» است.`);
        }
        lines.push(`تعداد گروه‌های متمایز در این گزارش ${result.rowCount.toLocaleString('fa-IR')} گروه است.`);
    }
    // داده‌های ناقص و محدودیت‌های گزارش — بخش ۲۰
    if (result.warnings.length > 0) {
        lines.push('محدودیت‌ها و هشدارها:');
        for (const w of result.warnings)lines.push(`• ${w}`);
    }
    // مقادیر خالی
    const nulls = fields.filter((f)=>{
        const n = records.filter((r)=>r[f.id] === null || r[f.id] === undefined || String(r[f.id]).trim() === '').length;
        return n > 0;
    });
    if (nulls.length > 0) {
        lines.push(`${nulls.length} ستون دارای مقدار خالی است؛ این داده‌ها در تجمیع مربوطه لحاظ نشده‌اند و باید در تفسیر گزارش لحاظ شوند.`);
    }
    return lines.join('\n');
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
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
"[project]/src/lib/exportppt.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "buildPptx",
    ()=>buildPptx
]);
// خروجی PowerPoint — بخش ۲۳.۱ سند («قابلیت توسعه برای ارائه مدیریتی»)
// اسلاید عنوان + اسلاید نمودار بومی + اسلایدهای جدول با سطر جمع کل
// متن‌ها راست‌به‌چپ با rtlMode — شکل‌دهی حروف فارسی را خود PowerPoint انجام می‌دهد
var __TURBOPACK__imported__module__$5b$externals$5d2f$pptxgenjs__$5b$external$5d$__$28$pptxgenjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pptxgenjs$29$__ = __turbopack_context__.i("[externals]/pptxgenjs [external] (pptxgenjs, esm_import, [project]/node_modules/pptxgenjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$pptxgenjs__$5b$external$5d$__$28$pptxgenjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pptxgenjs$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$pptxgenjs__$5b$external$5d$__$28$pptxgenjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pptxgenjs$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const BRAND = '1E293B' // سرمه‌ای
;
const ACCENT = '2563EB' // آبی
;
const LIGHT = 'EFF6FF';
function fmt(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'number' && Number.isFinite(v)) return new Intl.NumberFormat('fa-IR').format(v);
    return String(v);
}
async function buildPptx(input) {
    const pptx = new __TURBOPACK__imported__module__$5b$externals$5d2f$pptxgenjs__$5b$external$5d$__$28$pptxgenjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pptxgenjs$29$__["default"]();
    pptx.rtlMode = true;
    pptx.layout = 'LAYOUT_16x9';
    // ─── اسلاید ۱: عنوان ───
    const s1 = pptx.addSlide();
    s1.background = {
        color: BRAND
    };
    s1.addText(input.title, {
        x: 0.6,
        y: 1.6,
        w: 8.8,
        h: 1.2,
        align: 'right',
        rtlMode: true,
        fontSize: 32,
        bold: true,
        color: 'FFFFFF',
        fontFace: 'Vazirmatn'
    });
    const meta = [
        {
            text: `مجموعه‌داده: ${input.datasetName}`,
            options: {
                breakLine: true
            }
        },
        {
            text: `نسخه داده: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(input.dataVersion))}  |  زمان تولید: ${input.generatedAt}`,
            options: {
                breakLine: true
            }
        }
    ];
    if (input.project) meta.push({
        text: `پروژه: ${input.project}`,
        options: {
            breakLine: true
        }
    });
    s1.addText(meta, {
        x: 0.6,
        y: 3.0,
        w: 8.8,
        h: 1.1,
        align: 'right',
        rtlMode: true,
        fontSize: 14,
        color: 'CBD5E1',
        fontFace: 'Vazirmatn',
        lineSpacingMultiple: 1.4
    });
    if (input.filtersText && input.filtersText !== '—') {
        s1.addText(`فیلترهای اعمال‌شده: ${input.filtersText}`, {
            x: 0.6,
            y: 4.6,
            w: 8.8,
            h: 0.9,
            align: 'right',
            rtlMode: true,
            fontSize: 12,
            color: '94A3B8',
            fontFace: 'Vazirmatn',
            wrap: true
        });
    }
    // ─── اسلاید ۲: نمودار بومی PowerPoint ───
    if (input.chartType && input.rows.length > 0 && input.headers.length >= 2) {
        const measureIdx = input.headers.length - 1 // آخرین ستون به‌عنوان سنجه نمودار
        ;
        const labels = input.rows.slice(0, 15).map((r)=>fmt(r[0]));
        const values = input.rows.slice(0, 15).map((r)=>{
            const v = Number(r[measureIdx]);
            return Number.isFinite(v) ? v : 0;
        });
        const s2 = pptx.addSlide();
        s2.addText(`${input.headers[measureIdx]} بر حسب ${input.headers[0]}`, {
            x: 0.5,
            y: 0.3,
            w: 9.0,
            h: 0.6,
            align: 'right',
            rtlMode: true,
            fontSize: 18,
            bold: true,
            color: BRAND,
            fontFace: 'Vazirmatn'
        });
        const type = input.chartType === 'line' ? pptx.ChartType.line : input.chartType === 'pie' ? pptx.ChartType.pie : pptx.ChartType.bar;
        s2.addChart(type, [
            {
                name: input.headers[measureIdx],
                labels,
                values
            }
        ], {
            x: 0.5,
            y: 1.0,
            w: 9.0,
            h: 4.6,
            showValue: type !== pptx.ChartType.line,
            showLegend: type === pptx.ChartType.pie,
            legendPos: 'b',
            chartColors: [
                ACCENT,
                '7C3AED',
                '059669',
                'D97706',
                'DC2626',
                '0891B2',
                'DB2777',
                '65A30D',
                '4F46E5',
                'EA580C',
                '0D9488',
                'B45309',
                '9333EA',
                '16A34A',
                'E11D48'
            ],
            catAxisLabelFontFace: 'Vazirmatn',
            valAxisLabelFontFace: 'Vazirmatn',
            dataLabelFontFace: 'Vazirmatn',
            dataLabelColor: BRAND,
            catAxisLabelColor: BRAND,
            valAxisLabelColor: BRAND
        });
    }
    // ─── اسلایدهای جدول ───
    const headerCell = (text)=>({
            text,
            options: {
                bold: true,
                color: 'FFFFFF',
                fill: {
                    color: BRAND
                },
                align: 'center',
                valign: 'middle',
                fontFace: 'Vazirmatn',
                fontSize: 12,
                rtlMode: true
            }
        });
    const bodyCell = (v, isDim)=>({
            text: fmt(v),
            options: {
                align: isDim ? 'right' : 'center',
                valign: 'middle',
                fontFace: 'Vazirmatn',
                fontSize: 11,
                rtlMode: true,
                color: '1F2937'
            }
        });
    const totalCell = (v, isDim)=>({
            text: fmt(v),
            options: {
                bold: true,
                color: BRAND,
                fill: {
                    color: LIGHT
                },
                align: isDim ? 'right' : 'center',
                valign: 'middle',
                fontFace: 'Vazirmatn',
                fontSize: 11,
                rtlMode: true
            }
        });
    const colW = input.headers.map((_, i)=>i === 0 ? 3.2 : 9.4 / Math.max(1, input.headers.length - 1));
    const PAGE = 14;
    const pages = Math.max(1, Math.ceil(input.rows.length / PAGE));
    for(let p = 0; p < pages; p++){
        const chunk = input.rows.slice(p * PAGE, (p + 1) * PAGE);
        if (chunk.length === 0 && pages > 1) continue;
        const slide = pptx.addSlide();
        slide.addText(`${input.title} — جدول ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(p + 1))} از ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(pages))}`, {
            x: 0.5,
            y: 0.25,
            w: 9.0,
            h: 0.55,
            align: 'right',
            rtlMode: true,
            fontSize: 16,
            bold: true,
            color: BRAND,
            fontFace: 'Vazirmatn'
        });
        const tableRows = [
            input.headers.map((h)=>headerCell(h)),
            ...chunk.map((r)=>r.map((v, i)=>bodyCell(v, i < input.dimCount)))
        ];
        if (p === pages - 1) tableRows.push(input.totalRow.map((v, i)=>totalCell(v, i < input.dimCount)));
        slide.addTable(tableRows, {
            x: 0.3,
            y: 0.95,
            w: 9.4,
            colW,
            border: {
                type: 'solid',
                color: 'CBD5E1',
                pt: 0.5
            },
            rowH: 0.32,
            autoPage: false
        });
        slide.addText(`نسخه داده: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(input.dataVersion))} — ${input.generatedAt}`, {
            x: 0.5,
            y: 5.15,
            w: 9.0,
            h: 0.35,
            align: 'left',
            rtlMode: true,
            fontSize: 9,
            color: '94A3B8',
            fontFace: 'Vazirmatn'
        });
    }
    const out = await pptx.write({
        outputType: 'nodebuffer'
    });
    return out;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/src/lib/exportpdf.tsx [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

// خروجی PDF — بخش ۲۳.۱ سند («مناسب چاپ، فارسی صحیح، فونت جاسازی‌شده و صفحه‌بندی»)
// موتور @react-pdf/renderer با فونت وزیرمتن جاسازی‌شده (OFL) و چینش راست‌به‌چپ
// سرستون جدول در هر صفحه تکرار می‌شود؛ شماره صفحه و شناسنامه در پانوشت است (بخش ۲۳.۲)
__turbopack_context__.s([
    "buildPdf",
    ()=>buildPdf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__ = __turbopack_context__.i("[externals]/@react-pdf/renderer [external] (@react-pdf/renderer, esm_import, [project]/node_modules/@react-pdf/renderer)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
// ثبت یک‌بارهٔ فونت وزیرمتن از پوشه public/fonts مخزن (مستقل از node_modules)
const g = globalThis;
function ensureFonts() {
    if (g.__vazirFontReady) return;
    const base = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'public', 'fonts');
    __TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Font"].register({
        family: 'Vazirmatn',
        fonts: [
            {
                src: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(base, 'Vazirmatn-Regular.ttf'),
                fontWeight: 400
            },
            {
                src: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(base, 'Vazirmatn-Bold.ttf'),
                fontWeight: 700
            }
        ]
    });
    __TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Font"].registerHyphenationCallback((w)=>[
            w
        ]); // شکستن کلمه فارسی لازم نیست
    g.__vazirFontReady = true;
}
function fmt(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'number' && Number.isFinite(v)) return new Intl.NumberFormat('fa-IR').format(v);
    return String(v);
}
const s = __TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["StyleSheet"].create({
    page: {
        padding: 36,
        fontSize: 10,
        fontFamily: 'Vazirmatn',
        color: '#111827'
    },
    headerBox: {
        backgroundColor: '#1E293B',
        padding: 14,
        borderRadius: 6,
        marginBottom: 12
    },
    title: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 700,
        textAlign: 'right'
    },
    meta: {
        color: '#CBD5E1',
        fontSize: 9,
        marginTop: 4,
        textAlign: 'right'
    },
    filters: {
        fontSize: 9,
        color: '#374151',
        backgroundColor: '#EFF6FF',
        borderLeftColor: '#2563EB',
        borderLeftWidth: 3,
        padding: 8,
        marginBottom: 12,
        textAlign: 'right'
    },
    table: {
        width: '100%'
    },
    row: {
        flexDirection: 'row-reverse',
        borderBottomWidth: 0.5,
        borderBottomColor: '#CBD5E1',
        minHeight: 18,
        alignItems: 'center'
    },
    headRow: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3
    },
    headCell: {
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: 9,
        padding: 5,
        textAlign: 'center',
        flex: 1
    },
    dimCell: {
        fontSize: 9,
        padding: 5,
        textAlign: 'right',
        flex: 1.6
    },
    mCell: {
        fontSize: 9,
        padding: 5,
        textAlign: 'center',
        flex: 1
    },
    totalRow: {
        backgroundColor: '#EFF6FF',
        marginTop: 2
    },
    totalCell: {
        fontWeight: 700,
        color: '#1E293B',
        fontSize: 9,
        padding: 5
    },
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 36,
        right: 36,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#94A3B8'
    },
    empty: {
        textAlign: 'center',
        color: '#6B7280',
        padding: 16,
        fontSize: 10
    }
});
function ReportPdf(input) {
    const dimFlex = 1.6;
    const mFlex = Math.max(0.8, 3.4 / Math.max(1, input.headers.length - input.dimCount));
    const cellStyle = (i)=>i < input.dimCount ? [
            s.dimCell,
            {
                flex: dimFlex
            }
        ] : [
            s.mCell,
            {
                flex: mFlex
            }
        ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Document"], {
        title: input.title,
        author: "سکوی هوشمند گزارش‌ساز",
        subject: `نسخه داده ${input.dataVersion}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Page"], {
            size: "A4",
            style: s.page,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                    style: s.headerBox,
                    fixed: true,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                            style: s.title,
                            children: input.title
                        }, void 0, false, {
                            fileName: "[project]/src/lib/exportpdf.tsx",
                            lineNumber: 75,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                            style: s.meta,
                            children: [
                                "مجموعه‌داده: ",
                                input.datasetName,
                                "   |   نسخه داده: ",
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(input.dataVersion)),
                                "   |   زمان تولید: ",
                                input.generatedAt,
                                input.project ? `   |   پروژه: ${input.project}` : ''
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/lib/exportpdf.tsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/lib/exportpdf.tsx",
                    lineNumber: 74,
                    columnNumber: 9
                }, this),
                input.filtersText && input.filtersText !== '—' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                    style: s.filters,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                        children: [
                            "فیلترهای اعمال‌شده: ",
                            input.filtersText
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/lib/exportpdf.tsx",
                        lineNumber: 82,
                        columnNumber: 35
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/lib/exportpdf.tsx",
                    lineNumber: 82,
                    columnNumber: 11
                }, this) : null,
                input.rows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                    style: s.empty,
                    children: "داده‌ای برای نمایش با فیلترهای فعلی وجود ندارد."
                }, void 0, false, {
                    fileName: "[project]/src/lib/exportpdf.tsx",
                    lineNumber: 86,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                    style: s.table,
                    wrap: true,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                            style: [
                                s.row,
                                s.headRow
                            ],
                            fixed: true,
                            children: input.headers.map((h, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                                    style: [
                                        i < input.dimCount ? {
                                            ...s.headCell,
                                            flex: dimFlex,
                                            textAlign: 'right'
                                        } : {
                                            ...s.headCell,
                                            flex: mFlex
                                        }
                                    ],
                                    children: h
                                }, i, false, {
                                    fileName: "[project]/src/lib/exportpdf.tsx",
                                    lineNumber: 91,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/lib/exportpdf.tsx",
                            lineNumber: 89,
                            columnNumber: 13
                        }, this),
                        input.rows.map((r, ri)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                                style: s.row,
                                wrap: false,
                                children: r.map((v, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                                        style: [
                                            ...cellStyle(i),
                                            {
                                                fontWeight: 400
                                            }
                                        ],
                                        children: fmt(v)
                                    }, i, false, {
                                        fileName: "[project]/src/lib/exportpdf.tsx",
                                        lineNumber: 97,
                                        columnNumber: 19
                                    }, this))
                            }, ri, false, {
                                fileName: "[project]/src/lib/exportpdf.tsx",
                                lineNumber: 95,
                                columnNumber: 15
                            }, this)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                            style: [
                                s.row,
                                s.totalRow
                            ],
                            wrap: false,
                            children: input.totalRow.map((v, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                                    style: [
                                        ...cellStyle(i),
                                        s.totalCell,
                                        {
                                            fontWeight: 700
                                        }
                                    ],
                                    children: fmt(v)
                                }, i, false, {
                                    fileName: "[project]/src/lib/exportpdf.tsx",
                                    lineNumber: 103,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/lib/exportpdf.tsx",
                            lineNumber: 101,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/lib/exportpdf.tsx",
                    lineNumber: 88,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["View"], {
                    style: s.footer,
                    fixed: true,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                            children: "سکوی هوشمند گزارش‌ساز — بخش ۲۳.۱ سند"
                        }, void 0, false, {
                            fileName: "[project]/src/lib/exportpdf.tsx",
                            lineNumber: 110,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["Text"], {
                            render: ({ pageNumber, totalPages })=>`صفحه ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(pageNumber))} از ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPersianDigits"])(String(totalPages))}`
                        }, void 0, false, {
                            fileName: "[project]/src/lib/exportpdf.tsx",
                            lineNumber: 111,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/lib/exportpdf.tsx",
                    lineNumber: 109,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/lib/exportpdf.tsx",
            lineNumber: 73,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/lib/exportpdf.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
async function buildPdf(input) {
    ensureFonts();
    const buf = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f40$react$2d$pdf$2f$renderer__$5b$external$5d$__$2840$react$2d$pdf$2f$renderer$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$react$2d$pdf$2f$renderer$29$__["renderToBuffer"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsxDEV"])(ReportPdf, {
        ...input
    }, void 0, false, {
        fileName: "[project]/src/lib/exportpdf.tsx",
        lineNumber: 120,
        columnNumber: 36
    }, this));
    return buf;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/lib/exporters.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "EXPORT_FORMATS",
    ()=>EXPORT_FORMATS,
    "EXPORT_MIME",
    ()=>EXPORT_MIME,
    "buildExportBuffer",
    ()=>buildExportBuffer,
    "filtersTextOf",
    ()=>filtersTextOf
]);
// تولید خروجی گزارش — بخش ۲۳ سند
// منطق مشترک خروجی مستقیم و صف پردازش پس‌زمینه (۳۰.۲): Excel، CSV، PowerPoint، PDF
// فیلترها، نسخه داده و زمان تولید در خروجی ثبت می‌شود (بخش ۲۳.۲)
var __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__ = __turbopack_context__.i("[externals]/xlsx [external] (xlsx, cjs, [project]/node_modules/xlsx)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportppt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exportppt.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportpdf$2e$tsx__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exportpdf.tsx [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportppt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportpdf$2e$tsx__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportppt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportpdf$2e$tsx__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const EXPORT_FORMATS = [
    'xlsx',
    'csv',
    'pptx',
    'pdf'
];
const EXPORT_MIME = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv; charset=utf-8',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pdf: 'application/pdf'
};
const OP_LABELS = {
    eq: '=',
    neq: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    contains: 'شامل',
    notnull: 'خالی نیست',
    isnull: 'خالی'
};
function filtersTextOf(filters, fieldById) {
    const list = filters ?? [];
    if (list.length === 0) return '—';
    return list.map((f)=>{
        const label = fieldById.get(f.fieldId ?? '')?.label ?? f.fieldId;
        const val = Array.isArray(f.values) ? f.values.map(String).join('، ') : String(f.value ?? '');
        return `${label} ${OP_LABELS[f.op ?? ''] ?? f.op ?? ''} ${val}`;
    }).join('، ');
}
async function buildExportBuffer(input) {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_');
    const safeName = (input.datasetName || 'report').replace(/[^\w\u0600-\u06FF-]+/g, '_');
    const { format, headers, rows, totalRow, dimCount } = input;
    if (format === 'csv') {
        // CSV با جداکننده و کدگذاری متداول — بخش ۲۳.۱
        const aoa = [
            headers,
            ...rows,
            totalRow
        ];
        const csv = aoa.map((row)=>row.map((v)=>{
                const s = v === null || v === undefined ? '' : String(v);
                return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            }).join(';')).join('\r\n');
        const withMeta = `# گزارش: ${input.datasetName} | نسخه داده: ${input.dataVersion} | زمان تولید: ${stamp}\r\n` + csv;
        const buf = Buffer.from('\uFEFF' + withMeta, 'utf8');
        return {
            buf,
            mime: EXPORT_MIME.csv,
            ext: 'csv',
            fileName: `report_${safeName}_${stamp}.csv`
        };
    }
    if (format === 'pptx') {
        // PowerPoint — ارائه مدیریتی — بخش ۲۳.۱
        const faTime = new Intl.DateTimeFormat('fa-IR', {
            dateStyle: 'full',
            timeStyle: 'short'
        }).format(new Date());
        const buf = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportppt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildPptx"])({
            title: input.title,
            datasetName: input.datasetName,
            dataVersion: input.dataVersion,
            generatedAt: faTime,
            filtersText: input.filtersText,
            headers,
            rows,
            totalRow,
            dimCount,
            chartType: input.chartType
        });
        return {
            buf,
            mime: EXPORT_MIME.pptx,
            ext: 'pptx',
            fileName: `report_${safeName}_${stamp}.pptx`
        };
    }
    if (format === 'pdf') {
        // PDF — فونت جاسازی‌شده، فارسی صحیح، صفحه‌بندی — بخش ۲۳.۱
        const faTime = new Intl.DateTimeFormat('fa-IR', {
            dateStyle: 'full',
            timeStyle: 'short'
        }).format(new Date());
        const buf = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exportpdf$2e$tsx__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildPdf"])({
            title: input.title,
            datasetName: input.datasetName,
            dataVersion: input.dataVersion,
            generatedAt: faTime,
            filtersText: input.filtersText,
            headers,
            rows,
            totalRow,
            dimCount
        });
        return {
            buf,
            mime: EXPORT_MIME.pdf,
            ext: 'pdf',
            fileName: `report_${safeName}_${stamp}.pdf`
        };
    }
    // Excel پیش‌فرض — نوع عددی مناسب (معیار پذیرش ۳۳.۱۲)
    const aoa = [
        headers,
        ...rows,
        totalRow
    ];
    const ws = __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["utils"].aoa_to_sheet(aoa);
    for(let R = 1; R < aoa.length; R++){
        for(let C = dimCount; C < aoa[R].length; C++){
            const cell = ws[__TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["utils"].encode_cell({
                r: R,
                c: C
            })];
            if (cell && typeof cell.v === 'number') cell.t = 'n';
        }
    }
    ws['!cols'] = headers.map((h)=>({
            wch: Math.max(12, Math.min(40, h.length * 1.6))
        }));
    const wb = __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["utils"].book_new();
    __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["utils"].book_append_sheet(wb, ws, 'گزارش');
    __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["utils"].book_append_sheet(wb, __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["utils"].aoa_to_sheet([
        [
            'مشخصه',
            'مقدار'
        ],
        [
            'گزارش',
            input.datasetName
        ],
        [
            'نسخه داده',
            input.dataVersion
        ],
        [
            'زمان تولید',
            stamp
        ],
        [
            'فیلترهای اعمال‌شده',
            JSON.stringify(input.filtersJson ?? [])
        ],
        [
            'فیلترها (متن)',
            input.filtersText
        ]
    ]), 'شناسنامه');
    const buf = __TURBOPACK__imported__module__$5b$externals$5d2f$xlsx__$5b$external$5d$__$28$xlsx$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$xlsx$29$__["write"](wb, {
        type: 'buffer',
        bookType: 'xlsx'
    });
    return {
        buf,
        mime: EXPORT_MIME.xlsx,
        ext: 'xlsx',
        fileName: `report_${safeName}_${stamp}.xlsx`
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/app/api/datasets/[id]/export/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

// خروجی مستقیم گزارش — بخش ۲۳ سند
// منطق تولید با src/lib/exporters.ts مشترک است؛ همان موتورِ صف پردازش پس‌زمینه (۳۰.۲)
// فیلترهای اعمال‌شده، زمان تولید و نسخه داده در خروجی ثبت می‌شود (بخش ۲۳.۲)
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$query$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/query.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exporters.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
// برچسب فارسی عملیات خروجی برای ثبت رویداد (ردیابی — بخش ۴)
const EXPORT_ACTION = {
    xlsx: 'خروجی Excel',
    csv: 'خروجی CSV',
    pptx: 'خروجی PowerPoint',
    pdf: 'خروجی PDF'
};
async function POST(req, ctx) {
    const { id } = await ctx.params;
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'export.run');
        const body = await req.json();
        const format = String(body.format ?? 'xlsx');
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["EXPORT_FORMATS"].includes(format)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])(`قالب نامعتبر است؛ قالب‌های مجاز: ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["EXPORT_FORMATS"].join('، ')}`, 400);
        const spec = {
            dimensions: Array.isArray(body.dimensions) ? body.dimensions : [],
            measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [
                {
                    agg: 'count'
                }
            ],
            filters: body.filters ?? [],
            orderBy: body.orderBy,
            limit: body.limit
        };
        const ds = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dataset.findUnique({
            where: {
                id
            }
        });
        if (!ds) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('مجموعه‌داده یافت نشد.', 404);
        const fields = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.fields, []);
        // قواعد سطح سطر — بخش ۲۹ سند
        const records = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyRowRules"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.records, []), user.rowRules, ds.id);
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$query$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runQuery"])(records, fields, spec);
        // ماسک مقادیر حساس در ابعاد خروجی — بخش ۲۹ سند
        const sensitiveIds = fields.filter((f)=>f.sensitivity === 'confidential').map((f)=>f.id);
        // ساخت سطرهای خروجی با برچسب‌های نمایشی
        const fieldById = new Map(fields.map((f)=>[
                f.id,
                f
            ]));
        const dimCols = spec.dimensions.map((d)=>fieldById.get(d)?.label ?? d);
        const measureCols = spec.measures.map((m)=>m.alias ?? '');
        const headers = [
            ...dimCols,
            ...measureCols
        ];
        const rows = result.rows.map((r)=>{
            const row = [];
            for (const d of spec.dimensions){
                let v = r[d];
                if (sensitiveIds.includes(d) && v !== null && v !== undefined && String(v) !== '') {
                    v = String(v).slice(0, 2) + '•'.repeat(Math.max(3, Math.min(10, String(v).length - 2)));
                }
                row.push(v);
            }
            for (const m of spec.measures){
                const alias = m.alias ?? '';
                row.push(r[alias]);
            }
            return row;
        });
        // سطر جمع کل — بخش ۲۳.۲: مجموع خروجی با گزارش منطبق باشد
        const totalRow = [
            ...Array(spec.dimensions.length).fill('جمع کل'),
            ...spec.measures.map((m)=>result.totals[m.alias ?? ''] ?? null)
        ];
        const built = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildExportBuffer"])({
            format,
            title: body.title ? String(body.title) : `گزارش ${ds.name}`,
            datasetName: ds.name,
            dataVersion: ds.version,
            filtersJson: spec.filters ?? [],
            filtersText: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["filtersTextOf"])(spec.filters, fieldById),
            headers,
            rows,
            totalRow,
            dimCount: spec.dimensions.length,
            chartType: body.chartType ? String(body.chartType) : undefined
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ds.projectId, EXPORT_ACTION[format] ?? `خروجی ${format.toUpperCase()}`, `${ds.name} — ${rows.length} سطر`, user.name);
        return new Response(new Uint8Array(built.buf), {
            headers: {
                'Content-Type': built.mime,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(built.fileName)}"`
            }
        });
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__38635f25._.js.map