"use strict";
// maskingEngine.ts - Data Masking Engine for PII Protection (Refactored v1.6.0)
// Main orchestration layer - imports modular utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldMaskColumn = exports.formatOutputWithMaskingStats = exports.maskText = exports.showMaskingNotification = exports.updateMaskingStatusBar = exports.maskCsvText = exports.getMaskingConfig = exports.MaskingStrategy = exports.PiiType = void 0;
// Import all masking utilities from modular exports
const masking_1 = require("./masking");
Object.defineProperty(exports, "PiiType", { enumerable: true, get: function () { return 
    // Types and configuration
    masking_1.PiiType; } });
Object.defineProperty(exports, "MaskingStrategy", { enumerable: true, get: function () { return masking_1.MaskingStrategy; } });
Object.defineProperty(exports, "getMaskingConfig", { enumerable: true, get: function () { return masking_1.getMaskingConfig; } });
Object.defineProperty(exports, "shouldMaskColumn", { enumerable: true, get: function () { return 
    // CSV utilities
    masking_1.shouldMaskColumn; } });
Object.defineProperty(exports, "maskCsvText", { enumerable: true, get: function () { return 
    // CSV masking
    masking_1.maskCsvText; } });
var ui_1 = require("./masking/ui");
Object.defineProperty(exports, "updateMaskingStatusBar", { enumerable: true, get: function () { return ui_1.updateMaskingStatusBar; } });
Object.defineProperty(exports, "showMaskingNotification", { enumerable: true, get: function () { return ui_1.showMaskingNotification; } });
// ============================================================================
// MAIN MASKING ENGINE
// ============================================================================
function maskText(text, config, headers, isInCdata) {
    if (!config.enabled) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }
    // Apply preset configuration
    const effectiveConfig = (0, masking_1.applyPreset)(config);
    if (isInCdata) {
        console.log('[CDATA Config Debug] enabled:', effectiveConfig.enabled);
        console.log('[CDATA Config Debug] types.email:', effectiveConfig.types['email']);
        console.log('[CDATA Config Debug] types.phone:', effectiveConfig.types['phone']);
        console.log('[CDATA Config Debug] types.australianBSB:', effectiveConfig.types['australianBSB']);
    }
    const detections = [];
    const replacements = new Map();
    const positionReplacements = [];
    // Track CDATA character ranges to prevent double-processing by pattern matching
    const cdataRanges = [];
    // Map specific pattern types to their general configuration category
    const typeMapping = {
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
            if (!inner?.trim()) {
                continue;
            }
            if (replacements.has(inner)) {
                continue;
            }
            const innerResult = (0, masking_1.maskCdataContent)(inner, effectiveConfig);
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
                cdataRanges.push({ start: valueIndex, end: valueIndex + inner.length });
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
                if (!fieldName || !value) {
                    continue;
                }
                if (replacements.has(value)) {
                    continue;
                }
                if (!value.trim()) {
                    continue;
                }
                const maskedValue = maskByFieldName(value, fieldName, effectiveConfig.strategy, effectiveConfig);
                if (maskedValue !== null) {
                    const valueIndex = text.indexOf(value, match.index ?? 0);
                    const beforeMatch = text.substring(0, valueIndex);
                    const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
                    const lastNewline = beforeMatch.lastIndexOf('\n');
                    const column = valueIndex - (lastNewline + 1);
                    const patternType = (0, masking_1.detectColumnType)(fieldName);
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
    function isWithinCdataRange(index, length, ranges) {
        const matchEnd = index + length;
        return ranges.some(range => {
            return (index >= range.start && index < range.end) ||
                (matchEnd > range.start && matchEnd <= range.end) ||
                (index <= range.start && matchEnd >= range.end);
        });
    }
    const patternTypes = masking_1.patternFactory.getAllTypes();
    for (const type of patternTypes) {
        const pattern = masking_1.patternFactory.getPattern(type);
        if (!pattern) {
            continue;
        }
        const configKey = typeMapping[type] ?? type;
        if (!effectiveConfig.types[configKey] || !pattern.source) {
            continue;
        }
        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const originalValue = match[0];
            if (replacements.has(originalValue)) {
                continue;
            }
            if ((0, masking_1.isInsideFieldName)(text, match.index ?? 0, originalValue.length)) {
                continue;
            }
            if (type === 'dateOfBirth' && !(0, masking_1.shouldMaskAsDateOfBirth)(text, match.index ?? 0, originalValue)) {
                continue;
            }
            const confidence = (0, masking_1.calculateMaskingConfidence)(text, match.index ?? 0, originalValue, type);
            const contextBefore = text.substring(Math.max(0, (match.index ?? 0) - 100), match.index ?? 0);
            const contextAfter = text.substring((match.index ?? 0) + originalValue.length, Math.min(text.length, (match.index ?? 0) + originalValue.length + 100));
            const structureType = (0, masking_1.detectStructureType)(contextBefore, contextAfter);
            const effectiveStructureType = isInCdata && structureType === 'plain_text' ? 'xml' : structureType;
            const adaptiveThreshold = (0, masking_1.getAdaptiveThreshold)(effectiveConfig.confidenceThreshold, effectiveStructureType, type, effectiveConfig.mode);
            if (confidence < adaptiveThreshold) {
                continue;
            }
            if (isWithinCdataRange(match.index ?? 0, originalValue.length, cdataRanges)) {
                continue;
            }
            const maskFn = masking_1.MASKING_FUNCTIONS[type] ?? masking_1.maskGeneric;
            const strategyToUse = isXmlContent ? 'structural' : effectiveConfig.strategy;
            const maskedValue = maskFn(originalValue, strategyToUse);
            const beforeMatch = text.substring(0, match.index ?? 0);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = (match.index ?? 0) - (lastNewline + 1);
            detections.push({
                type: type,
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
        if (!customPattern.enabled) {
            continue;
        }
        const pattern = typeof customPattern.pattern === 'string'
            ? new RegExp(customPattern.pattern, 'g')
            : customPattern.pattern;
        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const originalValue = match[0];
            if (replacements.has(originalValue)) {
                continue;
            }
            const maskedValue = customPattern.replacement;
            const beforeMatch = text.substring(0, match.index ?? 0);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = (match.index ?? 0) - (lastNewline + 1);
            detections.push({
                type: masking_1.PiiType.Custom,
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
exports.maskText = maskText;
/**
 * Attempt to mask a value based on its field/tag name in JSON/XML
 * Returns masked value if field name matches sensitive patterns, or null if no match
 */
function maskByFieldName(value, fieldName, strategy, config) {
    const patternType = (0, masking_1.detectColumnType)(fieldName);
    // Check if this pattern type is enabled in config
    const configKey = patternType;
    if (config.types[configKey] === false) {
        return null;
    }
    // Get masking function
    const maskFn = masking_1.MASKING_FUNCTIONS[patternType] ?? masking_1.maskGeneric;
    return maskFn(value, strategy);
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function formatOutputWithMaskingStats(output, result, config) {
    if (!config.includeStats || result.detections.length === 0) {
        return output;
    }
    const statsByType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
        return acc;
    }, {});
    const statsLine = `// Data masked: ${Object.entries(statsByType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ')}`;
    return `${output}\n${statsLine}`;
}
exports.formatOutputWithMaskingStats = formatOutputWithMaskingStats;
//# sourceMappingURL=maskingEngine.js.map