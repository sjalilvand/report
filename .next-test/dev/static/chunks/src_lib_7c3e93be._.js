(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api
]);
// کلاینت API سمت مرورگر
async function request(url, init) {
    const res = await fetch(url, {
        ...init,
        headers: {
            ...init?.body instanceof FormData ? {} : {
                'Content-Type': 'application/json'
            },
            ...init?.headers
        }
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) {
        throw new Error(data.error ?? 'خطای نامشخص در ارتباط با سرور');
    }
    return data;
}
const api = {
    get: (url)=>request(url),
    post: (url, body)=>request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        }),
    postForm: (url, form)=>request(url, {
            method: 'POST',
            body: form
        }),
    patch: (url, body)=>request(url, {
            method: 'PATCH',
            body: JSON.stringify(body)
        }),
    put: (url, body)=>request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        }),
    del: (url)=>request(url, {
            method: 'DELETE'
        })
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/digits.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/currency.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-client] (ecmascript)");
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
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(label)).replace(/[_\-\s]/g, '');
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
    s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["groupThousands"])(s, opts.separator ?? '،');
    if (opts.persianDigits) {
        s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toPersianDigits"])(s);
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
    s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["groupThousands"])(s);
    if (v < 0) s = '−' + s;
    return persianDigits ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toPersianDigits"])(s) : s;
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/join.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// موتور اتصال بصری جداول — بخش ۱۶ سند
// انواع رابطه (۱۶.۱)، انواع اتصال (۱۶.۲)، کنترل‌های الزامی پیش از اتصال (۱۶.۳)
// و جلوگیری از چندبرابرشدن مبالغ (۱۶.۴)
__turbopack_context__.s([
    "CARDINALITY_LABELS",
    ()=>CARDINALITY_LABELS,
    "JOIN_TYPE_LABELS",
    ()=>JOIN_TYPE_LABELS,
    "analyzeJoin",
    ()=>analyzeJoin,
    "buildCombinedFields",
    ()=>buildCombinedFields,
    "detectGraphIssues",
    ()=>detectGraphIssues,
    "executeAppend",
    ()=>executeAppend,
    "executeJoin",
    ()=>executeJoin,
    "normalizeKey",
    ()=>normalizeKey,
    "preAggregate",
    ()=>preAggregate,
    "suggestRelations",
    ()=>suggestRelations,
    "typeCompatible",
    ()=>typeCompatible
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/digits.ts [app-client] (ecmascript)");
;
const JOIN_TYPE_LABELS = {
    inner: 'Inner Join — اشتراک تطبیق‌ها',
    left: 'Left Join — همه رکوردهای جدول اصلی',
    right: 'Right Join — همه رکوردهای جدول دوم',
    full: 'Full Outer Join — همه رکوردهای هر دو جدول',
    anti: 'Anti Join — رکوردهای بدون تطبیق',
    append: 'Append/Union — افزودن سطرهای هم‌ساختار'
};
const CARDINALITY_LABELS = {
    'one-to-one': 'یک‌به‌یک',
    'one-to-many': 'یک‌به‌چند',
    'many-to-one': 'چندبه‌یک',
    'many-to-many': 'چندبه‌چند',
    'unknown': 'نامشخص'
};
function normalizeKey(v) {
    if (v === null || v === undefined) return '';
    let s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(v)).trim().replace(/\s+/g, ' ');
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        // مقایسه عددی: ۰۵ و ۵ برابرند اما کدهای شناسه متنی حفظ می‌شوند
        const n = Number(s);
        if (Number.isFinite(n)) return String(n);
    }
    // یکسان‌سازی ی/ک عربی با فارسی
    s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    return s;
}
function keyOf(rec, pairs, side) {
    return pairs.map((p)=>normalizeKey(rec[side === 'from' ? p.fromFieldId : p.toFieldId])).join('§');
}
function isBlank(v) {
    return v === null || v === undefined || String(v).trim() === '';
}
// سازگاری نوع داده کلیدها — بخش ۱۶.۳ (سازگاری نوع داده کلیدها)
const FAMILY = {
    text: 'text',
    category: 'text',
    identifier: 'text',
    geo: 'text',
    boolean: 'text',
    integer: 'number',
    decimal: 'number',
    amount: 'number',
    percent: 'number',
    date: 'time',
    time: 'time',
    datetime: 'time'
};
function typeCompatible(a, b) {
    const fa = FAMILY[a] ?? 'text';
    const fb = FAMILY[b] ?? 'text';
    return fa === fb;
}
function buildCombinedFields(leftFields, rightFields, rightDatasetName) {
    const right = rightFields.map((f)=>({
            ...f,
            id: `j__${f.id}`,
            description: `از جدول «${rightDatasetName}»${f.description ? ' — ' + f.description : ''}`
        }));
    return {
        left: leftFields,
        right,
        combined: [
            ...leftFields,
            ...right
        ]
    };
}
function nullRecord(fields) {
    const out = {};
    for (const f of fields)out[f.id] = null;
    return out;
}
function executeJoin(leftRecs, rightRecs, pairs, joinType, fields) {
    if (pairs.length === 0) return [];
    const rightNulls = nullRecord(fields.right);
    const leftNulls = nullRecord(fields.left);
    const rightIndex = new Map();
    for (const r of rightRecs){
        const k = keyOf(r, pairs, 'to');
        if (k === '' || k.split('§').every((x)=>x === '')) continue; // کلید خالی تطبیق نمی‌خورد
        const arr = rightIndex.get(k);
        if (arr) arr.push(r);
        else rightIndex.set(k, [
            r
        ]);
    }
    const leftIndex = new Map();
    for (const l of leftRecs){
        const k = keyOf(l, pairs, 'from');
        const arr = leftIndex.get(k);
        if (arr) arr.push(l);
        else leftIndex.set(k, [
            l
        ]);
    }
    const out = [];
    switch(joinType){
        case 'inner':
        case 'left':
        case 'full':
            {
                for (const l of leftRecs){
                    const k = keyOf(l, pairs, 'from');
                    const matches = rightIndex.get(k);
                    if (matches && matches.length > 0) {
                        for (const r of matches)out.push({
                            ...l,
                            ...r
                        });
                    } else if (joinType !== 'inner') {
                        out.push({
                            ...l,
                            ...rightNulls
                        });
                    }
                }
                if (joinType === 'full') {
                    for (const r of rightRecs){
                        const k = keyOf(r, pairs, 'to');
                        if (!leftIndex.has(k)) out.push({
                            ...leftNulls,
                            ...r
                        });
                    }
                }
                return out;
            }
        case 'right':
            {
                for (const r of rightRecs){
                    const k = keyOf(r, pairs, 'to');
                    const matches = leftIndex.get(k);
                    if (matches && matches.length > 0) {
                        for (const l of matches)out.push({
                            ...l,
                            ...r
                        });
                    } else {
                        out.push({
                            ...leftNulls,
                            ...r
                        });
                    }
                }
                return out;
            }
        case 'anti':
            {
                for (const l of leftRecs){
                    const k = keyOf(l, pairs, 'from');
                    if (!rightIndex.has(k)) out.push({
                        ...l
                    });
                }
                return out;
            }
        default:
            return [];
    }
}
function executeAppend(a, b, aFields, bFields) {
    const warnings = [];
    // نگاشت فیلدها بر اساس برچسب (نام نمایشی) — فیلدهای مشترک هم‌راستا می‌شوند
    const byLabel = new Map(bFields.map((f)=>[
            f.label.trim(),
            f
        ]));
    const fields = aFields.map((f)=>{
        const match = byLabel.get(f.label.trim());
        if (match && !typeCompatible(f.type, match.type)) {
            warnings.push(`نوع ستون «${f.label}» در دو فایل متفاوت است (${f.type} در برابر ${match.type})؛ پس از افزودن یکسان‌سازی کنید.`);
        }
        return f;
    });
    const missing = bFields.filter((f)=>!aFields.some((x)=>x.label.trim() === f.label.trim()));
    for (const m of missing){
        warnings.push(`ستون «${m.label}» در فایل دوم وجود دارد اما در فایل اصلی نیست؛ برای رکوردهای فایل اصلی مقدار خالی در نظر گرفته شد.`);
        fields.push({
            ...m
        });
    }
    const align = (rec, own)=>{
        const out = {};
        for (const f of fields){
            const src = own.find((x)=>x.label.trim() === f.label.trim());
            out[f.id] = src ? rec[src.id] ?? null : null;
        }
        return out;
    };
    return {
        records: [
            ...a.map((r)=>align(r, aFields)),
            ...b.map((r)=>align(r, bFields))
        ],
        fields,
        warnings
    };
}
function preAggregate(recs, pairs, side, fields) {
    const keyFields = side === 'from' ? pairs.map((p)=>p.fromFieldId) : pairs.map((p)=>p.toFieldId);
    const measureFields = fields.filter((f)=>!keyFields.includes(f.id) && [
            'amount',
            'decimal',
            'integer',
            'percent'
        ].includes(f.type)).map((f)=>f.id);
    const groups = new Map();
    for (const r of recs){
        const k = keyOf(r, pairs, side);
        const arr = groups.get(k);
        if (arr) arr.push(r);
        else groups.set(k, [
            r
        ]);
    }
    const out = [];
    for (const group of groups.values()){
        const merged = {
            ...group[0]
        };
        for (const fid of measureFields){
            const vals = group.map((r)=>{
                const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$digits$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toLatinDigits"])(String(r[fid] ?? '')).replace(/[٫,\s]/g, (m)=>m === '٫' ? '.' : '');
                const n = parseFloat(s);
                return Number.isFinite(n) ? n : null;
            }).filter((v)=>v !== null);
            // جمع سنجه‌های جمع‌پذیر؛ سایر ستون‌ها اولین مقدار نگه داشته می‌شود
            if (vals.length > 0) merged[fid] = vals.reduce((a, b)=>a + b, 0);
        }
        out.push(merged);
    }
    return {
        records: out,
        aggregatedFields: measureFields
    };
}
function analyzeJoin(leftRecs, rightRecs, leftFields, rightFields, pairs, joinType, options) {
    const warnings = [];
    const errors = [];
    const typeIssues = [];
    const lById = new Map(leftFields.map((f)=>[
            f.id,
            f
        ]));
    const rById = new Map(rightFields.map((f)=>[
            f.id,
            f
        ]));
    // اعتبارسنجی جفت‌ستون‌ها
    for (const p of pairs){
        const lf = lById.get(p.fromFieldId);
        const rf = rById.get(p.toFieldId);
        if (!lf) errors.push(`ستون «${p.fromFieldId}» در جدول اصلی یافت نشد.`);
        if (!rf) errors.push(`ستون «${p.toFieldId}» در جدول دوم یافت نشد.`);
        if (lf && rf) {
            if (!typeCompatible(lf.type, rf.type)) {
                typeIssues.push(`نوع ستون «${lf.label}» (${lf.type}) با «${rf.label}» (${rf.type}) سازگار نیست — بخش ۱۶.۳ سند.`);
            }
        }
    }
    if (pairs.length === 0) errors.push('حداقل یک جفت‌ستون کلید باید انتخاب شود.');
    if (errors.length > 0) {
        return {
            status: 'blocked',
            typeCompatible: typeIssues.length === 0,
            typeIssues,
            leftNulls: 0,
            rightNulls: 0,
            leftDupGroups: 0,
            rightDupGroups: 0,
            leftMaxDup: 0,
            rightMaxDup: 0,
            matchPercent: 0,
            leftUnmatched: 0,
            rightUnmatched: 0,
            rowsBefore: {
                left: leftRecs.length,
                right: rightRecs.length
            },
            rowsAfter: 0,
            rowExplosion: false,
            cardinalityDetected: 'unknown',
            sampleRows: [],
            sampleFields: [],
            warnings,
            errors
        };
    }
    // تعداد مقادیر خالی کلید
    const leftNulls = leftRecs.filter((r)=>pairs.some((p)=>isBlank(r[p.fromFieldId]))).length;
    const rightNulls = rightRecs.filter((r)=>pairs.some((p)=>isBlank(r[p.toFieldId]))).length;
    // کلیدهای تکراری
    const dupStats = (recs, side)=>{
        const counts = new Map();
        for (const r of recs){
            const k = keyOf(r, pairs, side);
            if (k === '' || k.split('§').every((x)=>x === '')) continue;
            counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        let groups = 0;
        let maxDup = 0;
        for (const c of counts.values()){
            if (c > 1) groups++;
            if (c > maxDup) maxDup = c;
        }
        return {
            groups,
            maxDup
        };
    };
    const lDup = dupStats(leftRecs, 'from');
    const rDup = dupStats(rightRecs, 'to');
    // درصد تطبیق و رکوردهای بدون تطبیق
    const rightKeys = new Set();
    for (const r of rightRecs){
        const k = keyOf(r, pairs, 'to');
        if (k !== '' && !k.split('§').every((x)=>x === '')) rightKeys.add(k);
    }
    const leftKeys = new Set();
    for (const l of leftRecs){
        const k = keyOf(l, pairs, 'from');
        if (k !== '' && !k.split('§').every((x)=>x === '')) leftKeys.add(k);
    }
    let matched = 0;
    for (const k of leftKeys)if (rightKeys.has(k)) matched++;
    const matchPercent = leftKeys.size > 0 ? Math.round(matched / leftKeys.size * 1000) / 10 : 0;
    const leftUnmatched = leftKeys.size - matched;
    let secondSideUnmatched = 0;
    for (const k of rightKeys)if (!leftKeys.has(k)) secondSideUnmatched++;
    // تشخیص خودکار نوع رابطه — بخش ۱۶.۱
    const leftUnique = lDup.maxDup <= 1;
    const rightUnique = rDup.maxDup <= 1;
    const cardinalityDetected = leftUnique && rightUnique ? 'one-to-one' : leftUnique && !rightUnique ? 'one-to-many' : !leftUnique && rightUnique ? 'many-to-one' : 'many-to-many';
    const comb = buildCombinedFields(leftFields, rightFields, '');
    // محاسبه تعداد رکورد پس از اتصال برای joinType انتخابی
    const joined = executeJoin(leftRecs, rightRecs, pairs, joinType, {
        left: leftFields,
        right: comb.right
    });
    const rowsAfter = joined.length;
    const rowsBefore = {
        left: leftRecs.length,
        right: rightRecs.length
    };
    const rowExplosion = rowsAfter > Math.max(rowsBefore.left, rowsBefore.right) && rowsAfter >= Math.max(rowsBefore.left, rowsBefore.right) * 1.5;
    // هشدارها و مسدودسازی — بخش ۱۶.۳ و ۱۶.۴
    if (typeIssues.length > 0) warnings.push(...typeIssues);
    if (lDup.groups > 0) warnings.push(`جدول اصلی ${lDup.groups.toLocaleString('fa-IR')} گروه کلید تکراری دارد (بیشینه ${lDup.maxDup.toLocaleString('fa-IR')} بار)؛ نوع رابطه «چندبه‌یک» را بررسی کنید.`);
    if (rDup.groups > 0) warnings.push(`جدول دوم ${rDup.groups.toLocaleString('fa-IR')} گروه کلید تکراری دارد (بیشینه ${rDup.maxDup.toLocaleString('fa-IR')} بار)؛ رکوردهای جدول اصلی پس از اتصال تکثیر می‌شوند.`);
    if (leftNulls > 0) warnings.push(`${leftNulls.toLocaleString('fa-IR')} رکورد جدول اصلی کلید خالی دارد و در اتصال تطبیق نمی‌خورد.`);
    if (rightNulls > 0) warnings.push(`${rightNulls.toLocaleString('fa-IR')} رکورد جدول دوم کلید خالی دارد.`);
    if (matchPercent < 80) warnings.push(`درصد تطبیق ${matchPercent.toLocaleString('fa-IR')}٪ است؛ کلید نرمال‌سازی‌نشده یا ارزش‌های متفاوت را بررسی کنید (تطبیق پس از نرمال‌سازی ارقام فارسی و فاصله‌ها انجام شده است).`);
    if (rowExplosion) warnings.push(`هشدار افزایش غیرمنتظره سطر: از ${rowsBefore.left.toLocaleString('fa-IR')} به ${rowsAfter.toLocaleString('fa-IR')} رکورد — بخش ۱۶.۳ سند.`);
    let status = 'ok';
    let remedies;
    if (cardinalityDetected === 'many-to-many') {
        // جلوگیری از چندبرابرشدن مبالغ — بخش ۱۶.۴ سند
        status = 'blocked';
        errors.push('اتصال چندبه‌چند مسدود شد: در این حالت مبالغ و تعدادها بدون هشدار چندبرابر می‌شوند (بخش ۱۶.۴ سند). تا رفع مشکل، مدل نباید منتشر شود.');
        remedies = [
            'استفاده از جدول واسط (Bridge) برای بازکردن رابطه چندبه‌چند',
            'تجمیع پیش از اتصال: سطرهای سمت «چند» بر اساس کلید جمع شوند (در پرس‌وجوی اتصالی گزینه «تجمیع پیش از اتصال» را فعال کنید)',
            'استفاده از شمارش متمایز (countDistinct) به‌جای تعداد رکورد',
            'تعریف سنجه در جدول مناسب (جدولی که سطح جزئیاتش با سنجه هم‌خوان است)'
        ];
    } else if (joinType === 'append') {
        warnings.push('Append افزودن سطر است نه اتصال کلیدی؛ ساختار دو فایل باید هم‌ساختار باشد (تفاوت مهم بخش ۱۶.۲ سند).');
    } else if (rDup.groups > 0 && rowsAfter > rowsBefore.left) {
        status = 'warning';
        warnings.push('با اتصال فعلی، سنجه‌های جدول دوم در رکوردهای جدول اصلی تکثیر می‌شوند؛ برای جمع سنجه‌های جدول دوم گزینه «تجمیع پیش از اتصال» را فعال کنید (بخش ۱۶.۴ سند).');
    }
    if (options?.preAggregated && rDup.groups > 0) {
        warnings.push('گزینه تجمیع پیش از اتصال فعال است: سطرهای جدول دوم پیش از اتصال بر اساس کلید جمع شدند تا مبالغ چندبرابر نشوند (بخش ۱۶.۴ سند).');
    }
    return {
        status,
        typeCompatible: typeIssues.length === 0,
        typeIssues,
        leftNulls,
        rightNulls,
        leftDupGroups: lDup.groups,
        rightDupGroups: rDup.groups,
        leftMaxDup: lDup.maxDup,
        rightMaxDup: rDup.maxDup,
        matchPercent,
        leftUnmatched,
        rightUnmatched: secondSideUnmatched,
        rowsBefore,
        rowsAfter,
        rowExplosion,
        cardinalityDetected,
        sampleRows: joined.slice(0, 25),
        sampleFields: [
            ...leftFields,
            ...comb.right
        ],
        warnings,
        errors,
        remedies
    };
}
function detectGraphIssues(relations) {
    const issues = [];
    const active = relations.filter((r)=>r.status === 'active');
    // حلقه: جست‌وجوی عمقی روی گراف بی‌جهت
    const adj = new Map();
    const edgeOf = new Map();
    for (const r of active){
        if (!adj.has(r.fromDatasetId)) adj.set(r.fromDatasetId, []);
        if (!adj.has(r.toDatasetId)) adj.set(r.toDatasetId, []);
        adj.get(r.fromDatasetId).push(r.toDatasetId);
        adj.get(r.toDatasetId).push(r.fromDatasetId);
        edgeOf.set(`${r.fromDatasetId}§${r.toDatasetId}`, r.id);
        edgeOf.set(`${r.toDatasetId}§${r.fromDatasetId}`, r.id);
    }
    const nodes = [
        ...adj.keys()
    ];
    const visited = new Set();
    for (const start of nodes){
        if (visited.has(start)) continue;
        // DFS با ثبت والد برای شناسایی حلقه
        const stack = [
            {
                node: start,
                parent: '',
                path: [
                    start
                ]
            }
        ];
        const seenLocal = new Set();
        while(stack.length){
            const cur = stack.pop();
            if (seenLocal.has(cur.node)) continue;
            seenLocal.add(cur.node);
            visited.add(cur.node);
            for (const nb of adj.get(cur.node) ?? []){
                if (nb === cur.parent) continue;
                if (cur.path.includes(nb)) {
                    const cyclePath = cur.path.slice(cur.path.indexOf(nb)).concat(nb);
                    issues.push({
                        kind: 'cycle',
                        datasets: cyclePath,
                        message: 'حلقه در گراف روابط شناسایی شد؛ جهت اثر فیلترها مبهم می‌شود. یکی از روابط حلقه را غیرفعال یا جهت آن را مشخص کنید (بخش ۱۶.۳ سند).'
                    });
                } else {
                    stack.push({
                        node: nb,
                        parent: cur.node,
                        path: [
                            ...cur.path,
                            nb
                        ]
                    });
                }
            }
        }
    }
    // مسیر مبهم: دو رابطه مستقیم بین همان جفت جدول
    const pairCount = new Map();
    for (const r of active){
        const pair = [
            r.fromDatasetId,
            r.toDatasetId
        ].sort().join('§');
        pairCount.set(pair, (pairCount.get(pair) ?? 0) + 1);
    }
    for (const [pair, count] of pairCount){
        if (count > 1) {
            issues.push({
                kind: 'ambiguous',
                datasets: pair.split('§'),
                message: 'بین دو جدول بیش از یک رابطه فعال وجود دارد؛ مسیر اتصال مبهم است و باید فقط یکی فعال بماند (بخش ۱۶.۳ سند).'
            });
        }
    }
    return issues;
}
function simTokens(a, b) {
    const norm = (s)=>s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c_\-().]/g, ' ').split(/\s+/).map((t)=>t.trim()).filter(Boolean);
    const ta = new Set(norm(a));
    const tb = new Set(norm(b));
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta)if (tb.has(t)) inter++;
    return inter / new Set([
        ...norm(a),
        ...norm(b)
    ]).size;
}
function suggestRelations(datasets) {
    const out = [];
    for(let i = 0; i < datasets.length; i++){
        for(let j = i + 1; j < datasets.length; j++){
            const A = datasets[i];
            const B = datasets[j];
            let best = null;
            for (const fa of A.fields){
                if (![
                    'identifier',
                    'category',
                    'text'
                ].includes(fa.type)) continue;
                for (const fb of B.fields){
                    if (![
                        'identifier',
                        'category',
                        'text'
                    ].includes(fb.type)) continue;
                    if (!typeCompatible(fa.type, fb.type)) continue;
                    const na = fa.label.trim();
                    const nb = fb.label.trim();
                    let score = 0;
                    let reason = '';
                    if (na === nb) {
                        score = 0.98;
                        reason = `نام ستون «${na}» در هر دو جدول یکسان است`;
                    } else if (na.replace(/\s/g, '') === nb.replace(/\s/g, '')) {
                        score = 0.95;
                        reason = `نام ستون «${na}» و «${nb}» پس از حذف فاصله یکسان‌اند`;
                    } else {
                        const s = simTokens(na, nb);
                        if (s >= 0.5) {
                            score = s;
                            reason = `همخوانی نام «${na}» و «${nb}» حدود ${Math.round(s * 100)}٪ است`;
                        }
                    }
                    if (score >= 0.5 && (!best || score > best.score)) {
                        best = {
                            pairs: [
                                {
                                    fromFieldId: fa.id,
                                    toFieldId: fb.id
                                }
                            ],
                            score,
                            reason
                        };
                    }
                }
            }
            if (best) {
                out.push({
                    fromDatasetId: A.id,
                    toDatasetId: B.id,
                    fromDatasetName: A.name,
                    toDatasetName: B.name,
                    pairs: best.pairs,
                    score: Math.round(best.score * 100) / 100,
                    reason: best.reason
                });
            }
        }
    }
    return out.sort((a, b)=>b.score - a.score).slice(0, 10);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_lib_7c3e93be._.js.map