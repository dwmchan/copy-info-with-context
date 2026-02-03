// maskingEngine.ts - Data Masking Engine for PII Protection (Refactored v1.6.0)
// Main orchestration layer - imports modular utilities

// Import all masking utilities from modular exports
import {
    // Types and configuration
    PiiType,
    MaskingStrategy,
    Detection,
    MaskedResult,
    CustomPattern,
    MaskingConfig,
    getMaskingConfig,

    // Pattern detection
    patternFactory,

    // Confidence scoring
    detectStructureType,
    getAdaptiveThreshold,
    calculateMaskingConfidence,
    isInsideFieldName,

    // Validators
    shouldMaskAsDateOfBirth,

    // Masking functions
    maskGeneric,

    // CSV utilities
    shouldMaskColumn,
    detectColumnType,

    // Presets
    applyPreset,

    // Masking functions registry
    MASKING_FUNCTIONS,

    // CSV masking
    maskCsvText,

    // CDATA utilities
    maskCdataContent
} from './masking';

import { updateMaskingStatusBar, showMaskingNotification } from './masking/ui';

// Re-export types for backward compatibility
export {
    PiiType,
    MaskingStrategy,
    Detection,
    MaskedResult,
    CustomPattern,
    MaskingConfig,
    getMaskingConfig,
    maskCsvText
};

export { updateMaskingStatusBar, showMaskingNotification } from './masking/ui';

// ============================================================================
// MAIN MASKING ENGINE
// ============================================================================
export function maskText(text: string, config: MaskingConfig, headers?: string[], isInCdata?: boolean): MaskedResult {
    if (!config.enabled) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }

    // Apply preset configuration
    const effectiveConfig = applyPreset(config);

    if (isInCdata) {
        console.log('[CDATA Config Debug] enabled:', effectiveConfig.enabled);
        console.log('[CDATA Config Debug] types.email:', effectiveConfig.types['email']);
        console.log('[CDATA Config Debug] types.phone:', effectiveConfig.types['phone']);
        console.log('[CDATA Config Debug] types.australianBSB:', effectiveConfig.types['australianBSB']);
    }

    const detections: Detection[] = [];
    const replacements: Map<string, string> = new Map();

    // Track position-specific replacements to avoid masking field names
    interface PositionReplacement {
        index: number;
        length: number;
        maskedValue: string;
    }
    const positionReplacements: PositionReplacement[] = [];

    // Track CDATA character ranges to prevent double-processing by pattern matching
    const cdataRanges: Array<{start: number; end: number}> = [];

    // Map specific pattern types to their general configuration category
    const typeMapping: Record<string, string> = {
        'creditCardVisa': 'creditCard',
        'creditCardMastercard': 'creditCard',
        'creditCardAmex': 'creditCard',
        'creditCardGeneric': 'creditCard',
        'australianPassport': 'passportNumber',
        'usPassport': 'passportNumber',
        'ukPassport': 'passportNumber',
        'euPassport': 'passportNumber',
        'australianDriversLicense': 'driversLicense',
        'usDriversLicense': 'driversLicense',
        'ukDriversLicense': 'driversLicense',
        'ukNationalInsurance': 'nationalID',
        'australianAccountNumber': 'accountNumber',
        'australianPhone': 'phone',
        'ipv4': 'ipAddress',
        'ipv6': 'ipAddress'
    };

    // Detect if this is JSON or XML content
    const isJsonContent = /^\s*[[{]/.test(text) || /"[^"]+"\s*:/.test(text);
    const isXmlContent = /<[^>]+>/.test(text);

    if (isJsonContent || isXmlContent) {
        const cdataPattern = /<([^>\s/]+)>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/\1>/g;
        cdataPattern.lastIndex = 0;
        const cdataMatches = Array.from(text.matchAll(cdataPattern));
        for (const cm of cdataMatches) {
            const inner = cm[2];
            if (!inner?.trim()) {continue;}
            if (replacements.has(inner)) {continue;}

            const innerResult = maskCdataContent(inner, effectiveConfig);
            const maskedInner = innerResult.maskedText;

            if (maskedInner !== inner) {
                const matchIndex = cm.index ?? 0;
                const offsetInMatch = cm[0].indexOf(inner);
                const valueIndex = matchIndex + offsetInMatch;

                replacements.set(inner, maskedInner);
                positionReplacements.push({
                    index: valueIndex,
                    length: inner.length,
                    maskedValue: maskedInner
                });

                cdataRanges.push({start: valueIndex, end: valueIndex + inner.length});

                const beforeMatch = text.substring(0, valueIndex);
                const baseLine = (beforeMatch.match(/\n/g) ?? []).length + 1;
                const lastNewlineIdx = beforeMatch.lastIndexOf('\n');
                const baseColumnOffset = valueIndex - (lastNewlineIdx + 1);

                for (const d of innerResult.detections) {
                    const globalLine = baseLine + (d.line - 1);
                    let globalColumn = d.column;
                    if (d.line === 1) {
                        globalColumn = baseColumnOffset + d.column;
                    }

                    detections.push({
                        type: d.type,
                        originalValue: d.originalValue,
                        maskedValue: d.maskedValue,
                        line: globalLine,
                        column: globalColumn,
                        confidence: d.confidence
                    });
                }
            }
        }

        const valuePatterns = [
            /"([^"]+)"\s*:\s*"([^"]+)"/g,
            /"([^"]+)"\s*:\s*([0-9\s-]+)/g,
            /<([^>\s/]+)>([^<]+)<\/\1>/g
        ];

        for (const valuePattern of valuePatterns) {
            valuePattern.lastIndex = 0;
            const matches = Array.from(text.matchAll(valuePattern));

            for (const match of matches) {
                const fieldName = match[1];
                const value = match[2];
                if (!fieldName || !value) {continue;}
                if (replacements.has(value)) {continue;}
                if (!value.trim()) {continue;}

                const maskedValue = maskByFieldName(value, fieldName, effectiveConfig.strategy, effectiveConfig);

                if (maskedValue !== null) {
                    const valueIndex = text.indexOf(value, match.index ?? 0);
                    const beforeMatch = text.substring(0, valueIndex);
                    const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
                    const lastNewline = beforeMatch.lastIndexOf('\n');
                    const column = valueIndex - (lastNewline + 1);

                    const patternType = detectColumnType(fieldName) as PiiType;

                    detections.push({
                        type: patternType,
                        originalValue: value,
                        maskedValue,
                        line,
                        column,
                        confidence: 0.95
                    });

                    replacements.set(value, maskedValue);
                    positionReplacements.push({
                        index: valueIndex,
                        length: value.length,
                        maskedValue
                    });
                }
            }
        }
    }

    function isWithinCdataRange(index: number, length: number, ranges: Array<{start: number; end: number}>): boolean {
        const matchEnd = index + length;
        return ranges.some(range => {
            return (index >= range.start && index < range.end) ||
                   (matchEnd > range.start && matchEnd <= range.end) ||
                   (index <= range.start && matchEnd >= range.end);
        });
    }

    const patternTypes = patternFactory.getAllTypes();
    for (const type of patternTypes) {
        const pattern = patternFactory.getPattern(type);
        if (!pattern) {continue;}
        const configKey = typeMapping[type] ?? type;

        if (!effectiveConfig.types[configKey] || !pattern.source) {continue;}

        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
            const originalValue = match[0];
            if (replacements.has(originalValue)) {continue;}
            if (isInsideFieldName(text, match.index ?? 0, originalValue.length)) {
                continue;
            }

            if (type === 'dateOfBirth' && !shouldMaskAsDateOfBirth(text, match.index ?? 0, originalValue)) {
                continue;
            }

            const confidence = calculateMaskingConfidence(text, match.index ?? 0, originalValue, type);

            const contextBefore = text.substring(Math.max(0, (match.index ?? 0) - 100), match.index ?? 0);
            const contextAfter = text.substring((match.index ?? 0) + originalValue.length, Math.min(text.length, (match.index ?? 0) + originalValue.length + 100));
            const structureType = detectStructureType(contextBefore, contextAfter);
            const effectiveStructureType = isInCdata && structureType === 'plain_text' ? 'xml' : structureType;

            const adaptiveThreshold = getAdaptiveThreshold(
                effectiveConfig.confidenceThreshold,
                effectiveStructureType,
                type,
                effectiveConfig.mode
            );

            if (confidence < adaptiveThreshold) {
                continue;
            }

            if (isWithinCdataRange(match.index ?? 0, originalValue.length, cdataRanges)) {
                continue;
            }

            const maskFn = MASKING_FUNCTIONS[type] ?? maskGeneric;
            const strategyToUse = isXmlContent ? 'structural' : effectiveConfig.strategy;
            const maskedValue = maskFn(originalValue, strategyToUse);

            const beforeMatch = text.substring(0, match.index ?? 0);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = (match.index ?? 0) - (lastNewline + 1);

            detections.push({
                type: type as PiiType,
                originalValue,
                maskedValue,
                line,
                column,
                confidence
            });

            replacements.set(originalValue, maskedValue);
            positionReplacements.push({
                index: match.index ?? 0,
                length: originalValue.length,
                maskedValue
            });
        }
    }

    for (const customPattern of effectiveConfig.customPatterns) {
        if (!customPattern.enabled) {continue;}

        const pattern = typeof customPattern.pattern === 'string'
            ? new RegExp(customPattern.pattern, 'g')
            : customPattern.pattern;

        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
            const originalValue = match[0];
            if (replacements.has(originalValue)) {continue;}

            const maskedValue = customPattern.replacement;

            const beforeMatch = text.substring(0, match.index ?? 0);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = (match.index ?? 0) - (lastNewline + 1);

            detections.push({
                type: PiiType.Custom,
                originalValue,
                maskedValue,
                line,
                column,
                confidence: 1.0
            });

            replacements.set(originalValue, maskedValue);
            positionReplacements.push({
                index: match.index ?? 0,
                length: originalValue.length,
                maskedValue
            });
        }
    }

    const cdataReplacements = positionReplacements.filter(r => r.maskedValue.length === r.length);
    const patternReplacements = positionReplacements.filter(r => r.maskedValue.length !== r.length);

    let maskedText = text;

    const sortedCdataReplacements = cdataReplacements.sort((a, b) => b.index - a.index);
    for (const replacement of sortedCdataReplacements) {
        const before = maskedText.substring(0, replacement.index);
        const after = maskedText.substring(replacement.index + replacement.length);
        maskedText = before + replacement.maskedValue + after;
    }

    const sortedPatternReplacements = patternReplacements.sort((a, b) => b.index - a.index);
    let cumulativeOffset = 0;
    for (const replacement of sortedPatternReplacements) {
        const adjustedIndex = replacement.index + cumulativeOffset;
        const before = maskedText.substring(0, adjustedIndex);
        const after = maskedText.substring(adjustedIndex + replacement.length);
        maskedText = before + replacement.maskedValue + after;
        const lengthDiff = replacement.maskedValue.length - replacement.length;
        cumulativeOffset += lengthDiff;
    }

    return {
        maskedText,
        detections,
        maskingApplied: detections.length > 0
    };
}


/**
 * Attempt to mask a value based on its field/tag name in JSON/XML
 * Returns masked value if field name matches sensitive patterns, or null if no match
 */
function maskByFieldName(
    value: string,
    fieldName: string,
    strategy: string,
    config: MaskingConfig
): string | null {
    const patternType = detectColumnType(fieldName);

    // Check if this pattern type is enabled in config
    const configKey = patternType ;
    if (config.types[configKey] === false) {
        return null;
    }

    // Get masking function
    const maskFn = MASKING_FUNCTIONS[patternType] ?? maskGeneric;
    return maskFn(value, strategy);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatOutputWithMaskingStats(output: string, result: MaskedResult, config: MaskingConfig): string {
    if (!config.includeStats || result.detections.length === 0) {
        return output;
    }

    const statsByType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
        return acc;
    }, {} as Record<PiiType, number>);

    const statsLine = `// Data masked: ${Object.entries(statsByType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ')}`;

    return `${output}\n${statsLine}`;
}
export { shouldMaskColumn };

