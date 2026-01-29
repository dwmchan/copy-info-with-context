// Module-level caches
export const regexEscapeCache = new Map<string, string>();
export const tagCountCache = new Map<string, number>();

// Helper function to escape regex special characters
export function escapeRegexSpecialChars(str: string): string {
    if (regexEscapeCache.has(str)) {
        const cached = regexEscapeCache.get(str); if (cached !== undefined) { return cached; }
    }

    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (regexEscapeCache.size < 100) {
        regexEscapeCache.set(str, escaped);
    }

    return escaped;
}

