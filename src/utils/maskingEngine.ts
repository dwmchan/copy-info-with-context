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
    checkStatisticalAnomalies,
    detectStructureType,
    getAdaptiveThreshold,
    calculateMaskingConfidence,
    isNonBirthDateField,
    isInsideFieldName,

    // Validators
    isBirthDateField,
    isPlausibleBirthDate,
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
    detectColumnType,
    detectHeaders,
    buildAsciiTable,
    getSensitiveColumnPatterns,

    //UI functions
    updateMaskingStatusBar,
    showMaskingNotification
} from './masking';

// Re-export types for backward compatibility
export { PiiType, MaskingStrategy, Detection, MaskedResult, CustomPattern, MaskingConfig, getMaskingConfig, updateMaskingStatusBar, showMaskingNotification };

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

interface PresetDefinition {
    name: string;
    description: string;
    enabledTypes: string[];
}

function applyPreset(config: MaskingConfig): MaskingConfig {
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
const MASKING_PRESETS: Record<string, PresetDefinition> = {
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
			'email','phone','creditCard','ssn','dateOfBirth','passportNumber','driversLicense','nationalID',
			'address','ipAddress','iban','swift','accountNumber','custom'
		]
	}
};

// ============================================================================
// MASKING FUNCTIONS
// ============================================================================

const MASKING_FUNCTIONS: Record<string, (value: string, strategy: string) => string> = {
    email: maskEmail,
    phone: maskPhone,
    australianPhone: maskPhone,
    ssn: maskSSN,
    dateOfBirth: maskDateOfBirth,

    // Identity Documents
    passportNumber: maskPassport,
    driversLicense: maskDriversLicense,
    nationalID: maskNationalID,
    australianPassport: maskPassport,
    australianDriversLicense: maskDriversLicense,
    usPassport: maskPassport,
    usDriversLicense: maskDriversLicense,
    ukPassport: maskPassport,
    ukDriversLicense: maskDriversLicense,
    ukNationalInsurance: maskNationalID,
    euPassport: maskPassport,

    creditCardVisa: maskCreditCard,
    creditCardMastercard: maskCreditCard,
    creditCardAmex: maskCreditCard,
    creditCardGeneric: maskCreditCard,
    accountNumber: maskAccountNumber,
    australianAccountNumber: maskAccountNumber,
    ipv4: maskIPAddress,
    ipv6: maskIPAddress,
    nmi: maskGeneric,
    address: () => '[ADDRESS REDACTED]',
    australianBSB: maskAustralianBSB,    // was maskBSB
    australianTFN: maskAustralianTFN,    // was maskTFN
    australianABN: maskAustralianABN,    // was maskABN
    australianMedicare: maskGeneric,
    clientNumber: maskAccountNumber,
    referenceNumber: maskGeneric,
    policyNumber: maskGeneric,
    transactionID: maskGeneric,
    iban: maskGeneric,
    swift: maskGeneric,
    routingNumber: maskGeneric,
    custom: maskGeneric
};

// ============================================================================
// MAIN MASKING ENGINE
// ============================================================================

export function maskText(text: string, config: MaskingConfig, headers?: string[]): MaskedResult {
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

    // Track position-specific replacements to avoid masking field names
    interface PositionReplacement {
        index: number;
        length: number;
        maskedValue: string;
    }
    const positionReplacements: PositionReplacement[] = [];

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
    const isJsonContent = /^\s*[\[{]/.test(text) || /"[^"]+"\s*:/.test(text);
    const isXmlContent = /<[^>]+>/.test(text);

    if (isJsonContent || isXmlContent) {
        // Find all potential field values (quoted strings and unquoted values)
        const valuePatterns = [
            /"([^"]+)"\s*:\s*"([^"]+)"/g,       // JSON: "field": "value"
            /"([^"]+)"\s*:\s*([0-9\s\-]+)/g,   // JSON: "field": 123 or "field": 123-456
            /<([^>\s/]+)>([^<]+)<\/\1>/g        // XML: <field>value</field>
        ];

        for (const valuePattern of valuePatterns) {
            valuePattern.lastIndex = 0;
            const matches = Array.from(text.matchAll(valuePattern));

            for (const match of matches) {
                const fieldName = match[1];
                const value = match[2];

                // Skip if field name or value is undefined
                if (!fieldName || !value) continue;

                // Skip if already detected
                if (replacements.has(value)) continue;

                // Skip if value is empty or just whitespace
                if (!value.trim()) continue;

                // Attempt to mask by field name
                const maskedValue = maskByFieldName(value, fieldName, effectiveConfig.strategy, effectiveConfig);

                if (maskedValue !== null) {
                    // Calculate position info
                    const valueIndex = text.indexOf(value, match.index!);
                    const beforeMatch = text.substring(0, valueIndex);
                    const line = (beforeMatch.match(/\n/g) || []).length + 1;
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

    // ========================================================================
    // PATTERN-BASED DETECTION
    // Fallback for values not caught by field names
    // ========================================================================

    // Pattern-based detection - collect all matches first
    for (const [type, pattern] of Object.entries(DETECTION_PATTERNS)) {
        // Check if this pattern type is enabled (with fallback to mapped category)
        const configKey = typeMapping[type] || type;

        if (!effectiveConfig.types[configKey] || !pattern.source) continue;

        // Reset regex lastIndex
        pattern.lastIndex = 0;

        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
            const originalValue = match[0];

            // Skip if already detected by another pattern
            if (replacements.has(originalValue)) continue;

            // Skip if this match is inside a field name/tag name
            if (isInsideFieldName(text, match.index!, originalValue.length)) {
                continue;
            }

            // PHASE 2 (v1.5.0): Hybrid date of birth validation
            // Only mask dates that have birth keywords AND plausible age
            if (type === 'dateOfBirth' && !shouldMaskAsDateOfBirth(text, match.index!, originalValue)) {
                continue;
            }

            // Calculate confidence score for this match
            const confidence = calculateMaskingConfidence(text, match.index!, originalValue, type);

            // PHASE 1: Use adaptive thresholding based on context
            const contextBefore = text.substring(Math.max(0, match.index! - 100), match.index!);
            const contextAfter = text.substring(match.index! + originalValue.length, Math.min(text.length, match.index! + originalValue.length + 100));
            const structureType = detectStructureType(contextBefore, contextAfter);
            const adaptiveThreshold = getAdaptiveThreshold(
                effectiveConfig.confidenceThreshold,
                structureType,
                type,
                effectiveConfig.mode
            );

            // Skip if confidence is below adaptive threshold
            if (confidence < adaptiveThreshold) {
                continue;
            }

            const maskFn = MASKING_FUNCTIONS[type] || maskGeneric;
            const maskedValue = maskFn(originalValue, effectiveConfig.strategy);

            // Calculate line and column
            const beforeMatch = text.substring(0, match.index!);
            const line = (beforeMatch.match(/\n/g) || []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = match.index! - (lastNewline + 1);

            detections.push({
                type: type as PiiType,
                originalValue,
                maskedValue,
                line,
                column,
                confidence
            });

            // Store replacement (both map and position-specific)
            replacements.set(originalValue, maskedValue);
            positionReplacements.push({
                index: match.index!,
                length: originalValue.length,
                maskedValue
            });
        }
    }

    // Custom patterns
    for (const customPattern of effectiveConfig.customPatterns) {
        if (!customPattern.enabled) continue;

        const pattern = typeof customPattern.pattern === 'string'
            ? new RegExp(customPattern.pattern, 'g')
            : customPattern.pattern;

        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
            const originalValue = match[0];

            // Skip if already detected
            if (replacements.has(originalValue)) continue;

            const maskedValue = customPattern.replacement;

            const beforeMatch = text.substring(0, match.index!);
            const line = (beforeMatch.match(/\n/g) || []).length + 1;
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const column = match.index! - (lastNewline + 1);

            detections.push({
                type: PiiType.Custom,
                originalValue,
                maskedValue,
                line,
                column,
                confidence: 1.0
            });

            // Store replacement (both map and position-specific)
            replacements.set(originalValue, maskedValue);
            positionReplacements.push({
                index: match.index!,
                length: originalValue.length,
                maskedValue
            });
        }
    }

    // Apply position-based replacements (not global string replacement)
    // This prevents masking field names when the same text appears in XML/JSON tags
    // Sort by index in descending order (highest first) to preserve positions
    const sortedPositionReplacements = positionReplacements.sort((a, b) => b.index - a.index);

    let maskedText = text;
    for (const replacement of sortedPositionReplacements) {
        const before = maskedText.substring(0, replacement.index);
        const after = maskedText.substring(replacement.index + replacement.length);
        maskedText = before + replacement.maskedValue + after;
    }

    return {
        maskedText,
        detections,
        maskingApplied: detections.length > 0
    };
}

// ============================================================================
// CSV-SPECIFIC MASKING
// ============================================================================

export function maskCsvText(text: string, config: MaskingConfig, headersLine?: string): MaskedResult {
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
    let headers: string[];
    let dataStartIndex = 0;
    let includeHeaderInOutput = true;

    if (headersLine) {
        // Headers provided separately (user selected data rows only)
        headers = parseCsvLine(headersLine);
        dataStartIndex = 0;
        includeHeaderInOutput = false;
    } else {
        // No headers provided, assume first line is header
        const firstLine = lines[0] || '';
        headers = parseCsvLine(firstLine);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }

    const maskColumns = headers.map(h => shouldMaskColumn(h, effectiveConfig));

    const allDetections: Detection[] = [];
    const maskedLines: string[] = includeHeaderInOutput ? [lines[0] || ''] : [];

    // Process data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
        const values = parseCsvLine(lines[i] || '');
        const maskedValues: string[] = [];

        for (let colIdx = 0; colIdx < values.length; colIdx++) {
            const value = values[colIdx] || '';
            const header = headers[colIdx] || '';

            if (maskColumns[colIdx] && value.trim()) {
                // Detect PII type from column name
                const columnType = detectColumnType(header);
                const maskFn = MASKING_FUNCTIONS[columnType] || maskGeneric;
                const maskedValue = maskFn(value, effectiveConfig.strategy);

                maskedValues.push(maskedValue);

                allDetections.push({
                    type: columnType as PiiType,
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
            } else {
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

/**
 * Extract JSON field name from context before a value
 * Returns the field name if found, or null
 * Example: "accountNumber": "123456" → returns "accountNumber"
 */
function extractJsonFieldName(contextBefore: string): string | null {
    // Look for pattern: "fieldName": or 'fieldName':
    const match = contextBefore.match(/["']([^"']+)["']\s*:\s*["']?\s*$/);
    return match && match[1] ? match[1] : null;
}

/**
 * Extract XML tag name from context before a value
 * Returns the tag name if found, or null
 * Example: <accountNumber>123456 → returns "accountNumber"
 */
function extractXmlTagName(contextBefore: string, contextAfter: string): string | null {
    // Look for pattern: <tagName> before value and </tagName> after
    const openTagMatch = contextBefore.match(/<([^>\s/]+)[^>]*>\s*$/);
    if (!openTagMatch || !openTagMatch[1]) return null;

    const tagName = openTagMatch[1];

    // Verify closing tag exists after (optional check for confidence)
    const closeTagPattern = new RegExp(`^\\s*</${tagName}>`);
    if (closeTagPattern.test(contextAfter)) {
        return tagName;
    }

    // Return tag name even without close tag verification (might be on different line)
    return tagName;
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
    const configKey = patternType as keyof typeof config.types;
    if (config.types[configKey] === false) {
        return null;
    }

    // Get masking function
    const maskFn = MASKING_FUNCTIONS[patternType] || maskGeneric;
    return maskFn(value, strategy);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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