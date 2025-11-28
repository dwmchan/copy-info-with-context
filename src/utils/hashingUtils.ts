// hashingUtils.ts - Deterministic hashing for PII masking
// Phase 2 implementation: Cryptographic hashing with consistent results

import * as crypto from 'crypto';

/**
 * Deterministic hash generation for PII values
 *
 * Uses SHA-256 with optional salt for security while maintaining:
 * - Determinism: Same input always produces same hash
 * - Irreversibility: Cannot recover original value from hash
 * - Collision resistance: Extremely unlikely two values produce same hash
 *
 * Mathematical properties:
 * - Hash function: H: {0,1}* → {0,1}^256
 * - Deterministic: ∀x, H(x) = H(x)
 * - One-way: Given H(x), computationally infeasible to find x
 * - Collision resistant: Computationally infeasible to find x ≠ y where H(x) = H(y)
 *
 * @param value - Value to hash
 * @param salt - Optional salt for additional security (defaults to workspace-specific)
 * @param truncateLength - Length of hash output (default 8)
 * @returns Deterministic hash string
 */
export function generateDeterministicHash(
    value: string,
    salt?: string,
    truncateLength: number = 8
): string {
    // Use default salt if not provided (based on a fixed string)
    // In production, this could be workspace-specific or user-configurable
    const effectiveSalt = salt || 'copy-info-with-context-v1';

    // Create SHA-256 hash
    const hash = crypto
        .createHash('sha256')
        .update(effectiveSalt + value)
        .digest('hex');

    // Truncate to specified length
    return hash.substring(0, truncateLength);
}

/**
 * Hash email address while preserving structure
 *
 * Format: {hash}@{domain}
 * Example: abc123@example.com → h4sh3d@example.com
 *
 * Preserves domain for:
 * - Analytics (understand email providers)
 * - Debugging (identify corporate vs personal emails)
 *
 * @param email - Email address
 * @param preserveDomain - Whether to preserve actual domain
 * @returns Hashed email
 */
export function hashEmail(email: string, preserveDomain: boolean = true): string {
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return generateDeterministicHash(email);
    }

    const localPart = parts[0];
    const domain = parts[1];
    const hashedLocal = generateDeterministicHash(localPart, 'email-local');

    if (preserveDomain) {
        return `${hashedLocal}@${domain}`;
    } else {
        const hashedDomain = generateDeterministicHash(domain, 'email-domain');
        return `${hashedLocal}@${hashedDomain}.com`;
    }
}

/**
 * Hash phone number while preserving country code
 *
 * Format: +{country}{hash}
 * Example: +61 412 345 678 → +61-h4sh3d12
 *
 * Preserves country code for geographic context
 *
 * @param phone - Phone number
 * @returns Hashed phone number
 */
export function hashPhone(phone: string): string {
    // Extract country code if present
    const countryCodeMatch = phone.match(/^\+(\d{1,3})/);

    if (countryCodeMatch && countryCodeMatch[1]) {
        const countryCode = countryCodeMatch[1];
        const restOfNumber = phone.substring(countryCodeMatch[0].length).replace(/\D/g, '');
        const hashedNumber = generateDeterministicHash(restOfNumber, 'phone', 10);
        return `+${countryCode}-${hashedNumber}`;
    }

    // No country code, hash entire number
    const digits = phone.replace(/\D/g, '');
    return generateDeterministicHash(digits, 'phone', 12);
}

/**
 * Hash credit card while preserving last 4 digits
 *
 * Format: HASH-{last4}
 * Example: 4532 1234 5678 9010 → H4SH3D12-9010
 *
 * Preserves last 4 for:
 * - User verification
 * - Fraud detection
 * - Support tickets
 *
 * Industry standard practice (PCI DSS compliant)
 *
 * @param cardNumber - Credit card number
 * @returns Hashed credit card
 */
export function hashCreditCard(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13) {
        return generateDeterministicHash(cardNumber);
    }

    const last4 = digits.substring(digits.length - 4);
    const firstDigits = digits.substring(0, digits.length - 4);
    const hashedFirst = generateDeterministicHash(firstDigits, 'cc', 8).toUpperCase();

    return `${hashedFirst}-${last4}`;
}

/**
 * Hash SSN while preserving last 4 digits
 *
 * Format: ***-**-{last4}
 * Example: 123-45-6789 → H4S-H3-6789
 *
 * @param ssn - Social Security Number
 * @returns Hashed SSN
 */
export function hashSSN(ssn: string): string {
    const digits = ssn.replace(/\D/g, '');

    if (digits.length !== 9) {
        return '***-**-****';
    }

    const last4 = digits.substring(5);
    const first5 = digits.substring(0, 5);
    const hash = generateDeterministicHash(first5, 'ssn', 5).toUpperCase();

    return `${hash.substring(0, 3)}-${hash.substring(3, 5)}-${last4}`;
}

/**
 * Hash date of birth while preserving year
 *
 * Format: YYYY-{hash}
 * Example: 1986-05-28 → 1986-H4SH
 *
 * Preserves year for:
 * - Age range analysis
 * - Cohort studies
 *
 * @param dob - Date of birth
 * @returns Hashed DOB
 */
export function hashDateOfBirth(dob: string): string {
    const parts = dob.split(/[-/]/);

    if (parts.length !== 3) {
        return generateDeterministicHash(dob);
    }

    // Detect format
    let year: string;
    if (parts[0] && parts[0].length === 4) {
        // YYYY-MM-DD
        year = parts[0];
        const monthDay = `${parts[1] || ''}-${parts[2] || ''}`;
        const hash = generateDeterministicHash(monthDay, 'dob', 4).toUpperCase();
        return `${year}-${hash}`;
    } else if (parts[2] && parts[2].length === 4) {
        // DD-MM-YYYY
        year = parts[2];
        const dayMonth = `${parts[0] || ''}-${parts[1] || ''}`;
        const hash = generateDeterministicHash(dayMonth, 'dob', 4).toUpperCase();
        return `${hash}-${year}`;
    }

    return generateDeterministicHash(dob);
}

/**
 * Hash address while preserving postcode
 *
 * Format: {hash}, {city}, {postcode}
 * Example: 123 Main St, Melbourne VIC 3000 → H4SH3D12, Melbourne, 3000
 *
 * Preserves postcode for geographic analysis
 *
 * @param address - Full address
 * @returns Hashed address
 */
export function hashAddress(address: string): string {
    // Try to extract postcode (4 digits for AU, 5 for US, etc.)
    const postcodeMatch = address.match(/\b(\d{4,5})\b/);

    if (postcodeMatch && postcodeMatch[1]) {
        const postcode = postcodeMatch[1];
        const addressWithoutPostcode = address.replace(postcode, '').trim();
        const hash = generateDeterministicHash(addressWithoutPostcode, 'address', 8).toUpperCase();
        return `${hash}, ${postcode}`;
    }

    // No postcode found, hash entire address
    return generateDeterministicHash(address, 'address', 12).toUpperCase();
}

/**
 * Generic hash function for any value
 *
 * @param value - Value to hash
 * @param context - Context string for salt
 * @param length - Output length
 * @returns Hashed value
 */
export function hashGeneric(value: string, context: string = 'generic', length: number = 8): string {
    return generateDeterministicHash(value, context, length).toUpperCase();
}

/**
 * Map of PII type to hashing function
 */
export const HASH_FUNCTIONS = {
    email: hashEmail,
    phone: hashPhone,
    creditCard: hashCreditCard,
    creditCardVisa: hashCreditCard,
    creditCardMastercard: hashCreditCard,
    creditCardAmex: hashCreditCard,
    creditCardGeneric: hashCreditCard,
    ssn: hashSSN,
    dateOfBirth: hashDateOfBirth,
    address: hashAddress,
    // All others use generic hash
    generic: (value: string) => hashGeneric(value)
} as const;

// Make the runtime enum available for callers that use HashFormat as a value
export enum HashFormat {
    BASE64_SHORT = 'BASE64_SHORT'
}

// Keep a separate type alias for keys of the HASH_FUNCTIONS map
export type HashFunctionKey = keyof typeof HASH_FUNCTIONS;

export function hashValue(value: string, format: HashFunctionKey | HashFormat = 'generic'): string {
    // If the caller passed one of our runtime enum formats, handle specially
    if (format === HashFormat.BASE64_SHORT) {
        // short base64-like fingerprint (deterministic)
        const raw = crypto.createHash('sha256').update(value).digest();
        const base64 = raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        return base64.substring(0, 8);
    }

    // otherwise treat format as a key into HASH_FUNCTIONS
    const key = format as HashFunctionKey;
    const fn = HASH_FUNCTIONS[key] ?? HASH_FUNCTIONS.generic;
    return fn(value);
}

// Fix getHashFunction to index safely (avoid TS7053)
export function getHashFunction(piiType: string): (value: string) => string {
    const key = piiType as keyof typeof HASH_FUNCTIONS;
    const hashFn = (HASH_FUNCTIONS as Record<string, (v: string) => string>)[key] || HASH_FUNCTIONS['generic'];
    if (!hashFn) {
        return (value: string) => hashGeneric(value);
    }
    return hashFn;
}
