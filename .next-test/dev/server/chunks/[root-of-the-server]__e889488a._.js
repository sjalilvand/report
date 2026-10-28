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
"[project]/src/lib/settings.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_SETTINGS",
    ()=>DEFAULT_SETTINGS,
    "MASK",
    ()=>MASK,
    "SECRET_SETTINGS",
    ()=>SECRET_SETTINGS,
    "SETTING_LABELS",
    ()=>SETTING_LABELS,
    "getMaskedSettings",
    ()=>getMaskedSettings,
    "getSettings",
    ()=>getSettings,
    "saveSettings",
    ()=>saveSettings
]);
// پیکربندی سامانه و سقف‌های ظرفیت — بخش ۳۰.۱ (کارایی و ظرفیت) و ۳۶ (تصمیم‌های پیش از قرارداد)
// اعداد پیش‌فرض «اهداف پیشنهادی اولیه» هستند و مدیر سامانه می‌تواند پیش از قرارداد نهایی‌شان کند
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
const DEFAULT_SETTINGS = {
    maxFileSizeMB: 25,
    maxRowsPerDataset: 200000,
    maxColumnsPerDataset: 120,
    maxFilesPerProject: 30,
    maxDatasetsPerProject: 60,
    maxRelations: 60,
    maxReportsPerProject: 50,
    maxConcurrentUsers: 50,
    sessionTimeoutMinutes: 720,
    multiOrg: false,
    currencyBase: 'rial',
    alertEvalIntervalMinutes: 60,
    emailEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    alertEmailTo: '',
    mfaRequiredRoles: 'admin,steward',
    ssoEnabled: false,
    ssoIssuer: '',
    ssoClientId: '',
    ssoClientSecret: '',
    ssoAuthorizeUrl: '',
    ssoTokenUrl: '',
    ssoUserinfoUrl: '',
    ssoScopes: 'openid profile email',
    ssoAutoProvision: false,
    ssoDefaultRole: 'viewer',
    ssoAllowedDomain: '',
    exportQueueConcurrency: 1,
    exportFileTtlHours: 48
};
const SETTING_LABELS = {
    maxFileSizeMB: 'حداکثر اندازه هر فایل (مگابایت)',
    maxRowsPerDataset: 'حداکثر سطر هر مجموعه‌داده',
    maxColumnsPerDataset: 'حداکثر ستون هر مجموعه‌داده',
    maxFilesPerProject: 'حداکثر فایل هر پروژه',
    maxDatasetsPerProject: 'حداکثر مجموعه‌داده هر پروژه',
    maxRelations: 'حداکثر تعداد روابط هر پروژه',
    maxReportsPerProject: 'حداکثر گزارش هر پروژه',
    maxConcurrentUsers: 'کاربران هم‌زمان (هدف)',
    sessionTimeoutMinutes: 'مدت اعتبار نشست (دقیقه)',
    multiOrg: 'چندسازمانی',
    currencyBase: 'واحد مبنای مبلغ',
    alertEvalIntervalMinutes: 'فاصله ارزیابی خودکار هشدارها (دقیقه)',
    emailEnabled: 'ارسال ایمیلی هشدارها',
    smtpHost: 'سرور SMTP (مثلاً smtp.example.com)',
    smtpPort: 'پورت SMTP',
    smtpSecure: 'اتصال امن مستقیم TLS (پورت ۴۶۵)',
    smtpUser: 'نام کاربری SMTP',
    smtpPass: 'گذرواژه SMTP',
    smtpFrom: 'آدرس فرستنده',
    alertEmailTo: 'گیرندگان ایمیل هشدار (با کاما)',
    mfaRequiredRoles: 'نقش‌های الزام MFA (با کاما — مثلاً admin,steward)',
    ssoEnabled: 'ورود یکپارچه سازمانی (SSO/OIDC)',
    ssoIssuer: 'آدرس Issuer سامانه هویتی (کشف خودکار نقاط انتها)',
    ssoClientId: 'شناسه Client (از سامانه هویتی)',
    ssoClientSecret: 'رمز Client (از سامانه هویتی)',
    ssoAuthorizeUrl: 'آدرس Authorize (اختیاری با کشف خودکار)',
    ssoTokenUrl: 'آدرس Token (اختیاری با کشف خودکار)',
    ssoUserinfoUrl: 'آدرس Userinfo (اختیاری)',
    ssoScopes: 'محدوده‌های OIDC',
    ssoAutoProvision: 'ساخت خودکار حساب کاربران جدید سازمان',
    ssoDefaultRole: 'نقش پیش‌فرض حساب‌های خودکار',
    ssoAllowedDomain: 'محدودیت دامنه ایمیل (خالی = بدون محدودیت)',
    exportQueueConcurrency: 'تعداد پردازش هم‌زمان صف خروجی',
    exportFileTtlHours: 'مدت اعتبار فایل خروجی (ساعت)'
};
const SECRET_SETTINGS = [
    'smtpPass',
    'ssoClientSecret'
];
const MASK = '***';
async function getSettings() {
    try {
        const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].systemSetting.findMany();
        const map = new Map(rows.map((r)=>[
                r.key,
                r.value
            ]));
        const out = {
            ...DEFAULT_SETTINGS
        };
        for (const key of Object.keys(DEFAULT_SETTINGS)){
            const raw = map.get(key);
            if (raw === undefined) continue;
            const def = DEFAULT_SETTINGS[key];
            if (typeof def === 'number') {
                const n = Number(raw);
                if (Number.isFinite(n) && n > 0) out[key] = n;
            } else if (typeof def === 'boolean') {
                out[key] = raw === 'true';
            } else {
                out[key] = raw;
            }
        }
        return out;
    } catch  {
        const d = {
            ...DEFAULT_SETTINGS
        };
        return d;
    }
}
async function getMaskedSettings() {
    const s = await getSettings();
    for (const k of SECRET_SETTINGS){
        if (s[k]) s[k] = MASK;
    }
    return s;
}
async function saveSettings(patch) {
    const entries = [];
    for (const [key, value] of Object.entries(patch)){
        if (!(key in DEFAULT_SETTINGS) || value === undefined || value === null) continue;
        entries.push({
            key,
            value: String(value)
        });
    }
    for (const e of entries){
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].systemSetting.upsert({
            where: {
                key: e.key
            },
            create: {
                key: e.key,
                value: e.value
            },
            update: {
                value: e.value
            }
        });
    }
    return getSettings();
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
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[project]/src/lib/jobs.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "cleanupExpiredExports",
    ()=>cleanupExpiredExports,
    "enqueueExportJob",
    ()=>enqueueExportJob,
    "exportsDir",
    ()=>exportsDir,
    "getQueueState",
    ()=>getQueueState,
    "pump",
    ()=>pump,
    "removeJobFile",
    ()=>removeJobFile,
    "retryJob",
    ()=>retryJob,
    "startJobQueue",
    ()=>startJobQueue
]);
// صف پردازش پس‌زمینه برای خروجی حجیم — بخش ۲۸ (Job/Export) و ۳۰.۲ سند (پایداری)
// الزامات پیاده‌شده:
//   - پردازش غیرهم‌زمان با تعداد پردازشگر قابل پیکربندی (بخش ۳۰.۱)
//   - بازیابی پردازش شکست‌خورده و یتیم پس از ری‌استارت سرور (۳۰.۲)
//   - اجرای مجدد امن: تولید خروجی بی‌اثر بر داده است؛ تلاش مجدد فایل جدید می‌سازد نه داده تکراری
//   - نگهداری آخرین نسخه سالم: فایل با نام موقت نوشته و فقط پس از موفقیت جابه‌جا می‌شود
//   - ثبت مدت (durationMs) و علت شکست (error) — بخش ۳۰.۲
//   - ابطال لینک دانلود با انقضای خودکار فایل (بخش ۲۹)
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/settings.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$alerts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/alerts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exporters.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$query$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/query.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs/promises [external] (fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
;
;
const g = globalThis;
function internals() {
    if (!g.__jobQueue) {
        g.__jobQueue = {
            running: 0,
            queued: 0,
            pumping: false,
            lastFinishedAt: null,
            lastError: null,
            startedAt: new Date().toISOString(),
            active: new Set()
        };
    }
    return g.__jobQueue;
}
function exportsDir() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'exports');
}
function getQueueState() {
    const s = internals();
    const active = s.active.size;
    return {
        running: active,
        queued: s.queued,
        pumping: s.pumping,
        lastFinishedAt: s.lastFinishedAt,
        lastError: s.lastError,
        startedAt: s.startedAt
    };
}
async function refreshQueuedCount() {
    const n = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.count({
        where: {
            status: 'queued'
        }
    });
    const s = internals();
    s.queued = n;
    return n;
}
async function enqueueExportJob(input) {
    const format = input.type.replace(/^export\./, '');
    const job = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.create({
        data: {
            projectId: input.projectId,
            type: `export.${format}`,
            status: 'queued',
            payload: JSON.stringify({
                datasetId: input.datasetId,
                spec: input.spec,
                title: input.title ?? '',
                chartType: input.chartType ?? '',
                rowRules: input.rowRules
            }),
            createdBy: input.createdBy,
            maxAttempts: Math.max(1, input.maxAttempts ?? 2)
        }
    });
    await refreshQueuedCount();
    void pump();
    return {
        id: job.id
    };
}
function startJobQueue() {
    const s = internals();
    if (s.startedAt && s.startedAt === new Date(0).toISOString()) return;
    void (async ()=>{
        try {
            // بازیابی پردازش‌های نیمه‌کاره از اجرای قبلی سرور — بدون داده تکراری: فایل‌ها مستقل‌اند
            const orphan = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.updateMany({
                where: {
                    status: 'running'
                },
                data: {
                    status: 'queued',
                    error: 'پردازش پس از ری‌استارت سرور بازیابی و در صف قرار گرفت (بخش ۳۰.۲)'
                }
            });
            if (orphan.count > 0) console.log(`[صف] ${orphan.count} پردازش یتیم بازیابی شد`);
            await refreshQueuedCount();
            void pump();
            if (orphan.count > 0 || s.queued > 0) console.log(`[صف] پردازش خروجی پس‌زمینه فعال شد — ${s.queued} کار در صف`);
        } catch (e) {
            console.error('[صف] خطا در بازیابی صف:', e instanceof Error ? e.message : e);
        }
    })();
    console.log('[صف] موتور پردازش پس‌زمینه خروجی آماده است (بخش ۳۰.۲)');
}
async function pump() {
    const s = internals();
    if (s.pumping) return;
    s.pumping = true;
    try {
        for(;;){
            const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSettings"])();
            const concurrency = Math.max(1, Math.min(4, settings.exportQueueConcurrency));
            if (s.active.size >= concurrency) break;
            const next = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findFirst({
                where: {
                    status: 'queued'
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            if (!next) break;
            s.active.add(next.id);
            await refreshQueuedCount();
            // اجرای موازی بدون انتظار — سقف هم‌زمانی در حلقه کنترل می‌شود
            void runJob(next.id).catch((e)=>console.error('[صف] خطای اجرای کار:', e instanceof Error ? e.message : e)).finally(()=>{
                s.active.delete(next.id);
                void refreshQueuedCount().then(()=>void pump());
            });
        }
    } finally{
        s.pumping = false;
    }
}
/** اجرای یک کار خروجی — ساخت فایل با نام موقت و جابه‌جایی فقط پس از موفقیت (نگهداری آخرین نسخه سالم) */ async function runJob(jobId) {
    const started = Date.now();
    let job = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findUnique({
        where: {
            id: jobId
        }
    });
    if (!job || job.status !== 'queued') return;
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
        where: {
            id: jobId
        },
        data: {
            status: 'running',
            progress: 5,
            startedAt: new Date(),
            attempts: {
                increment: 1
            }
        }
    });
    try {
        const payload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(job.payload, {
            datasetId: '',
            spec: {
                dimensions: [],
                measures: []
            },
            title: '',
            chartType: '',
            rowRules: []
        });
        const format = job.type.replace(/^export\./, '');
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["EXPORT_FORMATS"].includes(format)) {
            throw new Error(`قالب خروجی «${format}» پشتیبانی نمی‌شود (قالب‌های مجاز: ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["EXPORT_FORMATS"].join('، ')})`);
        }
        const ds = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dataset.findUnique({
            where: {
                id: payload.datasetId
            }
        });
        if (!ds) throw new Error('مجموعه‌داده مرتبط با این پردازش یافت نشد — ممکن است حذف شده باشد.');
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
            where: {
                id: jobId
            },
            data: {
                progress: 15
            }
        });
        // قواعد سطح سطرِ درخواست‌کننده در لحظه ثبت کار قفل می‌شوند — بخش ۲۹
        const fields = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.fields, []);
        const records = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyRowRules"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(ds.records, []), payload.rowRules ?? [], ds.id);
        const spec = {
            dimensions: payload.spec.dimensions ?? [],
            measures: payload.spec.measures && payload.spec.measures.length > 0 ? payload.spec.measures : [
                {
                    agg: 'count'
                }
            ],
            filters: payload.spec.filters ?? [],
            orderBy: payload.spec.orderBy,
            limit: payload.spec.limit
        };
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$query$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runQuery"])(records, fields, spec);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
            where: {
                id: jobId
            },
            data: {
                progress: 45
            }
        });
        // ماسک مقادیر حساس در ابعاد خروجی — بخش ۲۹ سند (سازگار با خروجی مستقیم)
        const sensitiveIds = fields.filter((f)=>f.sensitivity === 'confidential').map((f)=>f.id);
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
            for (const m of spec.measures)row.push(r[m.alias ?? '']);
            return row;
        });
        const totalRow = [
            ...Array(spec.dimensions.length).fill('جمع کل'),
            ...spec.measures.map((m)=>result.totals[m.alias ?? ''] ?? null)
        ];
        const filtersText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["filtersTextOf"])(spec.filters, fieldById);
        const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSettings"])();
        const built = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exporters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildExportBuffer"])({
            format,
            title: payload.title || `گزارش ${ds.name}`,
            datasetName: ds.name,
            dataVersion: ds.version,
            filtersJson: spec.filters ?? [],
            filtersText,
            headers,
            rows,
            totalRow,
            dimCount: spec.dimensions.length,
            chartType: payload.chartType || undefined
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
            where: {
                id: jobId
            },
            data: {
                progress: 80
            }
        });
        // نگهداری آخرین نسخه سالم — نوشتن موقت و جابه‌جایی اتمی پس از موفقیت (۳۰.۲)
        await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["mkdir"])(exportsDir(), {
            recursive: true
        });
        const finalPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(exportsDir(), `${jobId}.${built.ext}`);
        const tmpPath = finalPath + '.tmp';
        await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["writeFile"])(tmpPath, built.buf);
        await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["rename"])(tmpPath, finalPath);
        const expiresAt = new Date(Date.now() + settings.exportFileTtlHours * 3600_000);
        const finished = new Date();
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
            where: {
                id: jobId
            },
            data: {
                status: 'done',
                progress: 100,
                result: JSON.stringify({
                    fileName: built.fileName,
                    size: built.buf.length,
                    mime: built.mime,
                    ext: built.ext,
                    expiresAt: expiresAt.toISOString()
                }),
                error: null,
                finishedAt: finished,
                durationMs: Date.now() - started
            }
        });
        const s = internals();
        s.lastFinishedAt = finished.toISOString();
        s.lastError = null;
        console.log(`[صف] خروجی ${format} آماده شد — ${built.fileName} (${(built.buf.length / 1024).toFixed(1)} کیلوبایت، ${Date.now() - started} میلی‌ثانیه)`);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'خطای ناشناخته در پردازش خروجی';
        const fresh = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findUnique({
            where: {
                id: jobId
            }
        });
        const attempts = fresh?.attempts ?? 1;
        const maxAttempts = fresh?.maxAttempts ?? 2;
        const finished = new Date();
        if (attempts < maxAttempts) {
            // بازیابی خودکار: تلاش مجدد امن در صف (۳۰.۲) — تولید خروجی اثر جانبی روی داده ندارد
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
                where: {
                    id: jobId
                },
                data: {
                    status: 'queued',
                    progress: 0,
                    error: message,
                    finishedAt: finished,
                    durationMs: Date.now() - started
                }
            }).catch(()=>undefined);
            console.warn(`[صف] کار ${jobId} شکست خورد؛ تلاش مجدد خودکار (${attempts}/${maxAttempts}): ${message}`);
            return;
        }
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
            where: {
                id: jobId
            },
            data: {
                status: 'failed',
                progress: 0,
                error: message,
                finishedAt: finished,
                durationMs: Date.now() - started
            }
        }).catch(()=>undefined);
        const s = internals();
        s.lastFinishedAt = finished.toISOString();
        s.lastError = message;
        // اعلان شکست پردازش — بخش ۲۶.۲ (محرک processFailure)
        if (fresh) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$alerts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pushSystemNotification"])({
                projectId: fresh.projectId,
                type: 'processFailure',
                severity: 'critical',
                title: 'شکست پردازش خروجی پس‌زمینه',
                message: `پردازش «${fresh.type}» پس از ${attempts.toLocaleString('fa-IR')} تلاش ناموفق بود: ${message}`,
                entityType: 'job',
                entityId: fresh.id
            }).catch(()=>undefined);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(fresh.projectId, 'شکست پردازش خروجی', `${fresh.type} — ${message}`, fresh.createdBy ?? 'صف پردازش').catch(()=>undefined);
        }
    }
}
async function retryJob(jobId) {
    const job = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findUnique({
        where: {
            id: jobId
        }
    });
    if (!job) return {
        ok: false,
        message: 'پردازش یافت نشد.'
    };
    if (![
        'failed',
        'canceled'
    ].includes(job.status)) {
        return {
            ok: false,
            message: 'فقط پردازش شکست‌خورده یا لغوشده قابل تلاش مجدد است.'
        };
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
        where: {
            id: jobId
        },
        data: {
            status: 'queued',
            progress: 0,
            error: null,
            startedAt: null,
            finishedAt: null,
            durationMs: null,
            result: null
        }
    });
    await refreshQueuedCount();
    void pump();
    return {
        ok: true,
        message: 'پردازش دوباره به صف اضافه شد (اجرای مجدد امن — بخش ۳۰.۲).'
    };
}
async function removeJobFile(jobId, ext) {
    if (!ext) return;
    await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["unlink"])(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(exportsDir(), `${jobId}.${ext}`)).catch(()=>undefined);
}
async function cleanupExpiredExports() {
    const jobs = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findMany({
        where: {
            status: 'done',
            result: {
                not: null
            }
        }
    });
    let removed = 0;
    const now = Date.now();
    for (const job of jobs){
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(job.result, {});
        if (result.expiresAt && new Date(result.expiresAt).getTime() < now) {
            await removeJobFile(job.id, result.ext);
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
                where: {
                    id: job.id
                },
                data: {
                    result: null,
                    error: 'فایل خروجی منقضی و حذف شد (سیاست نگهداری — بخش ۲۹)'
                }
            });
            removed++;
        }
    }
    return removed;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/app/api/jobs/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

// جزئیات پردازش، تلاش مجدد، لغو/حذف — بخش ۳۰.۲ سند (پایداری)
__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/jobs.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
async function GET(req, ctx) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUser"])(req);
        const { id } = await ctx.params;
        const job = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findUnique({
            where: {
                id
            },
            include: {
                project: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (!job) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('پردازش یافت نشد.', 404);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            ...job,
            payload: undefined,
            result: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(job.result, null),
            projectName: job.project.name,
            queue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getQueueState"])()
        });
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
async function POST(req, ctx) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'export.run');
        const { id } = await ctx.params;
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["retryJob"])(id);
        if (!res.ok) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])(res.message, 400);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(null, 'تلاش مجدد پردازش', `پردازش ${id} دوباره به صف اضافه شد`, user.name);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            message: res.message
        });
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
async function DELETE(req, ctx) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePerm"])(req, 'export.run');
        const { id } = await ctx.params;
        const job = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.findUnique({
            where: {
                id
            }
        });
        if (!job) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('پردازش یافت نشد.', 404);
        if (job.status === 'running') {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('پردازش در حال اجراست و قابل لغو نیست؛ پس از پایان می‌توانید حذفش کنید.', 409);
        }
        if (job.status === 'queued') {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.update({
                where: {
                    id
                },
                data: {
                    status: 'canceled',
                    error: 'پیش از اجرا لغو شد'
                }
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(job.projectId, 'لغو پردازش صف', `${job.type} لغو شد`, user.name);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
                message: 'پردازش لغو شد.'
            });
        }
        // کارهای پایان‌یافته: حذف فایل و رکورد — سیاست نگهداری و ابطال لینک (بخش ۲۹)
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseJson"])(job.result, null);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["removeJobFile"])(job.id, result?.ext);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].job.delete({
            where: {
                id
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(job.projectId, 'حذف پردازش و فایل خروجی', `${job.type} و فایل آن حذف شد (بخش ۲۹ سند)`, user.name);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            message: 'پردازش و فایل خروجی حذف شد.'
        });
    } catch (e) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["errorResponse"])(e);
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e889488a._.js.map