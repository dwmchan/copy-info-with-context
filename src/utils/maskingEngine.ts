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
        }))
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
    dateOfBirth: /\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, // YYYY-MM-DD or YYYY/MM/DD

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

/**
 * Check if a date match should be excluded because it's in a non-birth-date field
 * Returns true if the date appears to be a service/business date, not a birth date
 */
function isNonBirthDateField(text: string, matchIndex: number): boolean {
    // Keywords that indicate this is NOT a birth date
    const exclusionKeywords = [
        'eligible', 'service', 'start', 'end', 'expiry', 'expire', 'effective', 'transaction',
        'created', 'modified', 'updated', 'deleted', 'issued', 'commence', 'completion',
        'payment', 'settlement', 'process', 'registration', 'enrollment', 'join', 'leave',
        'termination', 'cancellation', 'renewal', 'anniversary', 'due', 'maturity',
        'valuation', 'assessment', 'review', 'audit', 'report', 'statement', 'financial'
    ];

    // Look at context before the match (100 chars to capture field name)
    const contextStart = Math.max(0, matchIndex - 100);
    const contextBefore = text.substring(contextStart, matchIndex).toLowerCase();

    // Check if any exclusion keyword appears in the context
    return exclusionKeywords.some(keyword => contextBefore.includes(keyword));
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
    // Expected format: YYYY-MM-DD or YYYY/MM/DD
    const separator = dob.includes('/') ? '/' : '-';
    const parts = dob.split(separator);

    if (parts.length !== 3) return '****-**-**';

    switch (strategy) {
        case 'partial':
            // Show only the year, mask month and day
            return `${parts[0]}${separator}**${separator}**`;
        case 'full':
            return `****${separator}**${separator}**`;
        case 'structural':
            // Mask year and month, show day
            return `****${separator}**${separator}${parts[2]}`;
        default:
            return dob;
    }
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

            // Special handling for dateOfBirth: skip if it's in a non-birth-date field
            if (type === 'dateOfBirth' && isNonBirthDateField(text, match.index!)) {
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
                confidence: 0.9
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
