module.exports = [
"[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/[externals]_pg_e5ad4e6e._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
    });
});
}),
"[project]/node_modules/mysql2/promise.js [instrumentation] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/node_modules_mysql2_fff38724._.js",
  "server/chunks/node_modules_iconv-lite_362643cd._.js",
  "server/chunks/node_modules_aws-ssl-profiles_lib_91d9059f._.js",
  "server/chunks/node_modules_858e79bc._.js",
  "server/chunks/[externals]__d2b0770b._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/mysql2/promise.js [instrumentation] (ecmascript)");
    });
});
}),
];