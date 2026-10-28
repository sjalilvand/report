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
"[project]/src/lib/profile.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// شناسنامه و کیفیت داده — بخش ۹ سند
// محاسبه آمار توصیفی هر ستون و کل مجموعه‌داده
__turbopack_context__.s([
    "profileDataset",
    ()=>profileDataset
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jalali$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/jalali.ts [app-route] (ecmascript)");
;
;
function profileDataset(records, fields) {
    const warnings = [];
    const profiles = fields.map((f)=>profileField(records, f));
    // سطرهای تکراری کامل
    const seen = new Set();
    let dup = 0;
    for (const r of records){
        const key = fields.map((f)=>String(r[f.id] ?? '')).join('§');
        if (seen.has(key)) dup++;
        else seen.add(key);
    }
    // توزیع زمانی — بر نخستین ستون تاریخ
    const dateField = fields.find((f)=>f.type === 'date');
    let dateRange;
    if (dateField) {
        let minIso = null;
        let maxIso = null;
        let invalid = 0;
        for (const r of records){
            const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jalali$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDateValue"])(r[dateField.id]);
            if (p.ok && p.iso) {
                if (!minIso || p.iso < minIso) minIso = p.iso;
                if (!maxIso || p.iso > maxIso) maxIso = p.iso;
            } else if (r[dateField.id] !== null && String(r[dateField.id]).trim() !== '') {
                invalid++;
            }
        }
        if (minIso && maxIso) dateRange = {
            field: dateField.id,
            from: minIso,
            to: maxIso,
            invalid
        };
        if (invalid > 0) warnings.push(`${invalid} مقدار تاریخ نامعتبر در ستون «${dateField.label}» جداگانه گزارش می‌شود (معیار پذیرش ۳۳.۵ سند).`);
    }
    // هشدارهای کیفیت
    const partial = profiles.filter((p)=>p.quality !== 'valid');
    if (partial.length > 0) {
        warnings.push(`${partial.length} ستون وضعیت کیفیت غیرکامل دارد (بخش ۹ سند).`);
    }
    return {
        rowCount: records.length,
        duplicateRows: dup,
        fields: profiles,
        dateRange,
        warnings
    };
}
function profileField(records, f) {
    const total = records.length;
    let nullCount = 0;
    const freq = new Map();
    const typeDist = {};
    const nums = [];
    let minLen = Infinity, maxLen = 0;
    let min;
    let max;
    let patternViolations = 0;
    const isNumericType = [
        'amount',
        'decimal',
        'integer',
        'percent'
    ].includes(f.type);
    for (const r of records){
        const raw = r[f.id];
        const s = raw === null || raw === undefined ? '' : String(raw).trim();
        if (s === '') {
            nullCount++;
            continue;
        }
        freq.set(s, (freq.get(s) ?? 0) + 1);
        // توزیع نوع واقعی
        let t = 'text';
        const lat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(s);
        if (/^-?\d*\.?\d+$/.test(lat.replace(/[,\u060C]/g, ''))) t = 'number';
        else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(lat)) t = 'date';
        else if ([
            'بله',
            'خیر',
            'true',
            'false'
        ].includes(s.toLowerCase())) t = 'boolean';
        typeDist[t] = (typeDist[t] ?? 0) + 1;
        if (isNumericType) {
            const n = parseFloat(lat.replace('٫', '.').replace(/[,\u060C]/g, ''));
            if (Number.isFinite(n)) {
                nums.push(n);
                if (min === undefined || n < min) min = n;
                if (max === undefined || n > max) max = n;
            } else {
                patternViolations++;
            }
        } else if (f.type === 'date') {
            const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jalali$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDateValue"])(raw);
            if (p.ok && p.iso) {
                if (min === undefined || p.iso < min) min = p.iso;
                if (max === undefined || p.iso > max) max = p.iso;
            } else patternViolations++;
        } else {
            const L = s.length;
            if (L < minLen) minLen = L;
            if (L > maxLen) maxLen = L;
        }
    }
    const distinctCount = freq.size;
    const topValues = [
        ...freq.entries()
    ].sort((a, b)=>b[1] - a[1]).slice(0, 8).map(([value, count])=>({
            value,
            count,
            percent: total ? count / total : 0
        }));
    let mean;
    let median;
    if (nums.length > 0) {
        mean = nums.reduce((a, b)=>a + b, 0) / nums.length;
        const sorted = [
            ...nums
        ].sort((a, b)=>a - b);
        const mid = Math.floor(sorted.length / 2);
        median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
    // وضعیت کیفیت — بخش ۸ و ۹
    const nullRatio = total ? nullCount / total : 0;
    let quality = 'valid';
    if (nullRatio > 0.15 || patternViolations > 0) quality = 'partial';
    if (nullRatio > 0.4 || typeDist['number'] && typeDist['text'] && Math.min(typeDist['number'], typeDist['text']) > total * 0.1) quality = 'inconsistent';
    return {
        fieldId: f.id,
        total,
        nullCount,
        nullPercent: total ? nullRatio : 0,
        distinctCount,
        topValues,
        min,
        max,
        mean,
        median,
        minLength: minLen === Infinity ? undefined : minLen,
        maxLength: maxLen || undefined,
        typeDistribution: typeDist,
        patternViolations,
        quality
    };
}
}),
"[project]/src/lib/alerts.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ALERT_TYPES",
    ()=>ALERT_TYPES,
    "ALERT_TYPE_LABELS",
    ()=>ALERT_TYPE_LABELS,
    "SEVERITY_LABELS",
    ()=>SEVERITY_LABELS,
    "aggregateField",
    ()=>aggregateField,
    "evaluateAlertRule",
    ()=>evaluateAlertRule,
    "evaluateProjectRules",
    ()=>evaluateProjectRules,
    "pushNotification",
    ()=>pushNotification,
    "pushSystemNotification",
    ()=>pushSystemNotification,
    "qualityScore",
    ()=>qualityScore
]);
// موتور ارزیابی هشدارها و تولید اعلان — بخش ۲۶.۲ سند
// شش محرک الزامی سند:
//   threshold        — عبور شاخص از آستانه
//   quality          — کاهش کیفیت داده
//   fileDelay        — تأخیر در دریافت فایل
//   processFailure   — شکست پردازش
//   structureChange  — تغییر ساختار
//   missingPeriod    — نبود داده در دوره مورد انتظار
// اعلان‌ها درون‌برنامه‌ای هستند؛ جلوگیری از تکرار با فحص اعلان بازِ همان قاعده (dedup)
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profile$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/profile.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server.ts [app-route] (ecmascript)");
;
;
;
;
const ALERT_TYPES = [
    'threshold',
    'quality',
    'fileDelay',
    'processFailure',
    'structureChange',
    'missingPeriod'
];
const ALERT_TYPE_LABELS = {
    threshold: 'عبور شاخص از آستانه',
    quality: 'کاهش کیفیت داده',
    fileDelay: 'تأخیر در دریافت فایل',
    processFailure: 'شکست پردازش',
    structureChange: 'تغییر ساختار',
    missingPeriod: 'نبود داده در دوره مورد انتظار'
};
const SEVERITY_LABELS = {
    info: 'اطلاعی',
    warning: 'هشدار',
    critical: 'بحرانی'
};
const AGG_LABELS = {
    sum: 'جمع',
    avg: 'میانگین',
    count: 'تعداد رکورد',
    min: 'کمینه',
    max: 'بیشینه',
    countDistinct: 'تعداد متمایز'
};
const OPS = {
    gt: (a, b)=>a > b,
    gte: (a, b)=>a >= b,
    lt: (a, b)=>a < b,
    lte: (a, b)=>a <= b,
    eq: (a, b)=>Math.abs(a - b) < 1e-9
};
const OP_LABELS = {
    gt: 'بزرگ‌تر از',
    gte: 'بزرگ‌تر یا مساوی',
    lt: 'کوچک‌تر از',
    lte: 'کوچک‌تر یا مساوی',
    eq: 'مساوی'
};
function aggregateField(records, fieldId, agg) {
    if (agg === 'count') return records.length;
    const values = [];
    const distinct = new Set();
    for (const r of records){
        const raw = fieldId ? r[fieldId] : null;
        const s = raw === null || raw === undefined ? '' : String(raw).trim();
        if (s === '') continue;
        if (agg === 'countDistinct') {
            distinct.add(s);
            continue;
        }
        const n = parseFloat((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toLatinDigits"])(s).replace('٫', '.').replace(/[,\u060C]/g, ''));
        if (Number.isFinite(n)) values.push(n);
    }
    if (agg === 'countDistinct') return distinct.size;
    if (values.length === 0) return 0;
    switch(agg){
        case 'sum':
            return values.reduce((a, b)=>a + b, 0);
        case 'avg':
            return values.reduce((a, b)=>a + b, 0) / values.length;
        case 'min':
            return Math.min(...values);
        case 'max':
            return Math.max(...values);
        default:
            return values.length;
    }
}
function qualityScore(profile) {
    const total = profile.rowCount;
    if (total === 0) return 0;
    let score = 100;
    const dupPercent = profile.duplicateRows / total * 100;
    score -= Math.min(20, dupPercent * 0.5);
    const fields = profile.fields.filter((f)=>f.total > 0);
    if (fields.length > 0) {
        const avgNull = fields.reduce((a, f)=>a + f.nullPercent, 0) / fields.length * 100;
        score -= Math.min(25, avgNull * 0.4);
        const inconsistent = fields.filter((f)=>f.quality === 'inconsistent').length;
        const partial = fields.filter((f)=>f.quality === 'partial').length;
        score -= inconsistent / fields.length * 30;
        score -= partial / fields.length * 15;
        const violations = fields.reduce((a, f)=>a + f.patternViolations, 0);
        score -= Math.min(15, violations / total * 10);
    }
    return Math.max(0, Math.round(score * 10) / 10);
}
// امضای ساختار مجموعه‌داده — تغییر نام/ترتیب/نوع ستون‌ها را آشکار می‌کند
// برچسب (label) در امضا نیست چون تغییر نمایشی است و شناسه پایدار می‌ماند
function structureSignature(fields) {
    return JSON.stringify(fields.map((f)=>({
            n: f.sourceName,
            t: f.type,
            u: f.unit ?? null
        })).sort((a, b)=>a.n.localeCompare(b.n, 'fa')));
}
async function pushNotification(input) {
    if (input.ruleId) {
        const open = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.findFirst({
            where: {
                ruleId: input.ruleId,
                type: input.type,
                read: false
            },
            select: {
                id: true
            }
        });
        if (open) return {
            created: false,
            id: open.id
        };
    }
    const n = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.create({
        data: {
            projectId: input.projectId,
            ruleId: input.ruleId ?? null,
            type: input.type,
            severity: input.severity,
            title: input.title,
            message: input.message,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            value: input.value ?? null
        }
    });
    return {
        created: true,
        id: n.id
    };
}
async function pushSystemNotification(input) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.create({
        data: {
            projectId: input.projectId,
            type: input.type,
            severity: input.severity,
            title: input.title,
            message: input.message,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            value: input.value ?? null
        }
    });
}
async function evaluateAlertRule(rule) {
    const type = rule.type;
    const base = {
        ruleId: rule.id,
        ruleName: rule.name,
        type,
        fired: false,
        created: false
    };
    // مجموعه‌داده مرتبط (برای انواع داده‌محور الزامی است)
    let ds = null;
    if ([
        'threshold',
        'quality',
        'fileDelay',
        'structureChange',
        'missingPeriod'
    ].includes(type)) {
        if (!rule.datasetId) return {
            ...base,
            skipped: 'مجموعه‌داده مشخص نشده است.'
        };
        ds = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dataset.findUnique({
            where: {
                id: rule.datasetId
            },
            select: {
                id: true,
                name: true,
                projectId: true,
                rowCount: true,
                fields: true,
                records: true,
                updatedAt: true,
                fileId: true
            }
        });
        if (!ds) return {
            ...base,
            skipped: 'مجموعه‌داده یافت نشد.'
        };
    }
    let fireMessage = '';
    let observed = null;
    switch(type){
        case 'threshold':
            {
                if (!rule.fieldId && rule.aggregation !== 'count') return {
                    ...base,
                    skipped: 'ستون سنجه مشخص نشده است.'
                };
                if (rule.threshold === null || rule.threshold === undefined) return {
                    ...base,
                    skipped: 'آستانه مشخص نشده است.'
                };
                const records = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.records, []);
                const value = aggregateField(records, rule.fieldId, rule.aggregation);
                observed = value;
                const op = OPS[rule.operator] ?? OPS.gt;
                if (op(value, rule.threshold)) {
                    fireMessage = `${AGG_LABELS[rule.aggregation] ?? rule.aggregation} «${rule.name}» برابر ${value.toLocaleString('fa-IR')} است و از آستانه ${rule.threshold.toLocaleString('fa-IR')} عبور کرده (${OP_LABELS[rule.operator] ?? rule.operator} — بخش ۲۶.۲ سند).`;
                } else {
                    // عبور نکرده — اعلان باز قبلی (در صورت وجود) خودبه‌خود خوانده‌شده تلقی نمی‌شود؛ فقط وضعیت ثبت می‌شود
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
                        where: {
                            id: rule.id
                        },
                        data: {
                            lastEvalAt: new Date(),
                            lastState: JSON.stringify({
                                value,
                                breach: false,
                                at: new Date().toISOString()
                            })
                        }
                    });
                    return {
                        ...base,
                        value
                    };
                }
                break;
            }
        case 'quality':
            {
                if (rule.threshold === null || rule.threshold === undefined) return {
                    ...base,
                    skipped: 'حد آستانه کیفیت مشخص نشده است.'
                };
                const fields = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.fields, []);
                const records = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.records, []);
                const score = qualityScore((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profile$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["profileDataset"])(records, fields));
                observed = score;
                if (score < rule.threshold) {
                    fireMessage = `امتیاز کیفیت مجموعه‌داده «${ds.name}» به ${score.toLocaleString('fa-IR')} کاهش یافته و از حد مجاز ${rule.threshold.toLocaleString('fa-IR')} پایین‌تر است (بخش ۲۶.۲ سند: کاهش کیفیت داده).`;
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
                        where: {
                            id: rule.id
                        },
                        data: {
                            lastEvalAt: new Date(),
                            lastState: JSON.stringify({
                                score,
                                breach: false,
                                at: new Date().toISOString()
                            })
                        }
                    });
                    return {
                        ...base,
                        value: score
                    };
                }
                break;
            }
        case 'fileDelay':
            {
                if (rule.maxDays === null || rule.maxDays === undefined) return {
                    ...base,
                    skipped: 'حداکثر فاصله مجاز مشخص نشده است.'
                };
                const file = ds?.fileId ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sourceFile.findUnique({
                    where: {
                        id: ds.fileId
                    },
                    select: {
                        name: true,
                        createdAt: true
                    }
                }) : null;
                if (!file) return {
                    ...base,
                    skipped: 'فایل منبع یافت نشد.'
                };
                const ageMs = Date.now() - file.createdAt.getTime();
                const ageDays = ageMs / 86_400_000;
                observed = Math.round(ageDays * 10) / 10;
                if (ageDays > rule.maxDays) {
                    fireMessage = `فایل «${file.name}» (منبع مجموعه‌داده «${ds.name}») به مدت ${observed.toLocaleString('fa-IR')} روز به‌روزرسانی نشده و از سقف ${rule.maxDays.toLocaleString('fa-IR')} روز گذشته است (بخش ۲۶.۲ سند: تأخیر در دریافت فایل).`;
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
                        where: {
                            id: rule.id
                        },
                        data: {
                            lastEvalAt: new Date(),
                            lastState: JSON.stringify({
                                ageDays: observed,
                                breach: false,
                                at: new Date().toISOString()
                            })
                        }
                    });
                    return {
                        ...base,
                        value: observed
                    };
                }
                break;
            }
        case 'processFailure':
            {
                // اسکن رویدادهای شکست پردازش پس از آخرین ارزیابی
                const since = rule.lastEvalAt ?? new Date(Date.now() - 7 * 86_400_000);
                const failures = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditEvent.count({
                    where: {
                        projectId: rule.projectId,
                        action: 'شکست پردازش',
                        createdAt: {
                            gt: since
                        }
                    }
                });
                observed = failures;
                if (failures > 0) {
                    fireMessage = `${failures.toLocaleString('fa-IR')} رویداد شکست پردازش از آخرین بررسی ثبت شده است (بخش ۲۶.۲ سند).`;
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
                        where: {
                            id: rule.id
                        },
                        data: {
                            lastEvalAt: new Date(),
                            lastState: JSON.stringify({
                                failures,
                                breach: false,
                                at: new Date().toISOString()
                            })
                        }
                    });
                    return {
                        ...base,
                        value: 0
                    };
                }
                break;
            }
        case 'structureChange':
            {
                const fields = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.fields, []);
                const signature = structureSignature(fields);
                const prev = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(rule.lastState, {});
                if (prev.signature && prev.signature !== signature) {
                    fireMessage = `ساختار ستون‌های مجموعه‌داده «${ds.name}» تغییر کرده است؛ بازبینی گزارش‌ها و روابط وابسته توصیه می‌شود (بخش ۲۶.۲ سند: تغییر ساختار).`;
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
                        where: {
                            id: rule.id
                        },
                        data: {
                            lastEvalAt: new Date(),
                            lastState: JSON.stringify({
                                signature,
                                breach: false,
                                at: new Date().toISOString()
                            })
                        }
                    });
                    return {
                        ...base
                    };
                }
                break;
            }
        case 'missingPeriod':
            {
                const minExpected = rule.threshold ?? 1;
                const rc = ds.rowCount;
                observed = rc;
                if (rc < minExpected) {
                    fireMessage = `مجموعه‌داده «${ds.name}» دارای ${rc.toLocaleString('fa-IR')} رکورد است؛ کمینه مورد انتظار دوره ${minExpected.toLocaleString('fa-IR')} رکورد بود (بخش ۲۶.۲ سند: نبود داده در دوره مورد انتظار).`;
                } else {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
                        where: {
                            id: rule.id
                        },
                        data: {
                            lastEvalAt: new Date(),
                            lastState: JSON.stringify({
                                rowCount: rc,
                                breach: false,
                                at: new Date().toISOString()
                            })
                        }
                    });
                    return {
                        ...base,
                        value: rc
                    };
                }
                break;
            }
        default:
            return {
                ...base,
                skipped: 'نوع هشدار شناخته‌شده نیست.'
            };
    }
    const res = await pushNotification({
        projectId: rule.projectId,
        ruleId: rule.id,
        type,
        severity: rule.severity,
        title: rule.name,
        message: fireMessage,
        entityType: ds ? 'dataset' : 'rule',
        entityId: ds?.id ?? rule.id,
        value: observed
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.update({
        where: {
            id: rule.id
        },
        data: {
            lastEvalAt: new Date(),
            lastState: JSON.stringify({
                breach: true,
                value: observed,
                at: new Date().toISOString()
            })
        }
    });
    return {
        ...base,
        fired: true,
        created: res.created,
        stillOpen: !res.created,
        value: observed,
        message: fireMessage
    };
}
async function evaluateProjectRules(projectId) {
    const rules = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.findMany({
        where: {
            projectId,
            active: true
        }
    });
    const results = [];
    for (const r of rules){
        try {
            results.push(await evaluateAlertRule(r));
        } catch (e) {
            results.push({
                ruleId: r.id,
                ruleName: r.name,
                type: r.type,
                fired: false,
                created: false,
                skipped: e instanceof Error ? e.message : 'خطای ارزیابی'
            });
        }
    }
    return results;
}
}),
"[project]/src/app/api/alerts/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// API قواعد هشدار — بخش ۲۶.۲ سند (هشدار و اعلان)
// فهرست و ایجاد قاعده؛ ویرایش/حذف در مسیر [id]؛ ارزیابی در مسیر evaluate
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$alerts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/alerts.ts [app-route] (ecmascript)");
;
;
;
;
async function GET(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'data.view');
        const projectId = req.nextUrl.searchParams.get('projectId');
        if (!projectId) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('شناسه پروژه الزامی است.');
        const rules = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.findMany({
            where: {
                projectId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])(rules.map((r)=>({
                ...r,
                lastState: r.lastState ? JSON.parse(r.lastState) : null
            })));
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
async function POST(req) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'alert.manage');
        const body = await req.json();
        const projectId = String(body.projectId ?? '');
        const name = String(body.name ?? '').trim();
        const type = String(body.type ?? '');
        if (!projectId || !name) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('نام قاعده و پروژه الزامی است.');
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$alerts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ALERT_TYPES"].includes(type)) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('نوع هشدار نامعتبر است؛ انواع مجاز: threshold، quality، fileDelay، processFailure، structureChange، missingPeriod.');
        }
        const datasetId = body.datasetId ? String(body.datasetId) : null;
        if ([
            'threshold',
            'quality',
            'structureChange',
            'missingPeriod',
            'fileDelay'
        ].includes(type) && !datasetId) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('این نوع هشدار به مجموعه‌داده نیاز دارد.');
        }
        const type_ = type;
        if (type_ === 'threshold' && !body.fieldId && body.aggregation !== 'count') {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('برای عبور شاخص از آستانه، ستون سنجه الزامی است.');
        }
        if ([
            'threshold',
            'quality'
        ].includes(type_) && (body.threshold === undefined || body.threshold === null || Number.isNaN(+body.threshold))) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('مقدار آستانه الزامی است.');
        }
        if (type_ === 'fileDelay' && (body.maxDays === undefined || body.maxDays === null || Number.isNaN(+body.maxDays))) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('حداکثر فاصله مجاز روز الزامی است.');
        }
        const rule = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].alertRule.create({
            data: {
                projectId,
                name,
                type,
                datasetId,
                fieldId: body.fieldId ? String(body.fieldId) : null,
                aggregation: String(body.aggregation ?? 'sum'),
                operator: String(body.operator ?? 'gt'),
                threshold: body.threshold !== undefined && body.threshold !== null && body.threshold !== '' ? +body.threshold : null,
                maxDays: body.maxDays !== undefined && body.maxDays !== null && body.maxDays !== '' ? +body.maxDays : null,
                severity: [
                    'info',
                    'warning',
                    'critical'
                ].includes(body.severity) ? body.severity : 'warning',
                active: body.active !== false,
                createdBy: user.name
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(projectId, 'ایجاد قاعده هشدار', `قاعده «${name}» از نوع ${type} ساخته شد`, user.name);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            rule: {
                ...rule,
                lastState: null
            }
        }, 201);
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__bae8b1f6._.js.map