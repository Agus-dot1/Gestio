"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNumber = exports.formatCurrency = exports.DEFAULT_CURRENCY = exports.DEFAULT_LOCALE = void 0;
exports.DEFAULT_LOCALE = 'es-AR';
exports.DEFAULT_CURRENCY = 'ARS';
function formatCurrency(value) {
    try {
        return new Intl.NumberFormat(exports.DEFAULT_LOCALE, { style: 'currency', currency: exports.DEFAULT_CURRENCY }).format(Number(value || 0));
    }
    catch {
        return String(value ?? 0);
    }
}
exports.formatCurrency = formatCurrency;
function formatNumber(value) {
    try {
        return new Intl.NumberFormat(exports.DEFAULT_LOCALE).format(Number(value || 0));
    }
    catch {
        return String(value ?? 0);
    }
}
exports.formatNumber = formatNumber;
//# sourceMappingURL=locale.js.map