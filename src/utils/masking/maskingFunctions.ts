// maskingFunctions.ts - Individual masking functions for each PII type
// Phase 1 (v1.6.0): Extracted from monolithic maskingEngine.ts

import { hashValue, HashFormat } from '../hashingUtils';

/**
 * Generic masking function for unknown types
 *
 * @param value - Value to mask
 * @param strategy - Masking strategy
 * @returns Masked value
 */
export function maskGeneric(value: string, strategy: string): string {
    if (!value) {return '***';}

    switch (strategy) {
        case 'partial':
            if (value.length <= 3) {return '***';}
            return `${value.charAt(0)}${'*'.repeat(Math.max(0, value.length - 2))}${value.charAt(value.length - 1)}`;
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(value.length);
        case 'hash':
            return hashValue(value, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[REDACTED]';
        default:
            return value;
    }
}

/**
 * Mask email address
 *
 * @param email - Email to mask
 * @param strategy - Masking strategy
 * @returns Masked email
 */
export function maskEmail(email: string, strategy: string): string {
    if (!email) {return '***';}

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {return '***';}

    switch (strategy) {
        case 'partial': {
            const maskedLocal = localPart.length > 2
                ? `${localPart.charAt(0)}${'*'.repeat(Math.max(0, localPart.length - 2))}${localPart.charAt(localPart.length - 1)}`
                : '***';
            const domainParts = domain.split('.');
            const maskedDomain = domainParts.length > 1
                ? `${domainParts[0]?.charAt(0) ?? ''}***.${domainParts[domainParts.length - 1] ?? ''}`
                : '***';
            return `${maskedLocal}@${maskedDomain}`;
        }
        case 'full':
            return '***@***.***';
        case 'structural':
            return `${'*'.repeat(localPart.length)  }@${  '*'.repeat(domain.length)}`;
        case 'hash':
            return `${hashValue(email, HashFormat.BASE64_SHORT)  }@masked.email`;
        case 'redact':
            return '[EMAIL REDACTED]';
        default:
            return email;
    }
}

/**
 * Mask phone number
 *
 * @param phone - Phone number to mask
 * @param strategy - Masking strategy
 * @returns Masked phone number
 */
export function maskPhone(phone: string, strategy: string): string {
    if (!phone) {return '***';}

    // Extract prefix (country code or area code)
    const prefixMatch = phone.match(/^(\+?\d{1,3}[-.\s]?)/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const rest = prefix ? phone.substring(prefix.length) : phone;

    switch (strategy) {
        case 'partial': {
            const digits = rest.replace(/\D/g, '');
            if (digits.length <= 2) {return `${prefix ?? ''}***`;}
            const lastTwo = digits.substring(digits.length - 2);
            const masked = '*'.repeat(Math.max(0, digits.length - 2)) + lastTwo;
            return `${prefix ?? ''}${masked}`;
        }
        case 'full':
            return '***';
        case 'structural': {
            const structuralMask = rest.replace(/\d/g, '*');
            return `${prefix ?? ''}${structuralMask}`;
        }
        case 'hash':
            return hashValue(phone, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[PHONE REDACTED]';
        default:
            return phone;
    }
}

/**
 * Mask Social Security Number (SSN)
 *
 * @param ssn - SSN to mask
 * @param strategy - Masking strategy
 * @returns Masked SSN
 */
export function maskSSN(ssn: string, strategy: string): string {
    if (!ssn) {return '***';}

    switch (strategy) {
        case 'partial': {
            const parts = ssn.split('-');
            if (parts.length === 3) {
                return `***-**-${parts[2] ?? ''}`;
            }
            return '***';
        }
        case 'full':
            return '***-**-****';
        case 'structural':
            return '*'.repeat(ssn.length);
        case 'hash':
            return hashValue(ssn, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[SSN REDACTED]';
        default:
            return ssn;
    }
}

/**
 * Mask credit card number
 *
 * @param cardNumber - Card number to mask
 * @param strategy - Masking strategy
 * @returns Masked card number
 */
export function maskCreditCard(cardNumber: string, strategy: string): string {
    if (!cardNumber) {return '***';}

    switch (strategy) {
        case 'partial': {
            const digits = cardNumber.replace(/\D/g, '');
            if (digits.length < 4) {return '***';}
            const lastFour = digits.substring(digits.length - 4);
            const groups = cardNumber.match(/\d{4}/g);
            if (groups) {
                return '**** '.repeat(Math.max(0, groups.length - 1)) + lastFour;
            }
            return `**** **** **** ${  lastFour}`;
        }
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(cardNumber.length);
        case 'hash':
            return hashValue(cardNumber, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[CARD REDACTED]';
        default:
            return cardNumber;
    }
}

/**
 * Mask address
 *
 * @param address - Address to mask
 * @param strategy - Masking strategy
 * @returns Masked address
 */
export function maskAddress(address: string, strategy: string): string {
    if (!address) {return '***';}

    switch (strategy) {
        case 'partial':
        case 'full':
        case 'redact':
            return '[ADDRESS REDACTED]';
        case 'structural':
            return '*'.repeat(address.length);
        case 'hash':
            return hashValue(address, HashFormat.BASE64_SHORT);
        default:
            return address;
    }
}

/**
 * Mask date of birth
 *
 * @param dob - Date of birth to mask
 * @param strategy - Masking strategy
 * @returns Masked date of birth
 */
export function maskDateOfBirth(dob: string, strategy: string): string {
    if (!dob) {return '****-**-**';}

    // Auto-detect separator
    const separators = ['-', '/', '.', ' '];
    let separator = '-';
    for (const sep of separators) {
        if (dob.includes(sep)) {
            separator = sep;
            break;
        }
    }

    // Handle month name formats (e.g., "28 May 1986", "28-May-1986")
    const monthNamePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i;
    if (monthNamePattern.test(dob)) {
        const parts = dob.split(/[-/.\s]+/);
        if (parts.length === 3) {
            switch (strategy) {
                case 'partial':
                    return `**${separator}***${separator}${parts[2] ?? ''}`;  // ** *** 1986
                case 'full':
                    return `**${separator}***${separator}****`;
                case 'structural':
                    return '*'.repeat(dob.length);
                default:
                    return dob;
            }
        }
    }

    // Handle numeric formats
    const parts = dob.split(separator);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
        return `****${  separator  }**${  separator  }**`;
    }

    // Detect format by part lengths
    if (parts[0].length === 4) {
        // YYYY-MM-DD format (year first)
        switch (strategy) {
            case 'partial':
                return `${parts[0]}${separator}**${separator}**`;  // 1986-**-**
            case 'full':
                return `****${separator}**${separator}**`;
            case 'structural':
                return '*'.repeat(dob.length);
            default:
                return dob;
        }
    } else if (parts[2].length === 4) {
        // DD-MM-YYYY format (day first)
        switch (strategy) {
            case 'partial':
                return `**${separator}**${separator}${parts[2]}`;  // **-**-1986
            case 'full':
                return `**${separator}**${separator}****`;
            case 'structural':
                return '*'.repeat(dob.length);
            default:
                return dob;
        }
    }

    // Unknown format - mask everything
    return `****${  separator  }**${  separator  }**`;
}

/**
 * Mask passport number
 *
 * @param passport - Passport number to mask
 * @param strategy - Masking strategy
 * @returns Masked passport number
 */
export function maskPassport(passport: string, strategy: string): string {
    if (!passport || passport.length === 0) {return '***';}

    switch (strategy) {
        case 'partial':
            if (passport.length <= 3) {return '***';}
            return `${passport.charAt(0)}${'*'.repeat(passport.length - 2)}${passport.charAt(passport.length - 1)}`;
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(passport.length);
        case 'hash':
            return hashValue(passport, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[PASSPORT REDACTED]';
        default:
            return passport;
    }
}

/**
 * Mask driver's license number
 *
 * @param license - License number to mask
 * @param strategy - Masking strategy
 * @returns Masked license number
 */
export function maskDriversLicense(license: string, strategy: string): string {
    if (!license || license.length === 0) {return '***';}

    switch (strategy) {
        case 'partial':
            if (license.length <= 3) {return '***';}
            return `${license.charAt(0)}${'*'.repeat(Math.max(0, license.length - 2))}${license.charAt(license.length - 1)}`;
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(license.length);
        case 'hash':
            return hashValue(license, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[LICENSE REDACTED]';
        default:
            return license;
    }
}

/**
 * Mask national ID number
 *
 * @param id - National ID to mask
 * @param strategy - Masking strategy
 * @returns Masked national ID
 */
export function maskNationalID(id: string, strategy: string): string {
    if (!id || id.length === 0) {return '***';}

    switch (strategy) {
        case 'partial':
            if (id.length <= 4) {return '***';}
            return id.substring(0, 2) + '*'.repeat(Math.max(0, id.length - 4)) + id.substring(id.length - 2);
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(id.length);
        case 'hash':
            return hashValue(id, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[ID REDACTED]';
        default:
            return id;
    }
}

/**
 * Mask Australian BSB (Bank-State-Branch) number
 *
 * @param bsb - BSB number to mask
 * @param strategy - Masking strategy
 * @returns Masked BSB
 */
export function maskAustralianBSB(bsb: string, strategy: string): string {
    if (!bsb) {return '***';}

    const separator = bsb.includes('-') ? '-' : (bsb.includes(' ') ? ' ' : '');

    switch (strategy) {
        case 'partial': {
            const digits = bsb.replace(/\D/g, '');
            if (digits.length === 6) {
                return `***${separator}*${digits.charAt(5)}${digits.length > 6 ? digits.substring(6) : ''}`;
            }
            return '***';
        }
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(bsb.length);
        case 'hash':
            return hashValue(bsb, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[BSB REDACTED]';
        default:
            return bsb;
    }
}

/**
 * Mask Australian account number
 *
 * @param accountNumber - Account number to mask
 * @param strategy - Masking strategy
 * @returns Masked account number
 */
export function maskAccountNumber(accountNumber: string, strategy: string): string {
    if (!accountNumber) {return '***';}

    switch (strategy) {
        case 'partial': {
            const digits = accountNumber.replace(/\D/g, '');
            if (digits.length < 3) {return '***';}
            return `***${  digits.substring(digits.length - 3)}`;
        }
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(accountNumber.length);
        case 'hash':
            return hashValue(accountNumber, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[ACCOUNT REDACTED]';
        default:
            return accountNumber;
    }
}

/**
 * Mask Australian TFN (Tax File Number)
 *
 * @param tfn - TFN to mask
 * @param strategy - Masking strategy
 * @returns Masked TFN
 */
export function maskAustralianTFN(tfn: string, strategy: string): string {
    if (!tfn) {return '***';}

    switch (strategy) {
        case 'partial':
        case 'full':
            return '*** *** ***';
        case 'structural':
            return '*'.repeat(tfn.length);
        case 'hash':
            return hashValue(tfn, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[TFN REDACTED]';
        default:
            return tfn;
    }
}

/**
 * Mask Australian ABN (Australian Business Number)
 *
 * @param abn - ABN to mask
 * @param strategy - Masking strategy
 * @returns Masked ABN
 */
export function maskAustralianABN(abn: string, strategy: string): string {
    if (!abn) {return '***';}

    switch (strategy) {
        case 'partial':
        case 'full':
            return '** *** *** ***';
        case 'structural':
            return '*'.repeat(abn.length);
        case 'hash':
            return hashValue(abn, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[ABN REDACTED]';
        default:
            return abn;
    }
}

/**
 * Mask Australian Medicare number
 *
 * @param medicare - Medicare number to mask
 * @param strategy - Masking strategy
 * @returns Masked Medicare number
 */
export function maskAustralianMedicare(medicare: string, strategy: string): string {
    if (!medicare) {return '***';}

    switch (strategy) {
        case 'partial':
        case 'full':
            return '**** ***** *';
        case 'structural':
            return '*'.repeat(medicare.length);
        case 'hash':
            return hashValue(medicare, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[MEDICARE REDACTED]';
        default:
            return medicare;
    }
}

/**
 * Mask IP address (IPv4 or IPv6)
 *
 * @param ip - IP address to mask
 * @param strategy - Masking strategy
 * @returns Masked IP address
 */
export function maskIPAddress(ip: string, strategy: string): string {
    if (!ip) {return '***';}

    const isIPv6 = ip.includes(':');

    switch (strategy) {
        case 'partial': {
            if (isIPv6) {
                // IPv6: show first group
                const parts = ip.split(':');
                return `${parts[0] ?? ''}:${'*'.repeat(10)}`;
            } else {
                // IPv4: show first octet
                const parts = ip.split('.');
                if (parts.length === 4) {
                    return `${parts[0] ?? ''}.*.*.*`;
                }
            }
            return '***';
        }
        case 'full':
            return isIPv6 ? '****:****:****:****' : '*.*.*.*';
        case 'structural':
            return '*'.repeat(ip.length);
        case 'hash':
            return hashValue(ip, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[IP REDACTED]';
        default:
            return ip;
    }
}

/**
 * Mask IBAN (International Bank Account Number)
 *
 * @param iban - IBAN to mask
 * @param strategy - Masking strategy
 * @returns Masked IBAN
 */
export function maskIBAN(iban: string, strategy: string): string {
    if (!iban) {return '***';}

    switch (strategy) {
        case 'partial': {
            // Show country code and last 4
            if (iban.length <= 6) {return '***';}
            const countryCode = iban.substring(0, 2);
            const last4 = iban.substring(iban.length - 4);
            return countryCode + '*'.repeat(Math.max(0, iban.length - 6)) + last4;
        }
        case 'full':
            return '***';
        case 'structural':
            return iban.substring(0, 2) + '*'.repeat(Math.max(0, iban.length - 2));
        case 'hash':
            return hashValue(iban, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[IBAN REDACTED]';
        default:
            return iban;
    }
}

/**
 * Mask SWIFT/BIC code
 *
 * @param swift - SWIFT code to mask
 * @param strategy - Masking strategy
 * @returns Masked SWIFT code
 */
export function maskSWIFT(swift: string, strategy: string): string {
    if (!swift) {return '***';}

    switch (strategy) {
        case 'partial': {
            // Show first 4 (bank code)
            if (swift.length <= 4) {return '***';}
            return swift.substring(0, 4) + '*'.repeat(Math.max(0, swift.length - 4));
        }
        case 'full':
            return '***';
        case 'structural':
            return '*'.repeat(swift.length);
        case 'hash':
            return hashValue(swift, HashFormat.BASE64_SHORT);
        case 'redact':
            return '[SWIFT REDACTED]';
        default:
            return swift;
    }
}

// ============================================================================
// MASKING FUNCTION REGISTRY
// ============================================================================

export const MASKING_FUNCTIONS: Record<string, (value: string, strategy: string) => string> = {
    email: maskEmail,
    phone: maskPhone,
    australianPhone: maskPhone,
    ssn: maskSSN,
    dateOfBirth: maskDateOfBirth,

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
    australianBSB: maskAustralianBSB,
    australianTFN: maskAustralianTFN,
    australianABN: maskAustralianABN,
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
