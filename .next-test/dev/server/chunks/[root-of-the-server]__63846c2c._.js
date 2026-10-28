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
"[project]/src/app/api/reports/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// مدیریت گزارش — به‌روزرسانی محتوا و حذف (بخش‌های ۲۴.۳ سند)
// گذار وضعیت‌ها فقط از مسیر گردش کار /api/reports/[id]/status انجام می‌شود (بخش ۲۶.۱)
__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
;
;
;
async function GET(req, ctx) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUser"])(req);
        const { id } = await ctx.params;
        const report = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].report.findUnique({
            where: {
                id
            }
        });
        if (!report) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('گزارش یافت نشد.', 404);
        const approvals = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].approvalEvent.findMany({
            where: {
                reportId: id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            ...report,
            approvals
        });
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
async function PUT(req, ctx) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'report.create');
        const { id } = await ctx.params;
        const body = await req.json();
        const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].report.findUnique({
            where: {
                id
            },
            include: {
                versions: true
            }
        });
        if (!existing) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('گزارش یافت نشد.', 404);
        // فقط گزارش در وضعیت پیش‌نویس/ردشده قابل ویرایش است — بخش ۲۶.۱
        if (![
            'draft',
            'rejected'
        ].includes(existing.status)) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('گزارش در گردش کار تأیید است؛ برای ویرایش، ابتدا باید بازگردانده شود یا در وضعیت پیش‌نویس باشد (بخش ۲۶.۱ سند).', 409);
        }
        const data = {};
        if (body.title !== undefined) data.title = String(body.title);
        if (body.description !== undefined) data.description = String(body.description);
        if (body.config !== undefined) data.config = JSON.stringify(body.config);
        if (body.datasetId !== undefined) data.datasetId = body.datasetId || null;
        // وضعیت اینجا فقط برای بازگشت به پیش‌نویس (اصلاح پس از رد) مجاز است
        if (body.status !== undefined) {
            const status = String(body.status);
            if (status !== 'draft') {
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('تغییر وضعیت گزارش از مسیر گردش کار تأیید انجام می‌شود: submit | approve | reject | publish (بخش ۲۶.۱ سند).');
            }
            data.status = 'draft';
        }
        data.version = existing.version + 1;
        const report = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].report.update({
            where: {
                id
            },
            data
        });
        // عکس‌فوری نسخه‌ها — بخش ۲۶.۱ («مقایسه نسخه‌ها» و «ثبت دلیل تغییر»)
        // اگر گزارش قدیمی است و نسخه‌ای ثبت نشده، ابتدا وضعیت پیشین جبران می‌شود
        const hasCurrentSnapshot = existing.versions.some((v)=>v.version === existing.version);
        if (!hasCurrentSnapshot) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].reportVersion.create({
                data: {
                    reportId: id,
                    version: existing.version,
                    title: existing.title,
                    description: existing.description,
                    config: existing.config,
                    status: existing.status,
                    reason: existing.version === 1 ? 'ایجاد نسخه اولیه' : 'ثبت جبرانی وضعیت پیشین (گزارش پیش از فعال‌سازی نسخه‌بندی)',
                    createdBy: existing.createdBy
                }
            });
        }
        const reason = body.changeReason ? String(body.changeReason).trim() : '';
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].reportVersion.create({
            data: {
                reportId: id,
                version: report.version,
                title: report.title,
                description: report.description,
                config: report.config,
                status: report.status,
                reason: reason || 'به‌روزرسانی پیکربندی گزارش',
                createdBy: user.name
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(existing.projectId, 'به‌روزرسانی گزارش', `گزارش «${report.title}» — نسخه ${report.version}${reason ? ` | دلیل: ${reason}` : ''}`, user.name);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])(report);
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
async function DELETE(req, ctx) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'report.delete');
        const { id } = await ctx.params;
        const report = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].report.findUnique({
            where: {
                id
            }
        });
        if (!report) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('گزارش یافت نشد.', 404);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].report.delete({
            where: {
                id
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(report.projectId, 'حذف گزارش', `گزارش «${report.title}» حذف شد`, user.name);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            deleted: true
        });
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__63846c2c._.js.map