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
    maskIPAddress,

    // CSV utilities
    parseCsvLine,
    shouldMaskColumn,
    detectColumnType
    // remove UI functions from imports
} from './masking';

// Re-export types for backward compatibility
export { PiiType, MaskingStrategy, Detection, MaskedResult, CustomPattern, MaskingConfig, getMaskingConfig };

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
    address: maskAddress,
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
// STATUS BAR INDICATOR
// ============================================================================

let maskingStatusBarItem: vscode.StatusBarItem | undefined;

export function updateMaskingStatusBar(result: MaskedResult, config: MaskingConfig): void {
    if (!config.showIndicator) {return;}

    if (!maskingStatusBarItem) {
        maskingStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
    }

    if (config.enabled) {
        if (result.detections.length > 0) {
            maskingStatusBarItem.text = `$(shield) ${result.detections.length} masked`;
            maskingStatusBarItem.tooltip = `Data masking active: ${result.detections.length} items masked`;
            maskingStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            maskingStatusBarItem.text = '$(shield) Masking Active';
            maskingStatusBarItem.tooltip = 'Data masking enabled (no sensitive data detected)';
            maskingStatusBarItem.backgroundColor = undefined;
        }
        maskingStatusBarItem.show();

        // Auto-hide after 5 seconds
        setTimeout(() => maskingStatusBarItem?.hide(), 5000);
    }
}

export function showMaskingNotification(result: MaskedResult, _config: MaskingConfig): void {
    if (result.detections.length === 0) {return;}

    const byType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] ?? 0) + 1;
        return acc;
    }, {} as Record<PiiType, number>);

    const details = Object.entries(byType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

    void vscode.window.showInformationMessage(
        `Copied with ${result.detections.length} item${result.detections.length > 1 ? 's' : ''} masked: ${details}`,
        'Settings'
    ).then(selection => {
        if (selection === 'Settings') {
            void vscode.commands.executeCommand('workbench.action.openSettings', 'copyInfoWithContext.masking');
        }
    });
}

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
function maskCdataContent(cdataContent: string, config: MaskingConfig): { maskedText: string; detections: Detection[] } {
    if (!config.enabled || !cdataContent) {
        return { maskedText: cdataContent, detections: [] };
    }

    const detections: Detection[] = [];
    let maskedText = cdataContent;

    // Track all replacements with their positions to avoid overlaps
    interface Replacement {
        start: number;
        end: number;
        original: string;
        masked: string;
    }
    const replacements: Replacement[] = [];

    // Get all pattern types to scan
    const patternTypes = patternFactory.getAllTypes();

    // Scan for each PII pattern
    for (const type of patternTypes) {
        // Check if this pattern type is enabled in config
        const configKey = type ;
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

            // Check for overlaps with existing replacements
            const hasOverlap = replacements.some(r =>
                (matchStart >= r.start && matchStart < r.end) ||
                (matchEnd > r.start && matchEnd <= r.end) ||
                (matchStart <= r.start && matchEnd >= r.end)
            );
            if (hasOverlap) {continue;}

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
                type: type as PiiType,
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
            if (!inner?.trim()) {continue;}
            // Skip if already handled
            if (replacements.has(inner)) {continue;}

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
                cdataRanges.push({start: valueIndex, end: valueIndex + inner.length});

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
    function isWithinCdataRange(index: number, length: number, ranges: Array<{start: number; end: number}>): boolean {
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
        const allTypes = patternFactory.getAllTypes();
        console.log('[CDATA Pattern Loop] About to start pattern loop, pattern count:', allTypes.length);
        console.log('[CDATA Pattern Loop] First few patterns:', allTypes.slice(0, 5));
    }

    // Pattern-based detection - collect all matches first
    // NOTE: Use patternFactory.getAllTypes() instead of Object.entries(DETECTION_PATTERNS)
    // because DETECTION_PATTERNS is a Proxy and Object.entries() doesn't trigger the ownKeys trap
    const patternTypes = patternFactory.getAllTypes();
    for (const type of patternTypes) {
        const pattern = patternFactory.getPattern(type);
        if (!pattern) {continue;}
        // Check if this pattern type is enabled (with fallback to mapped category)
        const configKey = typeMapping[type] ?? type;

        if (isInCdata) {
            console.log('[CDATA Pattern Loop] Checking type:', type, 'configKey:', configKey, 'enabled:', effectiveConfig.types[configKey], 'has pattern:', !!pattern.source);
        }

        if (!effectiveConfig.types[configKey] || !pattern.source) {continue;}

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
            if (replacements.has(originalValue)) {continue;}

            // Skip if this match is inside a field name/tag name
            if (isInsideFieldName(text, match.index ?? 0, originalValue.length)) {
                continue;
            }

            // PHASE 2 (v1.5.0): Hybrid date of birth validation
            // Only mask dates that have birth keywords AND plausible age
            if (type === 'dateOfBirth' && !shouldMaskAsDateOfBirth(text, match.index ?? 0, originalValue)) {
                continue;
            }

            // Calculate confidence score for this match
            const confidence = calculateMaskingConfidence(text, match.index ?? 0, originalValue, type);

            // PHASE 1: Use adaptive thresholding based on context
            const contextBefore = text.substring(Math.max(0, (match.index ?? 0) - 100), match.index ?? 0);
            const contextAfter = text.substring((match.index ?? 0) + originalValue.length, Math.min(text.length, (match.index ?? 0) + originalValue.length + 100));
            const structureType = detectStructureType(contextBefore, contextAfter);

            // For CDATA content, treat as structured data even if detected as plain_text
            // CDATA often contains structured PII that should be masked
            const effectiveStructureType = isInCdata && structureType === 'plain_text' ? 'xml' : structureType;

            if (isInCdata) {
                console.log('[CDATA Threshold Debug] isInCdata=true, original structureType:', structureType, 'â†’ effective:', effectiveStructureType);
            }

            const adaptiveThreshold = getAdaptiveThreshold(
                effectiveConfig.confidenceThreshold,
                effectiveStructureType,
                type,
                effectiveConfig.mode
            );

            // Skip if confidence is below adaptive threshold
            if (confidence < adaptiveThreshold) {
                continue;
            }

            // Skip if this match overlaps with any CDATA range (CDATA already processed)
            if (isWithinCdataRange(match.index ?? 0, originalValue.length, cdataRanges)) {
                console.log('[CDATA Skip] Pattern match at', match.index ?? 0, 'skipped - within CDATA range');
                continue;
            }

            const maskFn = MASKING_FUNCTIONS[type] ?? maskGeneric;
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
                index: match.index ?? 0,
                length: originalValue.length,
                maskedValue
            });
        }
    }

    // Custom patterns
    for (const customPattern of effectiveConfig.customPatterns) {
        if (!customPattern.enabled) {continue;}

        const pattern = typeof customPattern.pattern === 'string'
            ? new RegExp(customPattern.pattern, 'g')
            : customPattern.pattern;

        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
            const originalValue = match[0];

            // Skip if already detected
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
        const firstLine = lines[0] ?? '';
        headers = parseCsvLine(firstLine);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }

    const maskColumns = headers.map(h => shouldMaskColumn(h, effectiveConfig));

    const allDetections: Detection[] = [];
    const maskedLines: string[] = includeHeaderInOutput ? [lines[0] ?? ''] : [];

    // Process data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
        const values = parseCsvLine(lines[i] ?? '');
        const maskedValues: string[] = [];

        for (let colIdx = 0; colIdx < values.length; colIdx++) {
            const value = values[colIdx] ?? '';
            const header = headers[colIdx] ?? '';

            if (maskColumns[colIdx] && value.trim()) {
                // Detect PII type from column name
                const columnType = detectColumnType(header);
                const maskFn = MASKING_FUNCTIONS[columnType] ?? maskGeneric;
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

