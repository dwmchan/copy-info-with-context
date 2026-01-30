// cdata.ts - Specialized masking for XML CDATA sections
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts

import { MaskingConfig, Detection, PiiType } from './config';
import { patternFactory } from './patterns';

/**
 * Masks PII patterns in CDATA content with EXACT length preservation
 * This function guarantees that the masked output has the exact same character count as the input
 * to prevent XML corruption when using position-based text replacement.
 *
 * @param cdataContent - The raw CDATA content (without CDATA markers)
 * @param config - Masking configuration
 * @returns Object with maskedText (same length as input) and detections array
 */
export function maskCdataContent(cdataContent: string, config: MaskingConfig): { maskedText: string; detections: Detection[] } {
    if (!config.enabled || !cdataContent) {
        return { maskedText: cdataContent, detections: [] };
    }

    const detections: Detection[] = [];
    let maskedText = cdataContent;

    interface Replacement {
        start: number;
        end: number;
        original: string;
        masked: string;
    }
    const replacements: Replacement[] = [];

    const patternTypes = patternFactory.getAllTypes();

    for (const type of patternTypes) {
        const configKey = type;
        if (config.types[configKey] === false) {
            continue;
        }

        const pattern = patternFactory.getPattern(type);
        if (!pattern) {continue;}

        pattern.lastIndex = 0;
        const matches = Array.from(cdataContent.matchAll(pattern));

        for (const match of matches) {
            if (!match.index) {continue;}

            const originalValue = match[0];
            const matchStart = match.index;
            const matchEnd = matchStart + originalValue.length;

            const hasOverlap = replacements.some(r =>
                (matchStart >= r.start && matchStart < r.end) ||
                (matchEnd > r.start && matchEnd <= r.end) ||
                (matchStart <= r.start && matchEnd >= r.end)
            );
            if (hasOverlap) {continue;}

            const maskedValue = '*'.repeat(originalValue.length);

            replacements.push({
                start: matchStart,
                end: matchEnd,
                original: originalValue,
                masked: maskedValue
            });

            const beforeMatch = cdataContent.substring(0, matchStart);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = matchStart - (lastNewline + 1);

            detections.push({
                type: type as PiiType,
                originalValue,
                maskedValue,
                line,
                column,
                confidence: 0.95
            });
        }
    }

    replacements.sort((a, b) => b.start - a.start);

    for (const replacement of replacements) {
        maskedText = maskedText.substring(0, replacement.start) +
                     replacement.masked +
                     maskedText.substring(replacement.end);
    }

    if (maskedText.length !== cdataContent.length) {
        console.error('[CDATA Masking ERROR] Length mismatch!');
        return { maskedText: cdataContent, detections: [] };
    }

    return { maskedText, detections };
}