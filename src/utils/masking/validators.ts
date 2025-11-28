// validators.ts - Format validators for PII types
// Phase 1 (v1.6.0): Extracted from monolithic maskingEngine.ts

/**
 * Check if the field name suggests this is a birth date field
 * Uses positive matching - only returns true if birth-related keywords are present
 *
 * @param text - Full text being analyzed
 * @param matchIndex - Index of the match in the text
 * @returns true if the field name suggests a birth date
 */
export function isBirthDateField(text: string, matchIndex: number): boolean {
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
 *
 * @param dateStr - Date string to validate
 * @returns true if the date is a plausible birth date
 */
export function isPlausibleBirthDate(dateStr: string): boolean {
    try {
        // Parse date components
        const parts = dateStr.split(/[-/]/);
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            return false;
        }

        let year: number, month: number, day: number;

        // Detect format: YYYY-MM-DD or DD-MM-YYYY
        if (parts[0].length === 4) {
            // YYYY-MM-DD format
            const parsedYear = parseInt(parts[0], 10);
            const parsedMonth = parseInt(parts[1], 10);
            const parsedDay = parseInt(parts[2], 10);

            if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedDay)) {
                return false;
            }

            year = parsedYear;
            month = parsedMonth;
            day = parsedDay;
        } else if (parts[2].length === 4) {
            // DD-MM-YYYY format
            const parsedDay = parseInt(parts[0], 10);
            const parsedMonth = parseInt(parts[1], 10);
            const parsedYear = parseInt(parts[2], 10);

            if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedDay)) {
                return false;
            }

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
 *
 * @param text - Full text being analyzed
 * @param matchIndex - Index of the match in the text
 * @param dateValue - The matched date value
 * @returns true if the date should be masked as a birth date
 */
export function shouldMaskAsDateOfBirth(text: string, matchIndex: number, dateValue: string): boolean {
    // Step 1: Check if field name suggests birth date
    const hasBirthKeyword = isBirthDateField(text, matchIndex);

    // Step 2: Check if date is plausible birth date (valid age range)
    const isPlausibleAge = isPlausibleBirthDate(dateValue);

    // Only mask if BOTH conditions are true
    return hasBirthKeyword && isPlausibleAge;
}

/**
 * Validate email format
 * Basic validation - checks for @ and domain
 *
 * @param email - Email string to validate
 * @returns true if the email has valid basic structure
 */
export function isValidEmailFormat(email: string): boolean {
    // Very basic check - just ensure @ and domain exist
    return /@.+\..+/.test(email);
}

/**
 * Validate phone number format
 * Checks for minimum digit count
 *
 * @param phone - Phone string to validate
 * @returns true if the phone has enough digits
 */
export function isValidPhoneFormat(phone: string): boolean {
    // Extract digits only
    const digits = phone.replace(/\D/g, '');

    // Most phone numbers have at least 7 digits (local) to 15 digits (international)
    return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validate credit card number using Luhn algorithm
 *
 * @param cardNumber - Credit card number (may include spaces/dashes)
 * @returns true if the card passes Luhn validation
 */
export function luhnCheck(cardNumber: string): boolean {
    // Remove non-digits
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i] ?? '0', 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Validate Australian TFN (Tax File Number)
 * Uses TFN checksum algorithm
 *
 * @param tfn - TFN string (may include spaces)
 * @returns true if the TFN passes validation
 */
export function validateAustralianTFN(tfn: string): boolean {
    // Extract digits only
    const digits = tfn.replace(/\D/g, '');

    if (digits.length !== 9) {
        return false;
    }

    // TFN checksum weights
    const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
        sum += parseInt(digits[i] ?? '0', 10) * (weights[i] ?? 0);
    }

    return sum % 11 === 0;
}

/**
 * Validate Australian ABN (Australian Business Number)
 * Uses ABN checksum algorithm
 *
 * @param abn - ABN string (may include spaces)
 * @returns true if the ABN passes validation
 */
export function validateAustralianABN(abn: string): boolean {
    // Extract digits only
    const digits = abn.replace(/\D/g, '');

    if (digits.length !== 11) {
        return false;
    }

    // ABN checksum: subtract 1 from first digit, then apply weights
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    let sum = 0;

    // First digit: subtract 1
    sum += ((parseInt(digits[0] ?? '0', 10) - 1) * (weights[0] ?? 0));

    // Remaining digits
    for (let i = 1; i < 11; i++) {
        sum += parseInt(digits[i] ?? '0', 10) * (weights[i] ?? 0);
    }

    return sum % 89 === 0;
}

/**
 * Validate BSB (Bank-State-Branch) number
 * Basic format check for Australian BSB
 *
 * @param bsb - BSB string (may include dash/space)
 * @returns true if the BSB has valid format
 */
export function isValidBSBFormat(bsb: string): boolean {
    // Extract digits only
    const digits = bsb.replace(/\D/g, '');

    // BSB must be exactly 6 digits
    return digits.length === 6;
}

/**
 * Validate IBAN (International Bank Account Number)
 * Basic format check
 *
 * @param iban - IBAN string
 * @returns true if the IBAN has valid basic format
 */
export function isValidIBANFormat(iban: string): boolean {
    // Remove spaces
    const cleaned = iban.replace(/\s/g, '');

    // IBAN: 2 letter country code + 2 check digits + up to 30 alphanumeric
    return /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned);
}

/**
 * Validate IPv4 address format
 *
 * @param ip - IPv4 string
 * @returns true if the IP has valid format
 */
export function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');

    if (parts.length !== 4) {
        return false;
    }

    return parts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255;
    });
}

/**
 * Validate IPv6 address format (basic)
 *
 * @param ip - IPv6 string
 * @returns true if the IP has valid basic format
 */
export function isValidIPv6(ip: string): boolean {
    // Basic IPv6 check - 8 groups of hex digits
    const groups = ip.split(':');

    // Handle compressed notation (::)
    if (ip.includes('::')) {
        return groups.length <= 8;
    }

    return groups.length === 8 && groups.every(group =>
        /^[0-9A-Fa-f]{1,4}$/.test(group)
    );
}

// Clean, self-contained FORMAT_VALIDATORS with explicit keys (no index signature)
export const FORMAT_VALIDATORS: {
	creditCard: (s: string) => boolean;
	australianTFN: (s: string) => boolean;
	australianABN: (s: string) => boolean;
	dateOfBirth: (s: string) => boolean;
	email: (s: string) => boolean;
	iban: (s: string) => boolean;
} = {
	// Luhn algorithm for credit cards
	creditCard: (s: string): boolean => {
		const digits = (s || '').toString().replace(/\D/g, '');
		if (digits.length < 13 || digits.length > 19) return false;
		let sum = 0;
		let doubleNext = false;
		for (let i = digits.length - 1; i >= 0; i--) {
			let d = parseInt(digits[i] ?? '0', 10);
			if (doubleNext) {
				d *= 2;
				if (d > 9) d -= 9;
			}
			sum += d;
			doubleNext = !doubleNext;
		}
		return sum % 10 === 0;
	},

	// Australian TFN (8 or 9 digits) checksum
	australianTFN: (s: string): boolean => {
		const digits = (s || '').toString().replace(/\D/g, '');
		if (![8, 9].includes(digits.length)) return false;
		const weights = digits.length === 8 ? [10, 7, 8, 4, 6, 3, 5, 2] : [1, 4, 3, 7, 5, 8, 6, 9, 10];
		let sum = 0;
		for (let i = 0; i < digits.length; i++) {
			sum += parseInt(digits[i] ?? '0', 10) * (weights[i] ?? 0);
		}
		return sum % 11 === 0;
	},

	// Australian ABN check (11 digits)
	australianABN: (s: string): boolean => {
		const digits = (s || '').toString().replace(/\D/g, '');
		if (digits.length !== 11) return false;
		const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
		let sum = 0;
		const firstAdjusted = parseInt(digits[0] ?? '0', 10) - 1;
		sum += firstAdjusted * (weights[0] ?? 0);
		for (let i = 1; i < digits.length; i++) {
			sum += parseInt(digits[i] ?? '0', 10) * (weights[i] ?? 0);
		}
		return sum % 89 === 0;
	},

	// Date of birth plausibility validator
	dateOfBirth: (s: string): boolean => {
		if (!s || typeof s !== 'string') return false;
		const normalized = s.trim();
		let year: number | null = null;
		let month: number | null = null;
		let day: number | null = null;

		if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(normalized)) {
			const [y, m, d] = normalized.split(/[-/]/);
			year = parseInt(y ?? '0', 10);
			month = parseInt(m ?? '0', 10);
			day = parseInt(d ?? '0', 10);
		} else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(normalized)) {
			const [d, m, y] = normalized.split(/[-/]/);
			year = parseInt(y ?? '0', 10);
			month = parseInt(m ?? '0', 10);
			day = parseInt(d ?? '0', 10);
		} else {
			return false;
		}

		if (!year || !month || !day) return false;
		const dt = new Date(year, month - 1, day);
		if (Number.isNaN(dt.getTime())) return false;

		const now = new Date();
		let age = now.getFullYear() - dt.getFullYear();
		const m = now.getMonth() - dt.getMonth();
		if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age--;
		return age >= 0 && age < 130;
	},

	// Basic email format validator
	email: (s: string): boolean => {
		if (!s || typeof s !== 'string') return false;
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(s.trim());
	},

	// IBAN validator (length + mod97) - defensive and avoids undefined chars
	iban: (s: string): boolean => {
		if (!s || typeof s !== 'string') return false;
		const v = s.replace(/\s+/g, '').toUpperCase();
		if (v.length < 15 || v.length > 34) return false;
		const rearranged = v.slice(4) + v.slice(0, 4);
		let numeric = '';
		for (let i = 0; i < rearranged.length; i++) {
			const ch = rearranged.charAt(i) || '';
			if (/[A-Z]/.test(ch)) {
				numeric += (ch.charCodeAt(0) - 55).toString();
			} else {
				numeric += ch;
			}
		}
		let remainder = '0';
		for (let i = 0; i < numeric.length; i += 7) {
			const block = remainder + numeric.substr(i, 7);
			remainder = (parseInt(block, 10) % 97).toString();
		}
		return parseInt(remainder, 10) % 97 === 1;
	}
};
