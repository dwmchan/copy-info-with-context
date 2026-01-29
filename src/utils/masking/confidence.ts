// confidence.ts - Confidence scoring and statistical validation
// Phase 1 (v1.6.0): Extracted from monolithic maskingEngine.ts

/**
 * Domain-specific prior probabilities for PII patterns
 * Based on empirical false positive rates
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
    australianBSB: 0.80,
    australianAccountNumber: 0.75,
    passportNumber: 0.70,
    driversLicense: 0.70,
    nationalID: 0.70,
    accountNumber: 0.70,
    address: 0.65,
    nmi: 0.75,
    swift: 0.80,

    // Low reliability patterns (high false positive risk)
    referenceNumber: 0.40,
    transactionID: 0.45,
    policyNumber: 0.50,
    dateOfBirth: 0.60,
    clientNumber: 0.55,
    ipAddress: 0.50,
    ipv4: 0.50,
    ipv6: 0.50,
    routingNumber: 0.55
};

/**
 * Check for statistical anomalies in a value
 * Detects test data, placeholders, and synthetic values
 *
 * @param value - Value to check
 * @param patternType - Optional pattern type for pattern-aware checks
 * @returns Confidence multiplier (0.0-1.0)
 */
export function checkStatisticalAnomalies(value: string, patternType?: string): number {
    // 1. Check for repeated patterns (e.g., "111-111-1111" is unlikely real phone)
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
        // 2. Check for sequential patterns (e.g., "123456789" is unlikely real SSN)
        const digits = value.replace(/\D/g, '');
        const hasSequential = /(?:0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210)/.test(digits);
        if (hasSequential) {
            return 0.3;
        }
    }

    // 3. Check for common placeholders
    const placeholders = /^(XXXX|0000|N\/A|TBD|TODO|test|example|dummy|placeholder|sample)/i;
    if (placeholders.test(value)) {
        return 0.1;
    }

    // 4. Check if all characters are the same
    const cleanValue = value.replace(/\W/g, '');
    if (cleanValue.length > 2 && /^(.)\1+$/.test(cleanValue)) {
        return 0.15;
    }

    return 1.0; // No anomalies detected
}

/**
 * Detect structure type from context
 * Used for adaptive thresholding
 *
 * @param contextBefore - Text before the match
 * @param contextAfter - Text after the match
 * @returns Structure type: 'xml', 'json', 'csv', or 'plain_text'
 */
export function detectStructureType(contextBefore: string, contextAfter: string): string {
    // XML: surrounded by angle brackets
    if (/<[^>]+>\s*$/.test(contextBefore) && /^\s*<\//.test(contextAfter)) {
        return 'xml';
    }

    // JSON: field name with colon
    if (/[{,]\s*"[^"]+"\s*:\s*"?\s*$/.test(contextBefore)) {
        return 'json';
    }

    // CSV: commas around value
    if (/,\s*$/.test(contextBefore) || /^\s*,/.test(contextAfter)) {
        return 'csv';
    }

    return 'plain_text';
}

/**
 * Get adaptive confidence threshold based on context and pattern type
 * Adjusts threshold based on document structure and pattern reliability
 *
 * @param baseThreshold - Base threshold from configuration (typically 0.7)
 * @param structureType - Detected structure type
 * @param patternType - PII pattern type
 * @param maskingMode - Masking mode ('auto', 'manual', 'strict')
 * @returns Adjusted threshold (0.5-0.95)
 */
export function getAdaptiveThreshold(
    baseThreshold: number,
    structureType: string,
    patternType: string,
    maskingMode: string
): number {
    let threshold = baseThreshold;

    // Context-based adjustments
    if (structureType === 'xml' || structureType === 'json') {
        threshold -= 0.1;  // More confident in structured data
    }
    if (structureType === 'plain_text') {
        threshold += 0.15; // More conservative in documentation
    }

    // Pattern-based adjustments
    const highRiskPatterns = ['referenceNumber', 'transactionID', 'policyNumber', 'clientNumber'];
    if (highRiskPatterns.includes(patternType)) {
        threshold += 0.1;  // Higher bar for risky patterns
    }

    // Mode-based adjustments
    if (maskingMode === 'strict') {
        threshold += 0.1;
    }
    if (maskingMode === 'manual') {
        threshold += 0.2;
    }

    // Clamp to reasonable range
    return Math.max(0.5, Math.min(0.95, threshold));
}

/**
 * Calculate masking confidence for a detected pattern
 * Combines prior probability, statistical checks, and context analysis
 *
 * @param text - Full text being analyzed
 * @param matchIndex - Index of the match in the text
 * @param matchValue - The matched value
 * @param patternType - Type of PII pattern
 * @returns Confidence score (0.0-1.0)
 */
export function calculateMaskingConfidence(
    text: string,
    matchIndex: number,
    matchValue: string,
    patternType: string
): number {
    // PHASE 1: Start with domain-specific prior probability
    const priorProbability = PATTERN_PRIOR_PROBABILITIES[patternType] ?? 0.5;
    let confidence = priorProbability;

    // PHASE 1: Check for statistical anomalies
    const statisticalConfidence = checkStatisticalAnomalies(matchValue, patternType);

    // Early exit for obvious test data
    if (statisticalConfidence < 0.5) {
        return statisticalConfidence * 0.5;
    }

    // Apply statistical multiplier
    confidence *= statisticalConfidence;

    // Context analysis: look at surrounding text
    const contextStart = Math.max(0, matchIndex - 100);
    const contextEnd = Math.min(text.length, matchIndex + matchValue.length + 100);
    const context = text.substring(contextStart, contextEnd).toLowerCase();

    // Positive indicators in context
    const positiveKeywords = ['user', 'customer', 'client', 'member', 'contact', 'personal', 'private'];
    const hasPositiveContext = positiveKeywords.some(kw => context.includes(kw));
    if (hasPositiveContext) {
        confidence += 0.1;
    }

    // Negative indicators in context
    const negativeKeywords = ['example', 'sample', 'test', 'demo', 'dummy', 'placeholder'];
    const hasNegativeContext = negativeKeywords.some(kw => context.includes(kw));
    if (hasNegativeContext) {
        confidence -= 0.3;
    }

    // Field name indicators (for structured data)
    const fieldNameIndicators = ['email', 'phone', 'ssn', 'account', 'card', 'passport', 'license'];
    const hasFieldIndicator = fieldNameIndicators.some(kw => context.includes(kw));
    if (hasFieldIndicator) {
        confidence += 0.2;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(1, confidence));
}

/**
 * Check if a date match should be excluded because it's in a non-birth-date field
 * Returns true if the date appears to be a service/business date, not a birth date
 *
 * @param text - Full text being analyzed
 * @param matchIndex - Index of the match in the text
 * @returns true if this is likely NOT a birth date
 */
export function isNonBirthDateField(text: string, matchIndex: number): boolean {
    // Keywords that indicate this is NOT a birth date
    const exclusionKeywords = [
        'eligible', 'service', 'start', 'end', 'expiry', 'expire', 'effective', 'transaction',
        'created', 'modified', 'updated', 'deleted', 'issued', 'commence', 'completion',
        'payment', 'settlement', 'process', 'registration', 'enrollment', 'join', 'leave',
        'termination', 'cancellation', 'renewal', 'anniversary', 'due', 'maturity',
        'valuation', 'assessment', 'review', 'audit', 'report', 'statement', 'financial',
        'debit', 'lapse', 'premium', 'reinstate', 'pay'
    ];

    // Look at context before the match (100 chars to capture field name)
    const contextStart = Math.max(0, matchIndex - 100);
    const contextBefore = text.substring(contextStart, matchIndex).toLowerCase();

    // Check if any exclusion keyword appears in the context
    return exclusionKeywords.some(keyword => contextBefore.includes(keyword));
}

/**
 * Check if a match position is inside a field name/tag name
 * Returns true if the match should be skipped (it's part of a field name, not a value)
 *
 * @param text - Full text being analyzed
 * @param matchIndex - Index of the match in the text
 * @param matchLength - Length of the matched value
 * @returns true if the match is inside a field/tag name
 */
export function isInsideFieldName(text: string, matchIndex: number, matchLength: number): boolean {
    const matchEnd = matchIndex + matchLength;

    // Look back and forward to check context
    // Increased lookback from 50 to 300 chars to handle XML documents with CDATA sections
    // where opening tags may be far from the match position
    const lookbackStart = Math.max(0, matchIndex - 300);
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
