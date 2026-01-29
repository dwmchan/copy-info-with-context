"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeRegexSpecialChars = exports.tagCountCache = exports.regexEscapeCache = void 0;
// Module-level caches
exports.regexEscapeCache = new Map();
exports.tagCountCache = new Map();
// Helper function to escape regex special characters
function escapeRegexSpecialChars(str) {
    if (exports.regexEscapeCache.has(str)) {
        const cached = exports.regexEscapeCache.get(str);
        if (cached !== undefined) {
            return cached;
        }
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (exports.regexEscapeCache.size < 100) {
        exports.regexEscapeCache.set(str, escaped);
    }
    return escaped;
}
exports.escapeRegexSpecialChars = escapeRegexSpecialChars;
//# sourceMappingURL=cache.js.map