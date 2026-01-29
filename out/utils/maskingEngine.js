"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldMaskColumn = exports.formatOutputWithMaskingStats = exports.maskCsvText = exports.maskText = exports.showMaskingNotification = exports.updateMaskingStatusBar = exports.getMaskingConfig = exports.MaskingStrategy = exports.PiiType = void 0;
// maskingEngine.ts - Data Masking Engine for PII Protection (Refactored v1.6.0)
// Main orchestration layer - imports modular utilities
const vscode = __importStar(require("vscode"));
// Import all masking utilities from modular exports
const masking_1 = require("./masking");
Object.defineProperty(exports, "PiiType", { enumerable: true, get: function () { return 
    // Types and configuration
    masking_1.PiiType; } });
Object.defineProperty(exports, "MaskingStrategy", { enumerable: true, get: function () { return masking_1.MaskingStrategy; } });
Object.defineProperty(exports, "getMaskingConfig", { enumerable: true, get: function () { return masking_1.getMaskingConfig; } });
Object.defineProperty(exports, "shouldMaskColumn", { enumerable: true, get: function () { return masking_1.shouldMaskColumn; } });
function applyPreset(config) {
    if (config.preset === 'none' || config.preset === 'custom') {
        return config;
    }
    const preset = MASKING_PRESETS[config.preset];
    if (!preset) {
        return config;
    }
    // Enable only the types in the preset
    const types = { ...config.types };
    for (const key of Object.keys(types)) {
        types[key] = preset.enabledTypes.includes(key);
    }
    return { ...config, types };
}
// Add minimal preset definitions local to this module so applyPreset can use them
const MASKING_PRESETS = {
    default: {
        name: 'default',
        description: 'Default masking: common sensitive types enabled',
        enabledTypes: [
            'email',
            'phone',
            'creditCard',
            'ssn',
            'dateOfBirth',
            'passportNumber',
            'driversLicense',
            'nationalID',
            'address'
        ]
    },
    privacy: {
        name: 'privacy',
        description: 'Privacy-first preset: mask almost everything',
        enabledTypes: Object.keys((() => {
            // include all known types conservatively
            return {
                email: true, phone: true, creditCard: true, ssn: true, dateOfBirth: true,
                passportNumber: true, driversLicense: true, nationalID: true, address: true,
                ipAddress: true, iban: true, swift: true, accountNumber: true
            };
        })())
    },
    strict: {
        name: 'strict',
        description: 'Strict: mask all configured types except custom',
        enabledTypes: [
            // Add a broad list; fine to expand as necessary
            'email', 'phone', 'creditCard', 'ssn', 'dateOfBirth', 'passportNumber', 'driversLicense', 'nationalID',
            'address', 'ipAddress', 'iban', 'swift', 'accountNumber', 'custom'
        ]
    }
};
// ============================================================================
// MASKING FUNCTIONS
// ============================================================================
const MASKING_FUNCTIONS = {
    email: masking_1.maskEmail,
    phone: masking_1.maskPhone,
    australianPhone: masking_1.maskPhone,
    ssn: masking_1.maskSSN,
    dateOfBirth: masking_1.maskDateOfBirth,
    // Identity Documents
    passportNumber: masking_1.maskPassport,
    driversLicense: masking_1.maskDriversLicense,
    nationalID: masking_1.maskNationalID,
    australianPassport: masking_1.maskPassport,
    australianDriversLicense: masking_1.maskDriversLicense,
    usPassport: masking_1.maskPassport,
    usDriversLicense: masking_1.maskDriversLicense,
    ukPassport: masking_1.maskPassport,
    ukDriversLicense: masking_1.maskDriversLicense,
    ukNationalInsurance: masking_1.maskNationalID,
    euPassport: masking_1.maskPassport,
    creditCardVisa: masking_1.maskCreditCard,
    creditCardMastercard: masking_1.maskCreditCard,
    creditCardAmex: masking_1.maskCreditCard,
    creditCardGeneric: masking_1.maskCreditCard,
    accountNumber: masking_1.maskAccountNumber,
    australianAccountNumber: masking_1.maskAccountNumber,
    ipv4: masking_1.maskIPAddress,
    ipv6: masking_1.maskIPAddress,
    nmi: masking_1.maskGeneric,
    address: masking_1.maskAddress,
    australianBSB: masking_1.maskAustralianBSB,
    australianTFN: masking_1.maskAustralianTFN,
    australianABN: masking_1.maskAustralianABN,
    australianMedicare: masking_1.maskGeneric,
    clientNumber: masking_1.maskAccountNumber,
    referenceNumber: masking_1.maskGeneric,
    policyNumber: masking_1.maskGeneric,
    transactionID: masking_1.maskGeneric,
    iban: masking_1.maskGeneric,
    swift: masking_1.maskGeneric,
    routingNumber: masking_1.maskGeneric,
    custom: masking_1.maskGeneric
};
// ============================================================================
// STATUS BAR INDICATOR
// ============================================================================
let maskingStatusBarItem;
function updateMaskingStatusBar(result, config) {
    if (!config.showIndicator) {
        return;
    }
    if (!maskingStatusBarItem) {
        maskingStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }
    if (config.enabled) {
        if (result.detections.length > 0) {
            maskingStatusBarItem.text = `$(shield) ${result.detections.length} masked`;
            maskingStatusBarItem.tooltip = `Data masking active: ${result.detections.length} items masked`;
            maskingStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else {
            maskingStatusBarItem.text = '$(shield) Masking Active';
            maskingStatusBarItem.tooltip = 'Data masking enabled (no sensitive data detected)';
            maskingStatusBarItem.backgroundColor = undefined;
        }
        maskingStatusBarItem.show();
        // Auto-hide after 5 seconds
        setTimeout(() => maskingStatusBarItem?.hide(), 5000);
    }
}
exports.updateMaskingStatusBar = updateMaskingStatusBar;
function showMaskingNotification(result, _config) {
    if (result.detections.length === 0) {
        return;
    }
    const byType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] ?? 0) + 1;
        return acc;
    }, {});
    const details = Object.entries(byType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
    void vscode.window.showInformationMessage(`Copied with ${result.detections.length} item${result.detections.length > 1 ? 's' : ''} masked: ${details}`, 'Settings').then(selection => {
        if (selection === 'Settings') {
            void vscode.commands.executeCommand('workbench.action.openSettings', 'copyInfoWithContext.masking');
        }
    });
}
exports.showMaskingNotification = showMaskingNotification;
// ============================================================================
// DEDICATED CDATA MASKING FUNCTION
// ============================================================================
/**
 * Masks PII patterns in CDATA content with EXACT length preservation
 * This function guarantees that the masked output has the exact same character count as the input
 * to prevent XML corruption when using position-based text replacement.
 *
 * @param cdataContent - The raw CDATA content (without CDATA markers)
 * @param config - Masking configuration
 * @returns Object with maskedText (same length as input) and detections array
 */
function maskCdataContent(cdataContent, config) {
    if (!config.enabled || !cdataContent) {
        return { maskedText: cdataContent, detections: [] };
    }
    const detections = [];
    let maskedText = cdataContent;
    const replacements = [];
    // Get all pattern types to scan
    const patternTypes = masking_1.patternFactory.getAllTypes();
    // Scan for each PII pattern
    for (const type of patternTypes) {
        // Check if this pattern type is enabled in config
        const configKey = type;
        if (config.types[configKey] === false) {
            continue;
        }
        const pattern = masking_1.patternFactory.getPattern(type);
        if (!pattern) {
            continue;
        }
        pattern.lastIndex = 0;
        const matches = Array.from(cdataContent.matchAll(pattern));
        for (const match of matches) {
            if (!match.index) {
                continue;
            }
            const originalValue = match[0];
            const matchStart = match.index;
            const matchEnd = matchStart + originalValue.length;
            // Check for overlaps with existing replacements
            const hasOverlap = replacements.some(r => (matchStart >= r.start && matchStart < r.end) ||
                (matchEnd > r.start && matchEnd <= r.end) ||
                (matchStart <= r.start && matchEnd >= r.end));
            if (hasOverlap) {
                continue;
            }
            // Create exact-length masked value: replace every character with asterisk
            const maskedValue = '*'.repeat(originalValue.length);
            // Record this replacement
            replacements.push({
                start: matchStart,
                end: matchEnd,
                original: originalValue,
                masked: maskedValue
            });
            // Calculate line and column for detection
            const beforeMatch = cdataContent.substring(0, matchStart);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = matchStart - (lastNewline + 1);
            detections.push({
                type: type,
                originalValue,
                maskedValue,
                line,
                column,
                confidence: 0.95 // High confidence for CDATA pattern detection
            });
        }
    }
    // Sort replacements by position (descending) to apply from end to start
    replacements.sort((a, b) => b.start - a.start);
    // Apply all replacements
    for (const replacement of replacements) {
        maskedText = maskedText.substring(0, replacement.start) +
            replacement.masked +
            maskedText.substring(replacement.end);
    }
    // CRITICAL VERIFICATION: Ensure exact length preservation
    if (maskedText.length !== cdataContent.length) {
        console.error('[CDATA Masking ERROR] Length mismatch!');
        console.error('[CDATA Masking ERROR] Original length:', cdataContent.length);
        console.error('[CDATA Masking ERROR] Masked length:', maskedText.length);
        console.error('[CDATA Masking ERROR] Difference:', maskedText.length - cdataContent.length);
        // Return original to prevent corruption
        return { maskedText: cdataContent, detections: [] };
    }
    return { maskedText, detections };
}
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
    const effectiveConfig = applyPreset(config);
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
    // ========================================================================
    // FIELD-NAME-BASED DETECTION (JSON/XML)
    // Check field names first - higher confidence than pattern matching
    // ========================================================================
    // Detect if this is JSON or XML content
    const isJsonContent = /^\s*[[{]/.test(text) || /"[^"]+"\s*:/.test(text);
    const isXmlContent = /<[^>]+>/.test(text);
    if (isJsonContent || isXmlContent) {
        // Handle CDATA sections explicitly: mask content inside <![CDATA[ ... ]]> without touching tag names
        // Pattern explanation:
        // - <([^>\s/]+)> - opening tag (captured as group 1)
        // - \s* - optional whitespace/newlines after opening tag
        // - <!\[CDATA\[ - literal CDATA start marker
        // - ([\s\S]*?) - CDATA content (captured as group 2), non-greedy
        // - \]\]> - literal CDATA end marker
        // - \s* - optional whitespace/newlines before closing tag
        // - <\/\1> - closing tag (must match opening tag name)
        const cdataPattern = /<([^>\s/]+)>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/\1>/g;
        cdataPattern.lastIndex = 0;
        const cdataMatches = Array.from(text.matchAll(cdataPattern));
        for (const cm of cdataMatches) {
            const inner = cm[2];
            if (!inner?.trim()) {
                continue;
            }
            // Skip if already handled
            if (replacements.has(inner)) {
                continue;
            }
            // Use dedicated CDATA masking function with guaranteed exact-length preservation
            // This replaces the recursive maskText() approach to ensure NO XML corruption
            console.log('[CDATA Debug] Processing CDATA content with maskCdataContent(), length:', inner.length);
            console.log('[CDATA Debug] First 200 chars:', inner.substring(0, 200));
            const innerResult = maskCdataContent(inner, effectiveConfig);
            const maskedInner = innerResult.maskedText;
            console.log('[CDATA Debug] Inner masking result - changed:', maskedInner !== inner, 'detections:', innerResult.detections.length);
            console.log('[CDATA Debug] Original inner length:', inner.length, 'Masked inner length:', maskedInner.length, 'Length diff:', maskedInner.length - inner.length);
            console.log('[CDATA Debug] Masked first 150 chars:', maskedInner.substring(0, 150));
            // Only register if something changed (avoids unnecessary replacements)
            if (maskedInner !== inner) {
                // Calculate absolute index of inner content in original text (match.index + offset)
                const matchIndex = cm.index ?? 0;
                const offsetInMatch = cm[0].indexOf(inner);
                const valueIndex = matchIndex + offsetInMatch;
                console.log('[CDATA Replace Debug] About to register CDATA replacement:');
                console.log('  - Position in original text:', valueIndex);
                console.log('  - Original length:', inner.length);
                console.log('  - Masked length:', maskedInner.length);
                console.log('  - Full match:', cm[0].substring(0, 100));
                // Add replacement for the inner CDATA content
                replacements.set(inner, maskedInner);
                positionReplacements.push({
                    index: valueIndex,
                    length: inner.length,
                    maskedValue: maskedInner
                });
                // Track this CDATA range to prevent pattern matching from re-processing it
                cdataRanges.push({ start: valueIndex, end: valueIndex + inner.length });
                // Map inner detections back to global text positions and add to detections
                const beforeMatch = text.substring(0, valueIndex);
                const baseLine = (beforeMatch.match(/\n/g) ?? []).length + 1;
                const lastNewlineIdx = beforeMatch.lastIndexOf('\n');
                const baseColumnOffset = valueIndex - (lastNewlineIdx + 1);
                for (const d of innerResult.detections) {
                    // Convert inner detection line/column to global line/column
                    const globalLine = baseLine + (d.line - 1);
                    let globalColumn = d.column;
                    if (d.line === 1) {
                        // if inner detection on first inner line, add our base column offset
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
        // Find all potential field values (quoted strings and unquoted values)
        const valuePatterns = [
            /"([^"]+)"\s*:\s*"([^"]+)"/g,
            /"([^"]+)"\s*:\s*([0-9\s-]+)/g,
            /<([^>\s/]+)>([^<]+)<\/\1>/g // XML: <field>value</field>
        ];
        for (const valuePattern of valuePatterns) {
            valuePattern.lastIndex = 0;
            const matches = Array.from(text.matchAll(valuePattern));
            for (const match of matches) {
                const fieldName = match[1];
                const value = match[2];
                // Skip if field name or value is undefined
                if (!fieldName || !value) {
                    continue;
                }
                // Skip if already detected
                if (replacements.has(value)) {
                    continue;
                }
                // Skip if value is empty or just whitespace
                if (!value.trim()) {
                    continue;
                }
                // Attempt to mask by field name
                const maskedValue = maskByFieldName(value, fieldName, effectiveConfig.strategy, effectiveConfig);
                if (maskedValue !== null) {
                    // Calculate position info
                    const valueIndex = text.indexOf(value, match.index);
                    const beforeMatch = text.substring(0, valueIndex);
                    const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
                    const lastNewline = beforeMatch.lastIndexOf('\n');
                    const column = valueIndex - (lastNewline + 1);
                    // Determine pattern type for detection
                    const patternType = (0, masking_1.detectColumnType)(fieldName);
                    detections.push({
                        type: patternType,
                        originalValue: value,
                        maskedValue,
                        line,
                        column,
                        confidence: 0.95 // High confidence for field-name-based detection
                    });
                    // Store replacement (both map and position-specific)
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
    // Helper function to check if a match position overlaps with any CDATA range
    function isWithinCdataRange(index, length, ranges) {
        const matchEnd = index + length;
        return ranges.some(range => {
            // Check for any overlap: match starts inside, ends inside, or completely encompasses range
            return (index >= range.start && index < range.end) ||
                (matchEnd > range.start && matchEnd <= range.end) ||
                (index <= range.start && matchEnd >= range.end);
        });
    }
    // ========================================================================
    // PATTERN-BASED DETECTION
    // Runs for ALL content types (not just JSON/XML)
    // ========================================================================
    if (isInCdata) {
        const allTypes = masking_1.patternFactory.getAllTypes();
        console.log('[CDATA Pattern Loop] About to start pattern loop, pattern count:', allTypes.length);
        console.log('[CDATA Pattern Loop] First few patterns:', allTypes.slice(0, 5));
    }
    // Pattern-based detection - collect all matches first
    // NOTE: Use patternFactory.getAllTypes() instead of Object.entries(DETECTION_PATTERNS)
    // because DETECTION_PATTERNS is a Proxy and Object.entries() doesn't trigger the ownKeys trap
    const patternTypes = masking_1.patternFactory.getAllTypes();
    for (const type of patternTypes) {
        const pattern = masking_1.patternFactory.getPattern(type);
        if (!pattern) {
            continue;
        }
        // Check if this pattern type is enabled (with fallback to mapped category)
        const configKey = typeMapping[type] ?? type;
        if (isInCdata) {
            console.log('[CDATA Pattern Loop] Checking type:', type, 'configKey:', configKey, 'enabled:', effectiveConfig.types[configKey], 'has pattern:', !!pattern.source);
        }
        if (!effectiveConfig.types[configKey] || !pattern.source) {
            continue;
        }
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));
        if (isInCdata && matches.length > 0) {
            console.log('[CDATA Pattern Debug] Pattern type:', type, 'found', matches.length, 'matches in CDATA content');
            // Log address pattern matches specifically to debug corruption
            if (type === 'address') {
                matches.forEach((m, idx) => {
                    const contextStart = Math.max(0, (m.index ?? 0) - 30);
                    const contextEnd = Math.min(text.length, (m.index ?? 0) + m[0].length + 30);
                    console.log(`[Address Debug] Match ${idx}: "${m[0]}" at index ${String(m.index)}`);
                    console.log(`[Address Debug] Context: ...${text.substring(contextStart, contextEnd)}...`);
                });
            }
        }
        for (const match of matches) {
            const originalValue = match[0];
            // Skip if already detected by another pattern
            if (replacements.has(originalValue)) {
                continue;
            }
            // Skip if this match is inside a field name/tag name
            if ((0, masking_1.isInsideFieldName)(text, match.index ?? 0, originalValue.length)) {
                continue;
            }
            // PHASE 2 (v1.5.0): Hybrid date of birth validation
            // Only mask dates that have birth keywords AND plausible age
            if (type === 'dateOfBirth' && !(0, masking_1.shouldMaskAsDateOfBirth)(text, match.index ?? 0, originalValue)) {
                continue;
            }
            // Calculate confidence score for this match
            const confidence = (0, masking_1.calculateMaskingConfidence)(text, match.index ?? 0, originalValue, type);
            // PHASE 1: Use adaptive thresholding based on context
            const contextBefore = text.substring(Math.max(0, (match.index ?? 0) - 100), match.index ?? 0);
            const contextAfter = text.substring((match.index ?? 0) + originalValue.length, Math.min(text.length, (match.index ?? 0) + originalValue.length + 100));
            const structureType = (0, masking_1.detectStructureType)(contextBefore, contextAfter);
            // For CDATA content, treat as structured data even if detected as plain_text
            // CDATA often contains structured PII that should be masked
            const effectiveStructureType = isInCdata && structureType === 'plain_text' ? 'xml' : structureType;
            if (isInCdata) {
                console.log('[CDATA Threshold Debug] isInCdata=true, original structureType:', structureType, 'â†’ effective:', effectiveStructureType);
            }
            const adaptiveThreshold = (0, masking_1.getAdaptiveThreshold)(effectiveConfig.confidenceThreshold, effectiveStructureType, type, effectiveConfig.mode);
            // Skip if confidence is below adaptive threshold
            if (confidence < adaptiveThreshold) {
                continue;
            }
            // Skip if this match overlaps with any CDATA range (CDATA already processed)
            if (isWithinCdataRange(match.index ?? 0, originalValue.length, cdataRanges)) {
                console.log('[CDATA Skip] Pattern match at', match.index ?? 0, 'skipped - within CDATA range');
                continue;
            }
            const maskFn = MASKING_FUNCTIONS[type] ?? masking_1.maskGeneric;
            // For XML content, ALWAYS use 'structural' strategy to preserve exact length
            // This prevents XML corruption from cumulative offset miscalculation in position-based replacements
            const strategyToUse = isXmlContent ? 'structural' : effectiveConfig.strategy;
            const maskedValue = maskFn(originalValue, strategyToUse);
            // Calculate line and column
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
            // Store replacement (both map and position-specific)
            replacements.set(originalValue, maskedValue);
            positionReplacements.push({
                index: match.index ?? 0,
                length: originalValue.length,
                maskedValue
            });
        }
    }
    // Custom patterns
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
            // Skip if already detected
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
            // Store replacement (both map and position-specific)
            replacements.set(originalValue, maskedValue);
            positionReplacements.push({
                index: match.index ?? 0,
                length: originalValue.length,
                maskedValue
            });
        }
    }
    // Apply position-based replacements (not global string replacement)
    // This prevents masking field names when the same text appears in XML/JSON tags
    //
    // CRITICAL FIX: Separate CDATA replacements from pattern-based replacements
    // CDATA replacements are guaranteed length-preserving (maskCdataContent ensures this)
    // Pattern-based replacements may NOT be length-preserving (e.g., 'partial' strategy)
    // If we apply them together with cumulative offset tracking, the non-length-preserving
    // pattern replacements will create offset drift that corrupts CDATA positions.
    //
    // Solution: Apply in two phases:
    // 1. CDATA replacements first (no offset tracking needed - they're same length)
    // 2. Pattern-based replacements second (with offset tracking for non-length-preserving ones)
    const cdataReplacements = positionReplacements.filter(r => r.maskedValue.length === r.length);
    const patternReplacements = positionReplacements.filter(r => r.maskedValue.length !== r.length);
    console.log('[Position Replace Debug] Total replacements:', positionReplacements.length);
    console.log('[Position Replace Debug] CDATA replacements (length-preserving):', cdataReplacements.length);
    console.log('[Position Replace Debug] Pattern replacements (may change length):', patternReplacements.length);
    let maskedText = text;
    // PHASE 1: Apply CDATA replacements (length-preserving, no offset tracking needed)
    // Sort by index in descending order (highest first) to preserve positions
    const sortedCdataReplacements = cdataReplacements.sort((a, b) => b.index - a.index);
    console.log('[CDATA Phase] Applying', sortedCdataReplacements.length, 'CDATA replacements');
    for (const replacement of sortedCdataReplacements) {
        const before = maskedText.substring(0, replacement.index);
        const after = maskedText.substring(replacement.index + replacement.length);
        maskedText = before + replacement.maskedValue + after;
        console.log(`[CDATA Replace] index:${replacement.index} len:${replacement.length} (same as masked_len)`);
        // Verify length preservation
        if (replacement.maskedValue.length !== replacement.length) {
            console.error('[CDATA ERROR] Length mismatch! This should never happen!');
        }
    }
    // PHASE 2: Apply pattern-based replacements (with cumulative offset tracking)
    // Sort by index in descending order (highest first) to preserve positions
    const sortedPatternReplacements = patternReplacements.sort((a, b) => b.index - a.index);
    console.log('[Pattern Phase] Applying', sortedPatternReplacements.length, 'pattern replacements');
    let cumulativeOffset = 0;
    for (const replacement of sortedPatternReplacements) {
        // Adjust index based on cumulative length changes from previous replacements
        const adjustedIndex = replacement.index + cumulativeOffset;
        const before = maskedText.substring(0, adjustedIndex);
        const after = maskedText.substring(adjustedIndex + replacement.length);
        maskedText = before + replacement.maskedValue + after;
        // Update cumulative offset: how much the text length changed
        const lengthDiff = replacement.maskedValue.length - replacement.length;
        cumulativeOffset += lengthDiff;
        console.log(`[Pattern Replace] Original index:${replacement.index} Adjusted:${adjustedIndex} LengthDiff:${lengthDiff} CumulativeOffset:${cumulativeOffset}`);
    }
    return {
        maskedText,
        detections,
        maskingApplied: detections.length > 0
    };
}
exports.maskText = maskText;
// ============================================================================
// CSV-SPECIFIC MASKING
// ============================================================================
function maskCsvText(text, config, headersLine) {
    const lines = text.split('\n');
    if (lines.length === 0) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }
    // Apply preset configuration
    const effectiveConfig = applyPreset(config);
    // Detect headers
    let headers;
    let dataStartIndex = 0;
    let includeHeaderInOutput = true;
    if (headersLine) {
        // Headers provided separately (user selected data rows only)
        headers = (0, masking_1.parseCsvLine)(headersLine);
        dataStartIndex = 0;
        includeHeaderInOutput = false;
    }
    else {
        // No headers provided, assume first line is header
        const firstLine = lines[0] ?? '';
        headers = (0, masking_1.parseCsvLine)(firstLine);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }
    const maskColumns = headers.map(h => (0, masking_1.shouldMaskColumn)(h, effectiveConfig));
    const allDetections = [];
    const maskedLines = includeHeaderInOutput ? [lines[0] ?? ''] : [];
    // Process data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
        const values = (0, masking_1.parseCsvLine)(lines[i] ?? '');
        const maskedValues = [];
        for (let colIdx = 0; colIdx < values.length; colIdx++) {
            const value = values[colIdx] ?? '';
            const header = headers[colIdx] ?? '';
            if (maskColumns[colIdx] && value.trim()) {
                // Detect PII type from column name
                const columnType = (0, masking_1.detectColumnType)(header);
                const maskFn = MASKING_FUNCTIONS[columnType] ?? masking_1.maskGeneric;
                const maskedValue = maskFn(value, effectiveConfig.strategy);
                maskedValues.push(maskedValue);
                allDetections.push({
                    type: columnType,
                    originalValue: value,
                    maskedValue,
                    line: i + 1,
                    column: colIdx,
                    confidence: 0.95,
                    columnContext: {
                        name: header,
                        index: colIdx
                    }
                });
            }
            else {
                maskedValues.push(value);
            }
        }
        maskedLines.push(maskedValues.join(','));
    }
    return {
        maskedText: maskedLines.join('\n'),
        detections: allDetections,
        maskingApplied: allDetections.length > 0
    };
}
exports.maskCsvText = maskCsvText;
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
    const maskFn = MASKING_FUNCTIONS[patternType] ?? masking_1.maskGeneric;
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