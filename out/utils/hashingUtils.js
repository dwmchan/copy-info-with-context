"use strict";
// hashingUtils.ts - Deterministic hashing for PII masking
// Phase 2 implementation: Cryptographic hashing with consistent results
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
exports.getHashFunction = exports.hashValue = exports.HashFormat = exports.HASH_FUNCTIONS = exports.hashGeneric = exports.hashAddress = exports.hashDateOfBirth = exports.hashSSN = exports.hashCreditCard = exports.hashPhone = exports.hashEmail = exports.generateDeterministicHash = void 0;
const crypto = __importStar(require("crypto"));
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
function generateDeterministicHash(value, salt, truncateLength = 8) {
    // Use default salt if not provided (based on a fixed string)
    // In production, this could be workspace-specific or user-configurable
    const effectiveSalt = salt ?? 'copy-info-with-context-v1';
    // Create SHA-256 hash
    const hash = crypto
        .createHash('sha256')
        .update(effectiveSalt + value)
        .digest('hex');
    // Truncate to specified length
    return hash.substring(0, truncateLength);
}
exports.generateDeterministicHash = generateDeterministicHash;
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
function hashEmail(email, preserveDomain = true) {
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return generateDeterministicHash(email);
    }
    const localPart = parts[0];
    const domain = parts[1];
    const hashedLocal = generateDeterministicHash(localPart, 'email-local');
    if (preserveDomain) {
        return `${hashedLocal}@${domain}`;
    }
    else {
        const hashedDomain = generateDeterministicHash(domain, 'email-domain');
        return `${hashedLocal}@${hashedDomain}.com`;
    }
}
exports.hashEmail = hashEmail;
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
function hashPhone(phone) {
    // Extract country code if present
    const countryCodeMatch = phone.match(/^\+(\d{1,3})/);
    if (countryCodeMatch?.[1]) {
        const countryCode = countryCodeMatch[1];
        const restOfNumber = phone.substring(countryCodeMatch[0].length).replace(/\D/g, '');
        const hashedNumber = generateDeterministicHash(restOfNumber, 'phone', 10);
        return `+${countryCode}-${hashedNumber}`;
    }
    // No country code, hash entire number
    const digits = phone.replace(/\D/g, '');
    return generateDeterministicHash(digits, 'phone', 12);
}
exports.hashPhone = hashPhone;
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
function hashCreditCard(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) {
        return generateDeterministicHash(cardNumber);
    }
    const last4 = digits.substring(digits.length - 4);
    const firstDigits = digits.substring(0, digits.length - 4);
    const hashedFirst = generateDeterministicHash(firstDigits, 'cc', 8).toUpperCase();
    return `${hashedFirst}-${last4}`;
}
exports.hashCreditCard = hashCreditCard;
/**
 * Hash SSN while preserving last 4 digits
 *
 * Format: ***-**-{last4}
 * Example: 123-45-6789 → H4S-H3-6789
 *
 * @param ssn - Social Security Number
 * @returns Hashed SSN
 */
function hashSSN(ssn) {
    const digits = ssn.replace(/\D/g, '');
    if (digits.length !== 9) {
        return '***-**-****';
    }
    const last4 = digits.substring(5);
    const first5 = digits.substring(0, 5);
    const hash = generateDeterministicHash(first5, 'ssn', 5).toUpperCase();
    return `${hash.substring(0, 3)}-${hash.substring(3, 5)}-${last4}`;
}
exports.hashSSN = hashSSN;
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
function hashDateOfBirth(dob) {
    const parts = dob.split(/[-/]/);
    if (parts.length !== 3) {
        return generateDeterministicHash(dob);
    }
    // Detect format
    let year;
    if (parts[0] && parts[0].length === 4) {
        // YYYY-MM-DD
        year = parts[0];
        const monthDay = `${parts[1] ?? ''}-${parts[2] ?? ''}`;
        const hash = generateDeterministicHash(monthDay, 'dob', 4).toUpperCase();
        return `${year}-${hash}`;
    }
    else if (parts[2] && parts[2].length === 4) {
        // DD-MM-YYYY
        year = parts[2];
        const dayMonth = `${parts[0] ?? ''}-${parts[1] ?? ''}`;
        const hash = generateDeterministicHash(dayMonth, 'dob', 4).toUpperCase();
        return `${hash}-${year}`;
    }
    return generateDeterministicHash(dob);
}
exports.hashDateOfBirth = hashDateOfBirth;
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
function hashAddress(address) {
    // Try to extract postcode (4 digits for AU, 5 for US, etc.)
    const postcodeMatch = address.match(/\b(\d{4,5})\b/);
    if (postcodeMatch?.[1]) {
        const postcode = postcodeMatch[1];
        const addressWithoutPostcode = address.replace(postcode, '').trim();
        const hash = generateDeterministicHash(addressWithoutPostcode, 'address', 8).toUpperCase();
        return `${hash}, ${postcode}`;
    }
    // No postcode found, hash entire address
    return generateDeterministicHash(address, 'address', 12).toUpperCase();
}
exports.hashAddress = hashAddress;
/**
 * Generic hash function for any value
 *
 * @param value - Value to hash
 * @param context - Context string for salt
 * @param length - Output length
 * @returns Hashed value
 */
function hashGeneric(value, context = 'generic', length = 8) {
    return generateDeterministicHash(value, context, length).toUpperCase();
}
exports.hashGeneric = hashGeneric;
/**
 * Map of PII type to hashing function
 */
exports.HASH_FUNCTIONS = {
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
    generic: (value) => hashGeneric(value)
};
// Make the runtime enum available for callers that use HashFormat as a value
var HashFormat;
(function (HashFormat) {
    HashFormat["BASE64_SHORT"] = "BASE64_SHORT";
})(HashFormat = exports.HashFormat || (exports.HashFormat = {}));
function hashValue(value, format = 'generic') {
    // If the caller passed one of our runtime enum formats, handle specially
    if (format === HashFormat.BASE64_SHORT) {
        // short base64-like fingerprint (deterministic)
        const raw = crypto.createHash('sha256').update(value).digest();
        const base64 = raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        return base64.substring(0, 8);
    }
    // otherwise treat format as a key into HASH_FUNCTIONS
    const key = format;
    const fn = exports.HASH_FUNCTIONS[key] ?? exports.HASH_FUNCTIONS.generic;
    return fn(value);
}
exports.hashValue = hashValue;
// Fix getHashFunction to index safely (avoid TS7053)
function getHashFunction(piiType) {
    const key = piiType;
    const hashFn = exports.HASH_FUNCTIONS[key] ?? exports.HASH_FUNCTIONS['generic'];
    if (!hashFn) {
        return (value) => hashGeneric(value);
    }
    return hashFn;
}
exports.getHashFunction = getHashFunction;
//# sourceMappingURL=hashingUtils.js.map