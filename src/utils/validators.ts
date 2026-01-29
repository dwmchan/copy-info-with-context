// validators.ts - Format validation algorithms for PII detection
// Phase 2 implementation: Luhn algorithm, TFN checksum, and other validators

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    confidence: number; // 0..1
    reason?: string;
}

/**
 * Simple Luhn check, returns boolean (used directly by tests)
 */
export function luhnCheck(s: string): boolean {
    const digits = (s || '').toString().replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) {return false;}
    let sum = 0;
    let doubleNext = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = parseInt(digits[i] ?? '0', 10);
        if (doubleNext) {
            d *= 2;
            if (d > 9) {d -= 9;}
        }
        sum += d;
        doubleNext = !doubleNext;
    }
    return sum % 10 === 0;
}

/**
 * Australian TFN check (8 or 9 digits) boolean
 */
export function tfnCheck(s: string): boolean {
    const digits = (s || '').toString().replace(/\D/g, '');
    if (![8, 9].includes(digits.length)) {return false;}
    const weights = digits.length === 8 ? [10, 7, 8, 4, 6, 3, 5, 2] : [1, 4, 3, 7, 5, 8, 6, 9, 10];
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i] ?? '0', 10) * (weights[i] ?? 0);
    }
    return sum % 11 === 0;
}

/**
 * Australian ABN check (11 digits) boolean
 */
export function abnCheck(s: string): boolean {
    const digits = (s || '').toString().replace(/\D/g, '');
    if (digits.length !== 11) {return false;}
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    let sum = 0;
    const firstAdjusted = parseInt(digits[0] ?? '0', 10) - 1;
    sum += firstAdjusted * (weights[0] ?? 0);
    for (let i = 1; i < digits.length; i++) {
        sum += parseInt(digits[i] ?? '0', 10) * (weights[i] ?? 0);
    }
    return sum % 89 === 0;
}

/**
 * Validate DOB — accept YYYY-MM-DD and DD-MM-YYYY, return object with confidence/reason
 */
export function validateBirthDate(s: string): ValidationResult {
    if (!s || typeof s !== 'string') {
        return { isValid: false, confidence: 0.0, reason: 'Empty or invalid input' };
    }

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
        return { isValid: false, confidence: 0.0, reason: 'Malformed date' };
    }

    if (!year || !month || !day) {
        return { isValid: false, confidence: 0.0, reason: 'Malformed date parts' };
    }

    const dt = new Date(year, month - 1, day);
    if (Number.isNaN(dt.getTime())) {
        return { isValid: false, confidence: 0.0, reason: 'Invalid calendar date' };
    }

    const now = new Date();
    const future = dt.getTime() > now.getTime();
    if (future) {
        return { isValid: false, confidence: 0.2, reason: 'Future date' };
    }

    let age = now.getFullYear() - dt.getFullYear();
    const m = now.getMonth() - dt.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) {age--;}

    if (age < 0) {
        return { isValid: false, confidence: 0.0, reason: 'Invalid age' };
    }
    if (age < 18) {
        return { isValid: false, confidence: 0.2, reason: 'Age < 18' };
    }
    if (age > 120) {
        return { isValid: false, confidence: 0.2, reason: 'Age > 120' };
    }

    // plausible date for DOB
    return { isValid: true, confidence: 0.95 };
}

/**
 * Email validator returns object with confidence and helpful reason when low
 */
export function validateEmail(s: string): ValidationResult {
    if (!s || typeof s !== 'string') {return { isValid: false, confidence: 0.0, reason: 'Empty or invalid' };}
    const email = s.trim().toLowerCase();

    // basic format check
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {return { isValid: false, confidence: 0.0, reason: 'Malformed email' };}

    // common "test" / example domains detect
    const domain = email.split('@')[1] ?? '';
    const testDomains = ['example.com', 'test.com', 'sample.com', 'localhost', 'example.net', 'example.org', 'noreply@'];
    if (testDomains.some(td => domain.includes(td) || email.includes(td))) {
        return { isValid: false, confidence: 0.2, reason: 'Test/example email' };
    }

    return { isValid: true, confidence: 0.9 };
}

/**
 * IBAN check returns boolean for fast inline validation
 */
export function ibanCheck(s: string): boolean {
    if (!s || typeof s !== 'string') {return false;}
    const v = s.replace(/\s+/g, '').toUpperCase();
    if (v.length < 15 || v.length > 34) {return false;}
    // country code must be two letters
    if (!/^[A-Z]{2}/.test(v)) {return false;}
    const rearranged = v.slice(4) + v.slice(0, 4);
    let numeric = '';
    for (let i = 0; i < rearranged.length; i++) {
        const ch = rearranged.charAt(i);
        if (/[A-Z]/.test(ch)) {
            numeric += (ch.charCodeAt(0) - 55).toString();
        } else {
            numeric += ch;
        }
    }
    // mod 97 iteratively
    let remainder = '0';
    for (let i = 0; i < numeric.length; i += 7) {
        const block = remainder + numeric.substr(i, 7);
        remainder = (parseInt(block, 10) % 97).toString();
    }
    return parseInt(remainder, 10) % 97 === 1;
}

/**
 * FORMAT_VALIDATORS registry — returns ValidationResult objects for tests
 */
// Replace/ensure FORMAT_VALIDATORS is explicitly typed (no index signature)
// and returns ValidationResult objects expected by tests.
export const FORMAT_VALIDATORS: {
	creditCard: (s: string) => ValidationResult;
	australianTFN: (s: string) => ValidationResult;
	australianABN: (s: string) => ValidationResult;
	dateOfBirth: (s: string) => ValidationResult;
	email: (s: string) => ValidationResult;
	iban: (s: string) => ValidationResult;
} = {
	creditCard: (s: string) => {
		const ok = luhnCheck(s);
		return {
			isValid: ok,
			confidence: ok ? 0.95 : 0.2,
			reason: ok ? 'Luhn check passed' : 'Luhn check failed'
		};
	},

	australianTFN: (s: string) => {
		const ok = tfnCheck(s);
		return {
			isValid: ok,
			confidence: ok ? 0.92 : 0.2,
			reason: ok ? 'TFN checksum passed' : 'TFN invalid'
		};
	},

	australianABN: (s: string) => {
		const ok = abnCheck(s);
		return {
			isValid: ok,
			confidence: ok ? 0.92 : 0.2,
			reason: ok ? 'ABN checksum passed' : 'ABN invalid'
		};
	},

	dateOfBirth: (s: string) => {
		return validateBirthDate(s);
	},

	email: (s: string) => {
		return validateEmail(s);
	},

	iban: (s: string) => {
		const ok = ibanCheck(s);
		return {
			isValid: ok,
			confidence: ok ? 0.9 : 0.1,
			reason: ok ? 'IBAN checksum OK' : 'IBAN invalid'
		};
	}
};
