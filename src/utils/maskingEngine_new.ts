// maskingEngine.ts - Data Masking Engine for PII Protection (Refactored v1.6.0)
// Main orchestration layer - imports modular utilities
import * as vscode from 'vscode';

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
    DETECTION_PATTERNS,

    // Confidence scoring
    detectStructureType,
    getAdaptiveThreshold,
    calculateMaskingConfidence,
    isInsideFieldName,

    // Validators
    shouldMaskAsDateOfBirth,

    // Masking functions
    maskGeneric,
    maskEmail,
    maskPhone,
    maskSSN,
    maskCreditCard,
    maskAddress,
    maskDateOfBirth,
    maskPassport,
    maskDriversLicense,
    maskNationalID,
    maskAustralianBSB,
    maskAccountNumber,
    maskAustralianTFN,
    maskAustralianABN,
    maskAustralianMedicare,
    maskIPAddress,
    maskIBAN,
    maskSWIFT,

    // CSV utilities
    detectDelimiter,
    parseCsvLine,
    shouldMaskColumn,
    detectColumnType
} from './masking';

// Re-export types for backward compatibility
export { PiiType, MaskingStrategy, Detection, MaskedResult, CustomPattern, MaskingConfig, getMaskingConfig };

// ============================================================================
// MASKING FUNCTIONS MAP
// Maps PII type identifiers to their masking functions
// ============================================================================

const MASKING_FUNCTIONS: Record<string, (value: string, strategy: string) => string> = {
    email: maskEmail,
    phone: maskPhone,
    australianPhone: maskPhone,
    ssn: maskSSN,
    creditCard: maskCreditCard,
    creditCardVisa: maskCreditCard,
    creditCardMastercard: maskCreditCard,
    creditCardAmex: maskCreditCard,
    creditCardGeneric: maskCreditCard,
    address: maskAddress,
    dateOfBirth: maskDateOfBirth,
    passportNumber: maskPassport,
    australianPassport: maskPassport,
    usPassport: maskPassport,
    ukPassport: maskPassport,
    euPassport: maskPassport,
    driversLicense: maskDriversLicense,
    australianDriversLicense: maskDriversLicense,
    usDriversLicense: maskDriversLicense,
    ukDriversLicense: maskDriversLicense,
    nationalID: maskNationalID,
    ukNationalInsurance: maskNationalID,
    australianBSB: maskAustralianBSB,
    accountNumber: maskAccountNumber,
    australianAccountNumber: maskAccountNumber,
    australianTFN: maskAustralianTFN,
    australianABN: maskAustralianABN,
    australianMedicare: maskAustralianMedicare,
    ipAddress: maskIPAddress,
    ipv4: maskIPAddress,
    ipv6: maskIPAddress,
    iban: maskIBAN,
    swift: maskSWIFT,
    clientNumber: maskGeneric,
    referenceNumber: maskGeneric,
    policyNumber: maskGeneric,
    transactionID: maskGeneric,
    routingNumber: maskGeneric,
    nmi: maskGeneric,
    custom: maskGeneric
};

// ============================================================================
// PRESET CONFIGURATION
// Apply preset-based configuration
// ============================================================================

function applyPreset(config: MaskingConfig): MaskingConfig {
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
// MAIN MASKING ENGINE
// ============================================================================

export function maskText(text: string, config: MaskingConfig, _headers?: string[]): MaskedResult {
    if (!config.enabled) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }

    // Apply preset configuration
    const effectiveConfig = applyPreset(config);

    const detections: Detection[] = [];
    const replacements: Map<string, string> = new Map();

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
            /"([^"]+)"\s*:\s*"([^"]+)"/g,       // JSON: "field": "value"
            /"([^"]+)"\s*:\s*([0-9\s-]+)/g,   // JSON: "field": 123 or "field": 123-456
            /<([^>\s/]+)>([^<]+)<\/\1>/g        // XML: <field>value</field>
        ];

        for (const valuePattern of valuePatterns) {
            valuePattern.lastIndex = 0;
            const matches = Array.from(text.matchAll(valuePattern));

            for (const match of matches) {
                const fieldName = match[1];
                const value = match[2];

                // Skip if field name or value is undefined
                if (!fieldName || !value) {continue;}

                // Skip if already detected
                if (replacements.has(value)) {continue;}

                // Skip if value is empty or just whitespace
                if (!value.trim()) {continue;}

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
                    const patternType = detectColumnType(fieldName) as PiiType;

                    detections.push({
                        type: patternType,
                        originalValue: value,
                        maskedValue,
                        line,
                        column,
                        confidence: 0.95  // High confidence for field-name-based detection
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
    for (const type of Object.keys(DETECTION_PATTERNS)) {
        // Check if this pattern type is enabled
        const configKey = typeMapping[type] ?? type;
        if (effectiveConfig.types[configKey] === false) {
            continue;
        }

        // Get the compiled regex pattern
        const regex = patternFactory.getPattern(type);
        if (!regex) {continue;}

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
            if (isInsideFieldName(text, matchIndex, originalValue.length)) {
                continue;
            }

            // PHASE 2 (v1.5.0): Hybrid date of birth validation
            // Only mask dates that have birth keywords AND plausible age
            if (type === 'dateOfBirth' && !shouldMaskAsDateOfBirth(text, matchIndex, originalValue)) {
                continue;
            }

            // Calculate confidence score
            const confidence = calculateMaskingConfidence(text, matchIndex, originalValue, type);

            // PHASE 1 (v1.4.3): Use adaptive thresholding
            const contextBefore = text.substring(Math.max(0, matchIndex - 100), matchIndex);
            const contextAfter = text.substring(matchIndex + originalValue.length, Math.min(text.length, matchIndex + originalValue.length + 100));
            const structureType = detectStructureType(contextBefore, contextAfter);
            const adaptiveThreshold = getAdaptiveThreshold(
                effectiveConfig.confidenceThreshold,
                structureType,
                type,
                effectiveConfig.mode
            );

            // Skip if below adaptive threshold
            if (confidence < adaptiveThreshold) {
                continue;
            }

            // Get masking function
            const maskFn = MASKING_FUNCTIONS[type] ?? maskGeneric;
            const maskedValue = maskFn(originalValue, effectiveConfig.strategy);

            // Store replacement
            replacements.set(originalValue, maskedValue);

            // Calculate line and column
            const beforeMatch = text.substring(0, matchIndex);
            const line = (beforeMatch.match(/\n/g) ?? []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = matchIndex - (lastNewline + 1);

            detections.push({
                type: type as PiiType,
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

// ============================================================================
// CSV MASKING ENGINE
// ============================================================================

export function maskCsvText(text: string, config: MaskingConfig, headersLine?: string): MaskedResult {
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
    const delimiter = detectDelimiter(lines.slice(0, Math.min(5, lines.length)));

    // Parse headers
    let headers: string[] = [];
    let dataStartIndex = 0;
    let includeHeaderInOutput = true;

    if (headersLine) {
        // External headers provided (user selected data rows without header)
        headers = parseCsvLine(headersLine, delimiter);
        dataStartIndex = 0;
        includeHeaderInOutput = false;
    } else {
        // Use first line as header
        const firstLine = lines[0];
        if (!firstLine) {
            return { maskedText: text, detections: [], maskingApplied: false };
        }
        headers = parseCsvLine(firstLine, delimiter);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }

    const detections: Detection[] = [];
    const maskedLines: string[] = [];

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

        const values = parseCsvLine(line, delimiter);
        const maskedValues: string[] = [];

        for (let colIndex = 0; colIndex < values.length; colIndex++) {
            const value = values[colIndex] ?? '';
            const columnName = headers[colIndex] ?? `Column ${colIndex + 1}`;

            // Check if this column should be masked
            if (shouldMaskColumn(columnName, config)) {
                const patternType = detectColumnType(columnName);
                const maskFn = MASKING_FUNCTIONS[patternType] ?? maskGeneric;
                const maskedValue = maskFn(value, config.strategy);

                maskedValues.push(maskedValue);

                detections.push({
                    type: patternType as PiiType,
                    originalValue: value,
                    maskedValue,
                    line: i + 1,
                    column: colIndex,
                    confidence: 0.95,  // High confidence for column-based masking
                    columnContext: {
                        name: columnName,
                        index: colIndex
                    }
                });
            } else {
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

// ============================================================================
// UI FUNCTIONS
// ============================================================================

export function updateMaskingStatusBar(result: MaskedResult, config: MaskingConfig): void {
    if (!config.showIndicator || !result.maskingApplied) {
        return;
    }

    vscode.window.setStatusBarMessage(`ðŸ›¡ï¸ ${result.detections.length} masked`, 3000);
}

export function showMaskingNotification(result: MaskedResult, _config: MaskingConfig): void {
    if (!result.maskingApplied) {
        return;
    }

    // Group detections by type
    const typeGroups = new Map<string, number>();
    for (const detection of result.detections) {
        const count = typeGroups.get(detection.type) ?? 0;
        typeGroups.set(detection.type, count + 1);
    }

    // Format message
    const typeSummary = Array.from(typeGroups.entries())
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');

    void vscode.window.showInformationMessage(
        `Copied with ${result.detections.length} items masked: ${typeSummary}`
    );
}

export function formatOutputWithMaskingStats(output: string, result: MaskedResult, config: MaskingConfig): string {
    if (!config.includeStats || !result.maskingApplied) {
        return output;
    }

    // Group detections by type
    const typeGroups = new Map<string, number>();
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

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

export { shouldMaskColumn };


