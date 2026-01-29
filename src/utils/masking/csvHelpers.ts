// csvHelpers.ts - CSV/delimited file processing utilities
// Phase 1 (v1.6.0): Extracted from monolithic maskingEngine.ts

import { MaskingConfig } from './config';

/**
 * Column name patterns that indicate sensitive data
 * Maps category names to array of pattern strings for fuzzy matching
 */
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

/**
 * Auto-detect CSV delimiter from sample lines
 * Analyzes common delimiters: comma, tab, pipe, semicolon, colon
 *
 * @param sampleLines - Array of sample lines from the file (typically first 5-10 lines)
 * @returns Detected delimiter character
 */
export function detectDelimiter(sampleLines: string[]): string {
    if (sampleLines.length === 0) {
        return ','; // Default to comma
    }

    const delimiters = [',', '\t', '|', ';', ':'];
    const delimiterCounts: Map<string, number[]> = new Map();

    // Count occurrences of each delimiter in each sample line
    for (const line of sampleLines) {
        // Skip empty lines or lines that are too short
        if (!line || line.trim().length < 3) {
            continue;
        }

        for (const delim of delimiters) {
            if (!delimiterCounts.has(delim)) {
                delimiterCounts.set(delim, []);
            }

            // Count occurrences (ignore if inside quotes)
            let count = 0;
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' || char === "'") {
                    inQuotes = !inQuotes;
                } else if (char === delim && !inQuotes) {
                    count++;
                }
            }

            delimiterCounts.get(delim)!.push(count);
        }
    }

    // Find delimiter with most consistent count across lines (best candidate)
    let bestDelimiter = ',';
    let bestScore = 0;

    for (const [delim, counts] of delimiterCounts.entries()) {
        if (counts.length === 0) {continue;}

        // Calculate average count
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

        // Calculate variance (consistency)
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;

        // Score: higher average is better, lower variance is better
        // Weight average more heavily than consistency
        const score = avg * 10 - variance;

        // Must have at least 1 occurrence on average to be valid
        if (avg >= 1 && score > bestScore) {
            bestScore = score;
            bestDelimiter = delim;
        }
    }

    return bestDelimiter;
}

/**
 * Parse a CSV line with proper quote handling
 * Handles quoted values containing commas, escaped quotes, etc.
 *
 * @param line - CSV line to parse
 * @param delimiter - Delimiter character (default: comma)
 * @returns Array of field values
 */
export function parseCsvLine(line: string, delimiter = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar: string | null = null;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = i < line.length - 1 ? line[i + 1] : null;

        // Handle quote characters (both single and double quotes)
        if ((char === '"' || char === "'") && !inQuotes) {
            // Start of quoted value
            inQuotes = true;
            quoteChar = char;
            continue;
        } else if (char === quoteChar && inQuotes) {
            // Check for escaped quote (two quotes in a row)
            if (nextChar === quoteChar) {
                current += char;
                i++; // Skip next quote
                continue;
            } else {
                // End of quoted value
                inQuotes = false;
                quoteChar = null;
                continue;
            }
        }

        // Handle delimiter
        if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // Push final value
    result.push(current.trim());
    return result;
}

/**
 * Determine if a CSV column should be masked based on its name
 * Uses fuzzy matching against SENSITIVE_COLUMN_PATTERNS
 * Respects deny-list (force mask) and allow-list (never mask) from config
 *
 * @param columnName - Column header name
 * @param config - Masking configuration
 * @returns true if column should be masked
 */
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
        if (config.types[category] === false) {continue;}

        if (patterns.some(pattern => normalized.includes(pattern.replace(/[_\s-]/g, '')))) {
            return true;
        }
    }

    return false;
}

/**
 * Detect the PII type from a column name
 * Maps column name patterns to PII type identifiers
 *
 * @param columnName - Column header name
 * @returns PII type identifier (pattern key for masking functions)
 */
export function detectColumnType(columnName: string): string {
    const normalized = columnName.toLowerCase().replace(/[_\s-]/g, '');

    // Iterate through patterns to find a match
    for (const [category, patterns] of Object.entries(SENSITIVE_COLUMN_PATTERNS)) {
        if (patterns.some(p => normalized.includes(p.replace(/[_\s-]/g, '')))) {
            // Map category to pattern key used in masking functions
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
                    // Special case: check for NMI specifically
                    if (normalized.includes('nmi')) {return 'nmi';}
                    return 'accountNumber';
                default:
                    return 'custom';
            }
        }
    }

    // No match found
    return 'custom';
}

/**
 * Detect if first row contains headers
 * Heuristic: headers typically have non-numeric text, while data rows may be more numeric
 *
 * @param firstLine - First line of CSV
 * @param secondLine - Second line of CSV (for comparison)
 * @param delimiter - Delimiter character
 * @returns true if first line appears to be headers
 */
export function detectHeaders(firstLine: string, secondLine: string | null, delimiter = ','): boolean {
    const firstFields = parseCsvLine(firstLine, delimiter);

    // If there's no second line, assume first line is headers
    if (!secondLine || secondLine.trim().length === 0) {
        return true;
    }

    const secondFields = parseCsvLine(secondLine, delimiter);

    // Check if first line fields are more text-like (typical of headers)
    const firstLineNumericCount = firstFields.filter(f => !isNaN(Number(f.trim()))).length;
    const secondLineNumericCount = secondFields.filter(f => !isNaN(Number(f.trim()))).length;

    // Headers typically have fewer numeric fields than data rows
    return firstLineNumericCount < secondLineNumericCount;
}

/**
 * Get column range from a selection
 * Maps character positions to column indices in CSV data
 *
 * @param line - CSV line
 * @param startChar - Start character position in line
 * @param endChar - End character position in line
 * @param delimiter - Delimiter character
 * @returns Object with startColumn and endColumn indices
 */
export interface ColumnRange {
    startColumn: number;
    endColumn: number;
}

export function getColumnRangeFromSelection(
    line: string,
    startChar: number,
    endChar: number,
    delimiter = ','
): ColumnRange {
    const fields = parseCsvLine(line, delimiter);

    let currentPos = 0;
    let startColumn = 0;
    let endColumn = fields.length - 1;
    let found = false;

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i] ?? '';
        const fieldStart = currentPos;
        const fieldEnd = currentPos + field.length;

        // Check if startChar falls within this field
        if (!found && startChar >= fieldStart && startChar <= fieldEnd) {
            startColumn = i;
            found = true;
        }

        // Check if endChar falls within this field
        if (endChar >= fieldStart && endChar <= fieldEnd) {
            endColumn = i;
            break;
        }

        // Move position forward (field length + delimiter)
        currentPos = fieldEnd + 1;
    }

    return { startColumn, endColumn };
}

/**
 * Build ASCII table representation of CSV data
 * Creates table with Unicode box-drawing characters
 *
 * @param headers - Column headers
 * @param rows - Data rows (array of arrays)
 * @param columnWidths - Optional fixed column widths
 * @returns ASCII table string
 */
export function buildAsciiTable(
    headers: string[],
    rows: string[][],
    columnWidths?: number[]
): string {
    // Calculate column widths if not provided
    const widths = columnWidths ?? headers.map((header, i) => {
        const headerLen = header.length;
        const maxDataLen = Math.max(
            ...rows.map(row => (row[i] ?? '').toString().length)
        );
        return Math.max(headerLen, maxDataLen, 3); // Minimum width of 3
    });

    // Box-drawing characters
    const chars = {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        cross: '┼',
        topJunction: '┬',
        bottomJunction: '┴',
        leftJunction: '├',
        rightJunction: '┤'
    };

    // Build separator lines
    const topLine = chars.topLeft +
        widths.map(w => chars.horizontal.repeat(w + 2)).join(chars.topJunction) +
        chars.topRight;

    const middleLine = chars.leftJunction +
        widths.map(w => chars.horizontal.repeat(w + 2)).join(chars.cross) +
        chars.rightJunction;

    const bottomLine = chars.bottomLeft +
        widths.map(w => chars.horizontal.repeat(w + 2)).join(chars.bottomJunction) +
        chars.bottomRight;

    // Build header row
    const headerRow = `${chars.vertical  } ${ 
        headers.map((h, i) => h.padEnd(widths[i] ?? 0)).join(` ${chars.vertical} `) 
        } ${chars.vertical}`;

    // Build data rows
    const dataRows = rows.map(row =>
        `${chars.vertical  } ${ 
        row.map((cell, i) => (cell || '').toString().padEnd(widths[i] ?? 0)).join(` ${chars.vertical} `) 
        } ${chars.vertical}`
    );

    // Combine all parts
    return [
        topLine,
        headerRow,
        middleLine,
        ...dataRows,
        bottomLine
    ].join('\n');
}

/**
 * Detect column alignment based on data type
 * Numbers: right-aligned, Booleans: center-aligned, Text: left-aligned
 *
 * @param columns - Array of values for a column
 * @returns 'left' | 'right' | 'center'
 */
export type ColumnAlignment = 'left' | 'right' | 'center';

export function detectColumnAlignments(rows: string[][]): ColumnAlignment[] {
    if (rows.length === 0 || !rows[0] || rows[0].length === 0) {
        return [];
    }

    const numColumns = (rows[0]?.length) ?? 0;
    const alignments: ColumnAlignment[] = [];

    for (let col = 0; col < numColumns; col++) {
        const values = rows.map(row => row[col] ?? '').filter(v => v.trim().length > 0);

        if (values.length === 0) {
            alignments.push('left');
            continue;
        }

        // Count numeric and boolean values
        const numericCount = values.filter(v => !isNaN(Number(v))).length;
        const booleanCount = values.filter(v =>
            ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase())
        ).length;

        // Determine alignment
        if (numericCount / values.length > 0.8) {
            alignments.push('right');  // Mostly numbers
        } else if (booleanCount / values.length > 0.8) {
            alignments.push('center'); // Mostly booleans
        } else {
            alignments.push('left');   // Default to left (text)
        }
    }

    return alignments;
}

/**
 * Export sensitive column patterns for use in other modules
 */
export function getSensitiveColumnPatterns(): Record<string, string[]> {
    return SENSITIVE_COLUMN_PATTERNS;
}
