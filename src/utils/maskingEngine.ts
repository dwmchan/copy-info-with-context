// maskingEngine.ts - Data Masking Engine for PII Protection
import * as vscode from 'vscode';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export enum PiiType {
    Email = 'email',
    Phone = 'phone',
    SSN = 'ssn',
    CreditCard = 'credit_card',
    Address = 'address',
    AccountNumber = 'account_number',
    IPAddress = 'ip_address',
    NMI = 'nmi',
    DateOfBirth = 'date_of_birth',

    // Identity Documents
    PassportNumber = 'passport_number',
    DriversLicense = 'drivers_license',
    NationalID = 'national_id',

    // Australian Identity Documents
    AustralianPassport = 'australian_passport',
    AustralianDriversLicense = 'australian_drivers_license',

    // US Identity Documents
    USPassport = 'us_passport',
    USDriversLicense = 'us_drivers_license',

    // UK Identity Documents
    UKPassport = 'uk_passport',
    UKDriversLicense = 'uk_drivers_license',
    UKNationalInsurance = 'uk_national_insurance',

    // EU Identity Documents
    EUPassport = 'eu_passport',

    // Australian Banking
    AustralianBSB = 'australian_bsb',
    AustralianTFN = 'australian_tfn',
    AustralianABN = 'australian_abn',
    AustralianMedicare = 'australian_medicare',

    // Generic Enterprise
    ClientNumber = 'client_number',
    ReferenceNumber = 'reference_number',
    PolicyNumber = 'policy_number',
    TransactionID = 'transaction_id',

    // International Banking
    IBAN = 'iban',
    SWIFT = 'swift',
    RoutingNumber = 'routing_number',

    Custom = 'custom'
}

export enum MaskingStrategy {
    FULL = 'full',
    PARTIAL = 'partial',
    STRUCTURAL = 'structural',
    HASH = 'hash',
    REDACT = 'redact'
}

export interface Detection {
    type: PiiType;
    originalValue: string;
    maskedValue: string;
    line: number;
    column: number;
    confidence: number;
    columnContext?: {
        name: string;
        index: number;
    };
}

export interface MaskedResult {
    maskedText: string;
    detections: Detection[];
    maskingApplied: boolean;
}

export interface MaskingConfig {
    enabled: boolean;
    mode: 'auto' | 'manual' | 'strict';
    strategy: 'partial' | 'full' | 'structural' | 'hash';
    preset: 'none' | 'basic' | 'financial' | 'healthcare' | 'enterprise' | 'custom';
    denyList: string[];
    allowList: string[];
    types: Record<string, boolean>;
    showIndicator: boolean;
    includeStats: boolean;
    customPatterns: CustomPattern[];
    confidenceThreshold: number; // 0.0 to 1.0 - minimum confidence to mask (default: 0.7)
}

export interface CustomPattern {
    name: string;
    pattern: string | RegExp;
    replacement: string;
    enabled: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export function getMaskingConfig(): MaskingConfig {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');

    // Default types configuration
    const defaultTypes = {
        email: true,
        phone: true,
        ssn: true,
        dateOfBirth: true,
        passportNumber: true,
        driversLicense: true,
        nationalID: true,
        creditCard: true,
        address: true,
        accountNumber: true,
        ipAddress: false,
        nmi: true,
        australianBSB: true,
        australianTFN: true,
        australianABN: true,
        australianMedicare: true,
        clientNumber: true,
        referenceNumber: false,
        policyNumber: false,
        transactionID: false,
        iban: true,
        swift: true,
        routingNumber: false,
        custom: false
    };

    // Get user's maskingTypes and merge with defaults
    const userTypes = config.get('maskingTypes', {}) as Record<string, boolean>;
    const mergedTypes = { ...defaultTypes, ...userTypes };

    return {
        enabled: config.get('enableDataMasking', false),
        mode: config.get('maskingMode', 'auto'),
        strategy: config.get('maskingStrategy', 'partial'),
        preset: config.get('maskingPreset', 'none'),
        denyList: (config.get('maskingDenyList', []) as string[]).map(s => s.toLowerCase()),
        allowList: (config.get('maskingAllowList', []) as string[]).map(s => s.toLowerCase()),
        types: mergedTypes,
        showIndicator: config.get('showMaskingIndicator', true),
        includeStats: config.get('includeMaskingStats', false),
        customPatterns: (config.get('maskingCustomPatterns', []) as any[]).map(p => ({
            name: p.name,
            pattern: typeof p.pattern === 'string' ? new RegExp(p.pattern, 'g') : p.pattern,
            replacement: p.replacement,
            enabled: p.enabled !== false
        })),
        confidenceThreshold: config.get('maskingConfidenceThreshold', 0.7)
    };
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const DETECTION_PATTERNS: Record<string, RegExp> = {
    // === PERSONAL INFORMATION ===
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(?:\+?(\d{1,3}))?[-.\s]?\(?(\d{2,4})\)?[-.\s]?(\d{3,4})[-.\s]?(\d{4})\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    // Date of Birth - Multiple international formats
    dateOfBirth: /\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4}|\d{2}[-/.\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/.\s]\d{4})\b/gi,

    // === IDENTITY DOCUMENTS ===
    // Australian Passport: Letter followed by 7 digits (e.g., N1234567)
    australianPassport: /\b[A-Z]\d{7}\b/g,

    // Australian Driver's License: Varies by state, but commonly 6-10 alphanumeric
    australianDriversLicense: /\b(?:Lic|License|Licence)[#:\s-]*([A-Z0-9]{6,10})\b/gi,

    // US Passport: 9 digits or 1 letter + 8 digits
    usPassport: /\b(?:[A-Z]\d{8}|\d{9})\b/g,

    // US Driver's License: Varies by state, generic pattern
    usDriversLicense: /\b(?:DL|License)[#:\s-]*([A-Z0-9]{6,12})\b/gi,

    // UK Passport: 9 digits
    ukPassport: /\b\d{9}\b/g,

    // UK Driver's License: Specific format (complex, simplified here)
    ukDriversLicense: /\b[A-Z]{5}\d{6}[A-Z]{2}\d[A-Z]{2}\b/g,

    // UK National Insurance Number: 2 letters, 6 digits, 1 letter (e.g., AB123456C)
    ukNationalInsurance: /\b[A-Z]{2}\d{6}[A-Z]\b/g,

    // EU Passport: Varies, but often alphanumeric 8-9 characters
    euPassport: /\b[A-Z0-9]{8,9}\b/g,

    // Generic Passport Number (for column detection)
    passportNumber: /\b(?:Passport|Pass)[#:\s-]*([A-Z0-9]{6,12})\b/gi,

    // Generic National ID (various formats)
    nationalID: /\b(?:ID|National\s*ID|Identity)[#:\s-]*([A-Z0-9]{6,15})\b/gi,

    // Generic Driver's License
    driversLicense: /\b(?:DL|Driver|Licence|License)[#:\s-]*([A-Z0-9]{6,15})\b/gi,

    // === BANKING PATTERNS (Australia) ===
    australianBSB: /\b\d{3}[-\s]?\d{3}\b/g,
    australianAccountNumber: /\b(?:Account|Acc|A\/C)[#:\s-]*(\d{6,9})\b/gi,
    creditCardVisa: /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    creditCardMastercard: /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    creditCardAmex: /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g,
    creditCardGeneric: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    australianTFN: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
    australianABN: /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g,
    australianMedicare: /\b\d{4}\s?\d{5}\s?\d\b/g,
    australianPhone: /\b(?:\+?61|0)[2-478](?:[\s-]?\d){8}\b/g,

    // === GENERIC INDUSTRY IDENTIFIERS ===
    accountNumber: /\b(?:ACC|ACCT|Account|A\/C)[#:\s-]*(\d{6,12})\b/gi,
    clientNumber: /\b(?:Client|Customer|Cust|Member)[#:\s-]*(?:No|Number|Num|ID)[#:\s-]*(\d{4,12})\b/gi,
    referenceNumber: /\b(?:Ref|Reference|Invoice)[#:\s-]*(?:No|Number|Num)?[#:\s-]*([A-Z0-9]{6,15})\b/gi,
    policyNumber: /\b(?:Policy|POL)[#:\s-]*(?:No|Number)?[#:\s-]*([A-Z0-9]{6,15})\b/gi,
    transactionID: /\b(?:TXN|Transaction|Trans)[#:\s-]*(?:ID|No|Number)?[#:\s-]*([A-Z0-9]{8,20})\b/gi,
    nmi: /\b[A-Z0-9]{10,11}\b/g,

    // === INTERNATIONAL BANKING ===
    iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
    swift: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g,
    routingNumber: /\b\d{9}\b/g,

    // === NETWORK & TECHNICAL ===
    ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    ipv6: /\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi,

    // Address - more specific pattern
    address: /\b\d+\s+(?:[A-Z][a-z]+\s*){1,4}(?:STREET|ST|ROAD|RD|AVENUE|AVE|LANE|LN|DRIVE|DR|BUILDING|UNIT|SUITE|APT)\b/gi
};

/**
 * Check if a match position is inside a field name/tag name
 * Returns true if the match should be skipped (it's part of a field name, not a value)
 */
function isInsideFieldName(text: string, matchIndex: number, matchLength: number): boolean {
    const matchEnd = matchIndex + matchLength;

    // Look back and forward to check context
    const lookbackStart = Math.max(0, matchIndex - 50);
    const lookforwardEnd = Math.min(text.length, matchEnd + 50);

    const beforeMatch = text.substring(lookbackStart, matchIndex);
    const afterMatch = text.substring(matchEnd, lookforwardEnd);

    // Check if we're between < and > (XML/HTML tag)
    const lastOpenAngle = beforeMatch.lastIndexOf('<');
    const lastCloseAngle = beforeMatch.lastIndexOf('>');
    const nextCloseAngle = afterMatch.indexOf('>');

    if (lastOpenAngle > lastCloseAngle && nextCloseAngle !== -1) {
        // We're inside an XML tag (between < and >)
        return true;
    }

    // Check if we're in a JSON field name: "fieldName":
    const lastQuote = beforeMatch.lastIndexOf('"');
    if (lastQuote !== -1 && /^\s*"?\s*:/.test(afterMatch)) {
        // Pattern: "...match...": - it's a JSON field name
        return true;
    }

    return false;
}

// ============================================================================
// PHASE 1 CONFIDENCE SCORING IMPROVEMENTS (v1.4.3)
// ============================================================================

/**
 * Domain-specific prior probabilities based on pattern reliability
 * These reflect real-world false positive rates for each pattern type
 */
const PATTERN_PRIOR_PROBABILITIES: Record<string, number> = {
    // High reliability patterns (rarely false positives)
    email: 0.85,
    creditCard: 0.90,
    creditCardVisa: 0.90,
    creditCardMastercard: 0.90,
    creditCardAmex: 0.90,
    creditCardGeneric: 0.90,
    australianMedicare: 0.95,
    ssn: 0.90,
    iban: 0.92,
    australianTFN: 0.85,
    australianABN: 0.85,

    // Medium reliability patterns
    phone: 0.70,
    australianPhone: 0.70,
    australianBSB: 0.80,  // High confidence - BSB codes are reliable identifiers
    australianAccountNumber: 0.75,  // Added missing pattern
    passportNumber: 0.70,
    driversLicense: 0.70,
    nationalID: 0.70,
    australianPassport: 0.75,
    usPassport: 0.75,
    ukPassport: 0.75,
    euPassport: 0.75,
    australianDriversLicense: 0.70,
    usDriversLicense: 0.70,
    ukDriversLicense: 0.75,  // UK DL has specific format, higher confidence
    ukNationalInsurance: 0.80,
    swift: 0.80,
    routingNumber: 0.75,
    nmi: 0.70,

    // Low reliability patterns (high false positive risk)
    referenceNumber: 0.40,
    transactionID: 0.45,
    policyNumber: 0.50,
    clientNumber: 0.55,
    dateOfBirth: 0.60,  // Many false positives from service dates
    accountNumber: 0.65,
    address: 0.50,  // Address detection can have false positives
    ipv4: 0.60,
    ipv6: 0.65,

    // Custom patterns (user-defined)
    custom: 0.65
};

/**
 * Check for statistical anomalies that indicate test data or placeholders
 * Returns a confidence multiplier (0.0 to 1.0)
 */
function checkStatisticalAnomalies(value: string, patternType?: string): number {
    // Check for repeated patterns (e.g., "111-111-1111" is unlikely real phone)
    const hasRepeatedDigits = /(\d)\1{4,}/.test(value);
    if (hasRepeatedDigits) {
        return 0.2;
    }

    // Patterns that should SKIP sequential check (structured identifiers with valid sequential patterns)
    const skipSequentialCheck = [
        'australianBSB',           // BSB codes like 633-123 (Up Bank) are sequential by design
        'routingNumber',           // Bank routing numbers can have sequential digits
        'swift',                   // SWIFT codes are structured, not random
        'iban',                    // IBANs have check digits and structure
        'nmi',                     // National Meter Identifiers are structured
        'referenceNumber',         // Reference numbers often sequential
        'transactionID',           // Transaction IDs often sequential
        'policyNumber',            // Policy numbers often sequential
        'clientNumber',            // Client numbers often sequential
        'accountNumber'            // Account numbers often sequential
    ];

    // Only check for sequential patterns if this pattern type should be checked
    if (!patternType || !skipSequentialCheck.includes(patternType)) {
        // Check for sequential patterns (e.g., "123456789" is unlikely real SSN)
        const digits = value.replace(/\D/g, '');
        const hasSequential = /(?:0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210)/.test(digits);
        if (hasSequential) {
            return 0.3;
        }
    }

    // Check for common placeholder patterns
    const placeholderPatterns = [
        /^[X]+$/i,                    // XXXXXXXX
        /^[0]+$/,                     // 00000000
        /^(123|999|000)/,             // 123456789, 999999999, 000000000
        /^(N\/?A|TBD|TBA|TODO)$/i,   // N/A, TBD, TBA, TODO
        /^(test|example|sample|demo)/i, // test data markers
        /^(dummy|placeholder|fake)/i    // obvious placeholders
    ];

    const isPlaceholder = placeholderPatterns.some(p => p.test(value));
    if (isPlaceholder) {
        return 0.1;
    }

    // Check for all same character (e.g., "AAAAAAA")
    const allSameChar = /^(.)\1+$/.test(value.replace(/[\s\-]/g, ''));
    if (allSameChar && value.replace(/[\s\-]/g, '').length > 3) {
        return 0.15;
    }

    // All checks passed - no anomalies detected
    return 1.0;
}

/**
 * Get adaptive confidence threshold based on context and pattern type
 * Returns adjusted threshold (higher = more conservative, fewer false positives)
 */
function getAdaptiveThreshold(
    baseThreshold: number,
    structureType: string,
    patternType: string,
    maskingMode: string
): number {
    let threshold = baseThreshold;

    // Structured data: can use lower threshold (more confident in detection)
    if (structureType === 'xml' || structureType === 'json') {
        threshold -= 0.1;
    }

    // Plain text: use higher threshold (more conservative to avoid false positives)
    if (structureType === 'plain_text') {
        threshold += 0.15;
    }

    // High-risk patterns (prone to false positives) need higher threshold
    const highRiskPatterns = ['reference_number', 'transaction_id', 'policy_number', 'client_number', 'date_of_birth'];
    if (highRiskPatterns.includes(patternType)) {
        threshold += 0.1;
    }

    // Mode-specific adjustments
    if (maskingMode === 'strict') {
        threshold += 0.1;  // Be more conservative
    } else if (maskingMode === 'manual') {
        threshold += 0.2;  // Very high threshold (user will review)
    }
    // 'auto' mode uses base threshold

    // Clamp between reasonable bounds
    return Math.max(0.5, Math.min(0.95, threshold));
}

/**
 * Detect structure type from context
 */
function detectStructureType(contextBefore: string, contextAfter: string): string {
    if (/<[^>]+>\s*$/.test(contextBefore) && /^\s*<\//.test(contextAfter)) {
        return 'xml';
    }
    if (/[{,]\s*"[^"]+"\s*:\s*"?\s*$/.test(contextBefore)) {
        return 'json';
    }
    if (/,\s*$/.test(contextBefore) || /^\s*,/.test(contextAfter)) {
        return 'csv';
    }
    return 'plain_text';
}

/**
 * Calculate confidence score for whether a match should be masked in plain text
 * Returns a score from 0.0 (don't mask) to 1.0 (definitely mask)
 *
 * PHASE 1 IMPROVEMENTS (v1.4.3):
 * - Domain-specific prior probabilities
 * - Statistical anomaly detection (placeholder filtering)
 * - Adaptive thresholding based on context
 */
function calculateMaskingConfidence(
    text: string,
    matchIndex: number,
    matchValue: string,
    patternType: string
): number {
    const matchEnd = matchIndex + matchValue.length;

    // Context windows
    const contextBefore = text.substring(Math.max(0, matchIndex - 100), matchIndex);
    const contextAfter = text.substring(matchEnd, Math.min(text.length, matchEnd + 100));
    const immediateAfter = text.substring(matchEnd, Math.min(text.length, matchEnd + 30));

    // PHASE 1: Start with domain-specific prior instead of neutral 0.5
    const priorProbability = PATTERN_PRIOR_PROBABILITIES[patternType] || 0.5;
    let confidence = priorProbability;

    // PHASE 1: Check for statistical anomalies (test data, placeholders)
    const statisticalConfidence = checkStatisticalAnomalies(matchValue, patternType);
    if (statisticalConfidence < 0.5) {
        // Strong evidence this is test/placeholder data
        return statisticalConfidence * 0.5; // Cap at 0.25 max
    }

    // Apply statistical multiplier to confidence
    confidence *= statisticalConfidence;

    // === XML/JSON STRUCTURED DATA BOOST ===
    // If we're inside XML/JSON structure, trust the field name context and boost confidence
    const isInXmlValue = /<[^>]+>\s*$/.test(contextBefore) && /^\s*<\//.test(immediateAfter);
    const isInJsonValue = /:\s*"?\s*$/.test(contextBefore);

    if (isInXmlValue || isInJsonValue) {
        // High confidence for values in structured data - the field name is the context
        confidence = 0.85;
        return confidence; // Skip other heuristics for structured data
    }

    // === FACTORS THAT INCREASE CONFIDENCE (should mask) ===

    // 1. Has a clear label pattern before it (e.g., "Reference:", "Ref #:", "Invoice No:")
    if (/(?:ref|reference|invoice|policy|account|client|customer|id|number|no)[#:\s-]*$/i.test(contextBefore)) {
        confidence += 0.3;
    }

    // 2. Followed by alphanumeric code/number pattern (e.g., "Reference ABC123" or "Ref: 12345")
    if (/^\s*[#:\s-]*([A-Z0-9]{4,})/i.test(immediateAfter)) {
        confidence += 0.25;
    }

    // 3. Appears on its own line or isolated (structured data pattern)
    const lineContext = contextBefore.substring(contextBefore.lastIndexOf('\n') + 1);
    if (/^\s*$/.test(lineContext)) {
        confidence += 0.15;
    }

    // 4. Part of a key-value pair with common separators
    if (/[:|=]\s*$/.test(contextBefore)) {
        confidence += 0.2;
    }

    // === FACTORS THAT DECREASE CONFIDENCE (don't mask) ===

    // 1. Part of natural flowing text (surrounded by common words)
    const commonWords = /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|must|can|of|to|for|with|on|at|in|by|from|as|this|that|these|those|but|or|and|not|no)\b/i;
    const hasNaturalLanguageBefore = commonWords.test(contextBefore.substring(contextBefore.length - 30));
    const hasNaturalLanguageAfter = commonWords.test(contextAfter.substring(0, 30));

    if (hasNaturalLanguageBefore || hasNaturalLanguageAfter) {
        confidence -= 0.3;
    }

    // 2. Not followed by structured data (no numbers, codes, or separators nearby)
    if (!/[:\-#0-9]/.test(immediateAfter.substring(0, 20))) {
        confidence -= 0.2;
    }

    // 3. Matched word is just part of a larger descriptive phrase
    // (e.g., "Payment Info Reference" where "Reference" is just a column label)
    const surroundingText = contextBefore.substring(contextBefore.length - 50) + matchValue + contextAfter.substring(0, 50);
    if (/[a-zA-Z]\s+[a-zA-Z]+\s+[a-zA-Z]/i.test(surroundingText) && !/[:\-#]/.test(surroundingText)) {
        confidence -= 0.25;
    }

    // 4. Appears at start of line followed by a dash (likely a title/header, not data)
    // e.g., "- Reference Documentation" or "Reference - John Smith"
    if (/^\s*-?\s*$/s.test(contextBefore.substring(contextBefore.lastIndexOf('\n') + 1)) &&
        /^\s*-/.test(immediateAfter)) {
        confidence -= 0.4;
    }

    // 5. Part of a ticket/issue ID format (e.g., "CIB-5625")
    // In this case "Reference" is just descriptive text, not a PII label
    const lineText = text.substring(
        text.lastIndexOf('\n', matchIndex) + 1,
        text.indexOf('\n', matchEnd) > 0 ? text.indexOf('\n', matchEnd) : text.length
    );
    if (/^[A-Z]+-\d+/.test(lineText.trim())) {
        // This line starts with a ticket ID pattern - it's likely a ticket description
        confidence -= 0.35;
    }

    // === PATTERN-SPECIFIC ADJUSTMENTS ===

    // For reference numbers specifically, be more conservative
    if (patternType === 'referenceNumber') {
        // Only mask if there's a clear label + value pattern
        if (!(/(?:ref|reference|invoice)[#:\s-]*$/i.test(contextBefore) && /^\s*[#:\s-]*([A-Z0-9]{4,})/i.test(immediateAfter))) {
            confidence -= 0.2;
        }
    }

    // Clamp confidence between 0 and 1
    return Math.max(0, Math.min(1, confidence));
}

// ============================================================================
// PHASE 2 (v1.5.0): HYBRID DATE OF BIRTH DETECTION
// Replaces keyword exclusion with positive matching + age validation
// ============================================================================

/**
 * Check if the field name suggests this is a birth date field
 * Uses positive matching - only returns true if birth-related keywords are present
 */
function isBirthDateField(text: string, matchIndex: number): boolean {
    // Keywords that positively identify birth date fields
    const birthKeywords = [
        'birth', 'dob', 'dateofbirth', 'born', 'bday', 'birthday'
    ];

    // Look at context before the match (100 chars to capture field name)
    const contextStart = Math.max(0, matchIndex - 100);
    const contextBefore = text.substring(contextStart, matchIndex).toLowerCase();

    // Only return true if birth-related keyword is found
    return birthKeywords.some(keyword => contextBefore.includes(keyword));
}

/**
 * Validate if a date represents a plausible human birth date
 * Checks for valid calendar date and reasonable age range (18-120 years)
 */
function isPlausibleBirthDate(dateStr: string): boolean {
    try {
        // Parse date components
        const parts = dateStr.split(/[-/]/);
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false;

        let year: number, month: number, day: number;

        // Detect format: YYYY-MM-DD or DD-MM-YYYY
        if (parts[0].length === 4) {
            // YYYY-MM-DD format
            const parsedYear = parseInt(parts[0], 10);
            const parsedMonth = parseInt(parts[1], 10);
            const parsedDay = parseInt(parts[2], 10);

            if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedDay)) return false;

            year = parsedYear;
            month = parsedMonth;
            day = parsedDay;
        } else if (parts[2].length === 4) {
            // DD-MM-YYYY format
            const parsedDay = parseInt(parts[0], 10);
            const parsedMonth = parseInt(parts[1], 10);
            const parsedYear = parseInt(parts[2], 10);

            if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedDay)) return false;

            day = parsedDay;
            month = parsedMonth;
            year = parsedYear;
        } else {
            return false; // Unknown format
        }

        // Validate calendar date
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year ||
            date.getMonth() + 1 !== month ||
            date.getDate() !== day) {
            return false; // Invalid calendar date (e.g., Feb 30)
        }

        // Check age range (18-120 years old from today)
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;

        // Must be between 18 and 120 years old
        return age >= 18 && age <= 120;
    } catch (error) {
        return false;
    }
}

/**
 * HYBRID APPROACH: Determine if a date should be masked as a birth date
 * Combines positive field name matching with age validation
 * Both conditions must be true to mask the date
 */
function shouldMaskAsDateOfBirth(text: string, matchIndex: number, dateValue: string): boolean {
    // Step 1: Check if field name suggests birth date
    const hasBirthKeyword = isBirthDateField(text, matchIndex);

    // Step 2: Check if date is plausible birth date (valid age range)
    const isPlausibleAge = isPlausibleBirthDate(dateValue);

    // Only mask if BOTH conditions are true
    return hasBirthKeyword && isPlausibleAge;
}

const SENSITIVE_COLUMN_PATTERNS: Record<string, string[]> = {
    email: ['email', 'e-mail', 'emailaddress', 'mail', 'email_address'],
    address: ['address', 'street', 'streetaddress', 'addr', 'suburb', 'city', 'postcode', 'postal', 'zip'],
    name: ['name', 'firstname', 'lastname', 'fullname', 'addressee', 'salutation'],
    phone: ['phone', 'mobile', 'telephone', 'phonenumber', 'tel'],
    dateOfBirth: ['dob', 'dateofbirth', 'date of birth', 'birthdate', 'birth date', 'birthday', 'dateborn'],

    // Identity Documents
    passport: ['passport', 'passportno', 'passportnumber', 'passport number', 'passport no', 'passportid'],
    driversLicense: [
        'driverslicense', 'drivers license', 'driverlicense', 'driver license', 'driverlicence', 'drivers licence',
        'dl', 'dlno', 'licenceno', 'licenseno', 'licence number', 'license number'
    ],
    nationalID: [
        'nationalid', 'national id', 'identitycard', 'identity card', 'idcard', 'id card',
        'idnumber', 'id number', 'identitynumber', 'identity number', 'citizenid'
    ],

    // Banking & Financial
    bsb: ['bsb', 'bank state branch', 'bankstatebranch', 'sortcode', 'sort code'],
    accountNumber: [
        'account', 'accountno', 'accountnumber', 'acctno', 'accno',
        'bankaccount', 'bank account', 'a/c', 'acc'
    ],
    clientNumber: [
        'client', 'clientno', 'clientnumber', 'clientid',
        'customer', 'customerno', 'customernumber', 'customerid', 'custno',
        'member', 'memberno', 'membernumber', 'memberid',
        'consumerno', 'consumer_number'
    ],
    creditCard: [
        'creditcard', 'credit card', 'cardno', 'cardnumber',
        'cc', 'ccnumber', 'pan', 'card'
    ],

    // Australian Financial Identifiers
    tfn: ['tfn', 'taxfile', 'taxfilenumber', 'tax file number'],
    abn: ['abn', 'australianbusinessnumber', 'business number', 'abn number'],

    // Generic Business Identifiers
    reference: [
        'reference', 'refno', 'referenceno', 'referencenumber',
        'invoice', 'invoiceno', 'invoicenumber'
    ],
    policy: ['policy', 'policyno', 'policynumber', 'policy number'],
    transaction: [
        'transaction', 'transactionid', 'txn', 'txnid', 'transno',
        'trans id', 'transaction number'
    ],

    // International Banking
    iban: ['iban', 'international account', 'internationalaccountnumber'],
    swift: ['swift', 'swiftcode', 'bic', 'biccode', 'swift code', 'bic code'],
    routing: ['routing', 'routingnumber', 'aba', 'abanumber', 'routing number'],

    // Energy/Utilities
    identifier: ['nmi', 'id', 'identifier', 'customer_id', 'user_id', 'uuid', 'mirn']
};

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

interface PresetDefinition {
    name: string;
    description: string;
    enabledTypes: string[];
}

const MASKING_PRESETS: Record<string, PresetDefinition> = {
    none: {
        name: 'None',
        description: 'No masking applied',
        enabledTypes: []
    },
    basic: {
        name: 'Basic',
        description: 'Email and phone only',
        enabledTypes: ['email', 'phone']
    },
    financial: {
        name: 'Financial Services',
        description: 'Banking, credit cards, account numbers',
        enabledTypes: [
            'email', 'phone', 'australianBSB', 'australianAccountNumber',
            'creditCardVisa', 'creditCardMastercard', 'creditCardAmex', 'creditCardGeneric',
            'australianTFN', 'australianABN', 'accountNumber', 'clientNumber',
            'referenceNumber', 'transactionID', 'iban', 'swift', 'routingNumber',
            'dateOfBirth', 'passportNumber', 'driversLicense', 'nationalID', 'address'
        ]
    },
    healthcare: {
        name: 'Healthcare',
        description: 'Medical records and patient information',
        enabledTypes: [
            'email', 'phone', 'australianMedicare', 'ssn', 'address', 'name',
            'dateOfBirth', 'passportNumber', 'driversLicense', 'nationalID'
        ]
    },
    enterprise: {
        name: 'Enterprise (All Patterns)',
        description: 'All detection patterns enabled',
        enabledTypes: Object.keys(DETECTION_PATTERNS)
    }
};

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

// ============================================================================
// MASKING FUNCTIONS
// ============================================================================

function maskEmail(email: string, strategy: string): string {
    const [local, domain] = email.split('@');
    if (!domain || !local) return '***';

    const domainParts = domain.split('.');
    const domainName = domainParts[0] || '';
    const tld = domainParts.slice(1).join('.');

    switch (strategy) {
        case 'partial':
            return `${local[0] || ''}***@${domainName[0] || ''}***.${tld}`;
        case 'full':
            return '***@***.***';
        case 'structural':
            return `${'*'.repeat(local.length)}@${'*'.repeat(domainName.length)}.${tld}`;
        default:
            return email;
    }
}

function maskPhone(phone: string, strategy: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '***';

    switch (strategy) {
        case 'partial':
            const lastTwo = phone.slice(-2);
            return phone.slice(0, 3) + '*'.repeat(Math.max(0, phone.length - 5)) + lastTwo;
        case 'full':
            return '***';
        case 'structural':
            return phone.replace(/\d/g, '*');
        default:
            return phone;
    }
}

function maskSSN(ssn: string, strategy: string): string {
    switch (strategy) {
        case 'partial':
        case 'structural':
            return `***-**-${ssn.slice(-4)}`;
        case 'full':
            return '***-**-****';
        default:
            return ssn;
    }
}

function maskDateOfBirth(dob: string, strategy: string): string {
    // Detect separator and format
    const separators = ['-', '/', '.', ' '];
    let separator = '-';

    // Find which separator is used
    for (const sep of separators) {
        if (dob.includes(sep)) {
            separator = sep;
            break;
        }
    }

    // Detect if it's a month name format (e.g., "28 May 1986" or "28-May-1986")
    const monthNamePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i;
    const hasMonthName = monthNamePattern.test(dob);

    if (hasMonthName) {
        // Format: DD-MMM-YYYY or DD MMM YYYY
        const parts = dob.split(/[-/.\s]+/);
        if (parts.length !== 3 || !parts[0] || !parts[2]) return '**' + separator + '***' + separator + '****';

        switch (strategy) {
            case 'partial':
                // Show year, mask day and month
                return '**' + separator + '***' + separator + parts[2];
            case 'full':
                return '**' + separator + '***' + separator + '****';
            case 'structural':
                // Show day, mask month and year
                return parts[0] + separator + '***' + separator + '****';
            default:
                return dob;
        }
    }

    // Split by detected separator
    const parts = dob.split(separator);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
        return '****' + separator + '**' + separator + '**';
    }

    // Detect format based on part lengths and values
    if (parts[0].length === 4) {
        // YYYY-MM-DD format
        switch (strategy) {
            case 'partial':
                // Show year, mask month and day
                return `${parts[0]}${separator}**${separator}**`;
            case 'full':
                return `****${separator}**${separator}**`;
            case 'structural':
                // Mask year and month, show day
                return `****${separator}**${separator}${parts[2]}`;
            default:
                return dob;
        }
    } else if (parts[2].length === 4) {
        // DD-MM-YYYY or MM-DD-YYYY format
        switch (strategy) {
            case 'partial':
                // Show year, mask day and month
                return `**${separator}**${separator}${parts[2]}`;
            case 'full':
                return `**${separator}**${separator}****`;
            case 'structural':
                // Show day, mask month and year
                return `${parts[0]}${separator}**${separator}****`;
            default:
                return dob;
        }
    }

    // Fallback
    return '****' + separator + '**' + separator + '**';
}

function maskPassport(passport: string, strategy: string): string {
    // Passport numbers vary: alphanumeric 6-12 characters
    if (!passport || passport.length === 0) return '***';

    switch (strategy) {
        case 'partial':
            if (passport.length <= 3) return '***';
            return passport[0] + '*'.repeat(passport.length - 2) + passport[passport.length - 1];
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(passport.length);
        default:
            return passport;
    }
}

function maskDriversLicense(license: string, strategy: string): string {
    // Driver's license formats vary widely
    if (!license || license.length === 0) return '***';

    switch (strategy) {
        case 'partial':
            if (license.length <= 3) return '***';
            return license[0] + '*'.repeat(Math.max(0, license.length - 2)) + license[license.length - 1];
        case 'full':
            return '***';
        case 'structural':
            return license.replace(/[A-Z0-9]/gi, '*');
        default:
            return license;
    }
}

function maskNationalID(id: string, strategy: string): string {
    // National ID formats vary by country
    if (!id || id.length === 0) return '***';

    switch (strategy) {
        case 'partial':
            if (id.length <= 4) return '***';
            return id.substring(0, 2) + '*'.repeat(Math.max(0, id.length - 4)) + id.substring(id.length - 2);
        case 'full':
            return '***';
        case 'structural':
            return id.replace(/[A-Z0-9]/gi, '*');
        default:
            return id;
    }
}

function maskCreditCard(card: string, strategy: string): string {
    switch (strategy) {
        case 'partial':
        case 'structural':
            return card.replace(/\d(?=.*\d{4})/g, '*');
        case 'full':
            return '*'.repeat(card.length);
        default:
            return card;
    }
}

function maskAccountNumber(acct: string, strategy: string): string {
    const digits = acct.replace(/\D/g, '');
    if (digits.length <= 3) return '***';

    switch (strategy) {
        case 'partial':
            return `***${digits.slice(-3)}`;
        case 'full':
            return '***';
        case 'structural':
            return acct.replace(/\d/g, '*');
        default:
            return acct;
    }
}

function maskIPAddress(ip: string, strategy: string): string {
    const parts = ip.split('.');
    switch (strategy) {
        case 'partial':
        case 'structural':
            return `${parts[0]}.${parts[1]}.***.***`;
        case 'full':
            return '***.***.***. ***';
        default:
            return ip;
    }
}

function maskBSB(bsb: string, strategy: string): string {
    switch (strategy) {
        case 'partial':
            const last2 = bsb.replace(/\D/g, '').slice(-2);
            return `***-*${last2}`;
        case 'full':
            return '***-***';
        case 'structural':
            return bsb.replace(/\d/g, '*');
        default:
            return bsb;
    }
}

function maskTFN(tfn: string, strategy: string): string {
    switch (strategy) {
        case 'partial':
        case 'structural':
            return '*** *** ***';
        case 'full':
            return '*** *** ***';
        default:
            return tfn;
    }
}

function maskABN(abn: string, strategy: string): string {
    switch (strategy) {
        case 'partial':
        case 'structural':
            return '** *** *** ***';
        case 'full':
            return '** *** *** ***';
        default:
            return abn;
    }
}

function maskGeneric(value: string, strategy: string): string {
    if (!value || value.length === 0) return '***';

    switch (strategy) {
        case 'full':
            return '***';
        case 'partial':
            if (value.length <= 3) return '***';
            return value[0] + '***' + value[value.length - 1];
        case 'structural':
            return '*'.repeat(value.length);
        default:
            return value;
    }
}

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
    australianBSB: maskBSB,
    australianTFN: maskTFN,
    australianABN: maskABN,
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
// COLUMN DETECTION
// ============================================================================

export function shouldMaskColumn(columnName: string, config: MaskingConfig): boolean {
    const normalized = columnName.toLowerCase().replace(/[_\s-]/g, '');

    // Check deny-list first (highest priority)
    if (config.denyList.some(pattern => {
        const normalizedPattern = pattern.toLowerCase().replace(/[_\s-]/g, '');
        return normalized.includes(normalizedPattern);
    })) {
        return true;
    }

    // Check allow-list (override built-in patterns)
    if (config.allowList.length > 0) {
        return !config.allowList.some(pattern => {
            const normalizedPattern = pattern.toLowerCase().replace(/[_\s-]/g, '');
            return normalized.includes(normalizedPattern);
        });
    }

    // Check built-in patterns
    for (const [category, patterns] of Object.entries(SENSITIVE_COLUMN_PATTERNS)) {
        if (config.types[category] === false) continue;

        if (patterns.some(pattern => normalized.includes(pattern.replace(/[_\s-]/g, '')))) {
            return true;
        }
    }

    return false;
}

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

            // Store replacement
            replacements.set(originalValue, maskedValue);
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

            // Store replacement
            replacements.set(originalValue, maskedValue);
        }
    }

    // Apply all replacements at once (sorted by length descending to avoid partial replacements)
    let maskedText = text;
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

function parseCsvLine(line: string): string[] {
    // Simple CSV parser (handles quoted values with commas)
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function detectColumnType(columnName: string): string {
    const normalized = columnName.toLowerCase().replace(/[_\s-]/g, '');

    for (const [category, patterns] of Object.entries(SENSITIVE_COLUMN_PATTERNS)) {
        if (patterns.some(p => normalized.includes(p.replace(/[_\s-]/g, '')))) {
            // Map category to pattern key
            switch (category) {
                case 'email': return 'email';
                case 'phone': return 'phone';
                case 'address': return 'address';
                case 'dateOfBirth': return 'dateOfBirth';
                case 'passport': return 'passportNumber';
                case 'driversLicense': return 'driversLicense';
                case 'nationalID': return 'nationalID';
                case 'bsb': return 'australianBSB';
                case 'accountNumber': return 'accountNumber';
                case 'clientNumber': return 'clientNumber';
                case 'creditCard': return 'creditCardGeneric';
                case 'tfn': return 'australianTFN';
                case 'abn': return 'australianABN';
                case 'reference': return 'referenceNumber';
                case 'policy': return 'policyNumber';
                case 'transaction': return 'transactionID';
                case 'iban': return 'iban';
                case 'swift': return 'swift';
                case 'routing': return 'routingNumber';
                case 'identifier':
                    if (normalized.includes('nmi')) return 'nmi';
                    return 'accountNumber';
                default: return 'custom';
            }
        }
    }

    return 'custom';
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
// STATUS BAR INDICATOR
// ============================================================================

let maskingStatusBarItem: vscode.StatusBarItem | undefined;

export function updateMaskingStatusBar(result: MaskedResult, config: MaskingConfig): void {
    if (!config.showIndicator) return;

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

export function showMaskingNotification(result: MaskedResult, config: MaskingConfig): void {
    if (result.detections.length === 0) return;

    const byType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
        return acc;
    }, {} as Record<PiiType, number>);

    const details = Object.entries(byType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

    vscode.window.showInformationMessage(
        `Copied with ${result.detections.length} item${result.detections.length > 1 ? 's' : ''} masked: ${details}`,
        'Settings'
    ).then(selection => {
        if (selection === 'Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'copyInfoWithContext.masking');
        }
    });
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
