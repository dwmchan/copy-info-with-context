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
exports.shouldMaskColumn = exports.formatOutputWithMaskingStats = exports.showMaskingNotification = exports.updateMaskingStatusBar = exports.maskCsvText = exports.maskText = exports.getMaskingConfig = exports.MaskingStrategy = exports.PiiType = void 0;
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
// ============================================================================
// MASKING FUNCTIONS MAP
// Maps PII type identifiers to their masking functions
// ============================================================================
const MASKING_FUNCTIONS = {
    email: masking_1.maskEmail,
    phone: masking_1.maskPhone,
    australianPhone: masking_1.maskPhone,
    ssn: masking_1.maskSSN,
    creditCard: masking_1.maskCreditCard,
    creditCardVisa: masking_1.maskCreditCard,
    creditCardMastercard: masking_1.maskCreditCard,
    creditCardAmex: masking_1.maskCreditCard,
    creditCardGeneric: masking_1.maskCreditCard,
    address: masking_1.maskAddress,
    dateOfBirth: masking_1.maskDateOfBirth,
    passportNumber: masking_1.maskPassport,
    australianPassport: masking_1.maskPassport,
    usPassport: masking_1.maskPassport,
    ukPassport: masking_1.maskPassport,
    euPassport: masking_1.maskPassport,
    driversLicense: masking_1.maskDriversLicense,
    australianDriversLicense: masking_1.maskDriversLicense,
    usDriversLicense: masking_1.maskDriversLicense,
    ukDriversLicense: masking_1.maskDriversLicense,
    nationalID: masking_1.maskNationalID,
    ukNationalInsurance: masking_1.maskNationalID,
    australianBSB: masking_1.maskAustralianBSB,
    accountNumber: masking_1.maskAccountNumber,
    australianAccountNumber: masking_1.maskAccountNumber,
    australianTFN: masking_1.maskAustralianTFN,
    australianABN: masking_1.maskAustralianABN,
    australianMedicare: masking_1.maskAustralianMedicare,
    ipAddress: masking_1.maskIPAddress,
    ipv4: masking_1.maskIPAddress,
    ipv6: masking_1.maskIPAddress,
    iban: masking_1.maskIBAN,
    swift: masking_1.maskSWIFT,
    clientNumber: masking_1.maskGeneric,
    referenceNumber: masking_1.maskGeneric,
    policyNumber: masking_1.maskGeneric,
    transactionID: masking_1.maskGeneric,
    routingNumber: masking_1.maskGeneric,
    nmi: masking_1.maskGeneric,
    custom: masking_1.maskGeneric
};
// ============================================================================
// PRESET CONFIGURATION
// Apply preset-based configuration
// ============================================================================
function applyPreset(config) {
    // Presets don't modify config, they're applied at getMaskingConfig() level
    // This is here for backward compatibility
    return config;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Mask a value by field/tag name in JSON/XML
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
// MAIN MASKING ENGINE
// ============================================================================
function maskText(text, config, _headers) {
    if (!config.enabled) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }
    // Apply preset configuration
    const effectiveConfig = applyPreset(config);
    const detections = [];
    const replacements = new Map();
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
                    // Store replacement
                    replacements.set(value, maskedValue);
                }
            }
        }
    }
    // ========================================================================
    // PATTERN-BASED DETECTION
    // Fallback for values not caught by field names
    // ========================================================================
    // Pattern-based detection - collect all matches first
    for (const type of Object.keys(masking_1.DETECTION_PATTERNS)) {
        // Check if this pattern type is enabled
        const configKey = typeMapping[type] ?? type;
        if (effectiveConfig.types[configKey] === false) {
            continue;
        }
        // Get the compiled regex pattern
        const regex = masking_1.patternFactory.getPattern(type);
        if (!regex) {
            continue;
        }
        regex.lastIndex = 0;
        const matches = Array.from(text.matchAll(regex));
        for (const match of matches) {
            if (match.index === undefined) {
                continue;
            }
            const originalValue = match[0];
            const matchIndex = match.index;
            // Skip if already detected (from field-name-based detection)
            if (replacements.has(originalValue)) {
                continue;
            }
            // Skip if this match is inside a field name/tag name
            if ((0, masking_1.isInsideFieldName)(text, matchIndex, originalValue.length)) {
                continue;
            }
            // PHASE 2 (v1.5.0): Hybrid date of birth validation
            // Only mask dates that have birth keywords AND plausible age
            if (type === 'dateOfBirth' && !(0, masking_1.shouldMaskAsDateOfBirth)(text, matchIndex, originalValue)) {
                continue;
            }
            // Calculate confidence score
            const confidence = (0, masking_1.calculateMaskingConfidence)(text, matchIndex, originalValue, type);
            // PHASE 1 (v1.4.3): Use adaptive thresholding
            const contextBefore = text.substring(Math.max(0, matchIndex - 100), matchIndex);
            const contextAfter = text.substring(matchIndex + originalValue.length, Math.min(text.length, matchIndex + originalValue.length + 100));
            const structureType = (0, masking_1.detectStructureType)(contextBefore, contextAfter);
            const adaptiveThreshold = (0, masking_1.getAdaptiveThreshold)(effectiveConfig.confidenceThreshold, structureType, type, effectiveConfig.mode);
            // Skip if below adaptive threshold
            if (confidence < adaptiveThreshold) {
                continue;
            }
            // Get masking function
            const maskFn = MASKING_FUNCTIONS[type] ?? masking_1.maskGeneric;
            const maskedValue = maskFn(originalValue, effectiveConfig.strategy);
            // Store replacement
            replacements.set(originalValue, maskedValue);
            // Calculate line and column
            const beforeMatch = text.substring(0, matchIndex);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = matchIndex - (lastNewline + 1);
            detections.push({
                type: type,
                originalValue,
                maskedValue,
                line,
                column,
                confidence
            });
        }
    }
    // ========================================================================
    // APPLY REPLACEMENTS
    // ========================================================================
    let maskedText = text;
    // Sort replacements by length (longest first) to avoid partial replacements
    const sortedReplacements = Array.from(replacements.entries())
        .sort((a, b) => b[0].length - a[0].length);
    for (const [original, masked] of sortedReplacements) {
        maskedText = maskedText.split(original).join(masked);
    }
    return {
        maskedText,
        detections,
        maskingApplied: detections.length > 0
    };
}
exports.maskText = maskText;
// ============================================================================
// CSV MASKING ENGINE
// ============================================================================
function maskCsvText(text, config, headersLine) {
    if (!config.enabled) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }
    const lines = text.split('\n');
    if (lines.length === 0) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }
    // Detect delimiter from sample lines
    const delimiter = (0, masking_1.detectDelimiter)(lines.slice(0, Math.min(5, lines.length)));
    // Parse headers
    let headers = [];
    let dataStartIndex = 0;
    let includeHeaderInOutput = true;
    if (headersLine) {
        // External headers provided (user selected data rows without header)
        headers = (0, masking_1.parseCsvLine)(headersLine, delimiter);
        dataStartIndex = 0;
        includeHeaderInOutput = false;
    }
    else {
        // Use first line as header
        const firstLine = lines[0];
        if (!firstLine) {
            return { maskedText: text, detections: [], maskingApplied: false };
        }
        headers = (0, masking_1.parseCsvLine)(firstLine, delimiter);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }
    const detections = [];
    const maskedLines = [];
    // Add header line if needed
    if (includeHeaderInOutput && lines.length > 0) {
        const headerLine = lines[0];
        if (headerLine !== undefined) {
            maskedLines.push(headerLine);
        }
    }
    // Process data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim().length === 0) {
            maskedLines.push(line ?? '');
            continue;
        }
        const values = (0, masking_1.parseCsvLine)(line, delimiter);
        const maskedValues = [];
        for (let colIndex = 0; colIndex < values.length; colIndex++) {
            const value = values[colIndex] ?? '';
            const columnName = headers[colIndex] ?? `Column ${colIndex + 1}`;
            // Check if this column should be masked
            if ((0, masking_1.shouldMaskColumn)(columnName, config)) {
                const patternType = (0, masking_1.detectColumnType)(columnName);
                const maskFn = MASKING_FUNCTIONS[patternType] ?? masking_1.maskGeneric;
                const maskedValue = maskFn(value, config.strategy);
                maskedValues.push(maskedValue);
                detections.push({
                    type: patternType,
                    originalValue: value,
                    maskedValue,
                    line: i + 1,
                    column: colIndex,
                    confidence: 0.95,
                    columnContext: {
                        name: columnName,
                        index: colIndex
                    }
                });
            }
            else {
                maskedValues.push(value);
            }
        }
        // Reconstruct CSV line
        const maskedLine = maskedValues.map(v => {
            // Quote if contains delimiter or quotes
            if (v.includes(delimiter) || v.includes('"') || v.includes("'")) {
                return `"${v.replace(/"/g, '""')}"`;
            }
            return v;
        }).join(delimiter);
        maskedLines.push(maskedLine);
    }
    return {
        maskedText: maskedLines.join('\n'),
        detections,
        maskingApplied: detections.length > 0
    };
}
exports.maskCsvText = maskCsvText;
// ============================================================================
// UI FUNCTIONS
// ============================================================================
function updateMaskingStatusBar(result, config) {
    if (!config.showIndicator || !result.maskingApplied) {
        return;
    }
    vscode.window.setStatusBarMessage(`ðŸ›¡ï¸ ${result.detections.length} masked`, 3000);
}
exports.updateMaskingStatusBar = updateMaskingStatusBar;
function showMaskingNotification(result, _config) {
    if (!result.maskingApplied) {
        return;
    }
    // Group detections by type
    const typeGroups = new Map();
    for (const detection of result.detections) {
        const count = typeGroups.get(detection.type) ?? 0;
        typeGroups.set(detection.type, count + 1);
    }
    // Format message
    const typeSummary = Array.from(typeGroups.entries())
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
    void vscode.window.showInformationMessage(`Copied with ${result.detections.length} items masked: ${typeSummary}`);
}
exports.showMaskingNotification = showMaskingNotification;
function formatOutputWithMaskingStats(output, result, config) {
    if (!config.includeStats || !result.maskingApplied) {
        return output;
    }
    // Group detections by type
    const typeGroups = new Map();
    for (const detection of result.detections) {
        const count = typeGroups.get(detection.type) ?? 0;
        typeGroups.set(detection.type, count + 1);
    }
    // Format stats
    const stats = Array.from(typeGroups.entries())
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
    return `${output}\n\n// Masking Stats: ${result.detections.length} items masked (${stats})`;
}
exports.formatOutputWithMaskingStats = formatOutputWithMaskingStats;
//# sourceMappingURL=maskingEngine_new.js.map