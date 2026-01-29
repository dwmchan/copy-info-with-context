import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    luhnCheck,
    tfnCheck,
    abnCheck,
    validateBirthDate,
    validateEmail,
    ibanCheck,
    FORMAT_VALIDATORS
} from '../utils/validators';

describe('Luhn Algorithm (Credit Card Validation)', () => {
    void test('validates correct credit card numbers', () => {
        // Valid Visa card
        assert.ok(luhnCheck('4532015112830366'));
        assert.ok(luhnCheck('4532-0151-1283-0366')); // With dashes
        assert.ok(luhnCheck('4532 0151 1283 0366')); // With spaces

        // Valid MasterCard
        assert.ok(luhnCheck('5425233430109903'));

        // Valid American Express
        assert.ok(luhnCheck('374245455400126'));
    });

    void test('rejects invalid credit card numbers', () => {
        // Invalid checksum
        assert.ok(!luhnCheck('4532015112830367'));
        assert.ok(!luhnCheck('5425233430109904'));

        // Too short
        assert.ok(!luhnCheck('123456789012'));

        // Too long
        assert.ok(!luhnCheck('12345678901234567890'));

        // Empty
        assert.ok(!luhnCheck(''));
    });

    void test('handles various formatting', () => {
        // All same valid card, different formats
        assert.ok(luhnCheck('4532015112830366'));
        assert.ok(luhnCheck('4532-0151-1283-0366'));
        assert.ok(luhnCheck('4532 0151 1283 0366'));
        assert.ok(luhnCheck('4532.0151.1283.0366'));
    });

    void test('rejects sequential and repeated patterns', () => {
        // While Luhn might technically pass for some sequential numbers,
        // our statistical anomaly detection would catch these
        assert.ok(!luhnCheck('1234567890123'));
        assert.ok(!luhnCheck('0000000000000'));
    });
});

describe('Australian Tax File Number (TFN) Validation', () => {
    void test('validates correct TFN numbers', () => {
        // Valid TFN examples (these pass the checksum algorithm)
        assert.ok(tfnCheck('123456782')); // Valid checksum
        assert.ok(tfnCheck('123 456 782')); // With spaces
        assert.ok(tfnCheck('123-456-782')); // With dashes
    });

    void test('rejects invalid TFN numbers', () => {
        // Invalid checksum
        assert.ok(!tfnCheck('123456789')); // Wrong checksum

        // Wrong length
        assert.ok(!tfnCheck('12345678')); // Too short
        assert.ok(!tfnCheck('1234567890')); // Too long

        // Empty
        assert.ok(!tfnCheck(''));
    });

    void test('handles TFN formatting variations', () => {
        // Same valid TFN, different formats
        assert.ok(tfnCheck('123456782'));
        assert.ok(tfnCheck('123 456 782'));
        assert.ok(tfnCheck('123-456-782'));
    });

    void test('rejects sequential patterns', () => {
        assert.ok(!tfnCheck('123456789')); // Sequential, also fails checksum
        assert.ok(!tfnCheck('111111111')); // Repeated
    });
});

describe('Australian Business Number (ABN) Validation', () => {
    void test('validates correct ABN numbers', () => {
        // Valid ABN examples (these pass the modulo 89 check)
        assert.ok(abnCheck('51824753556')); // Valid ABN
        assert.ok(abnCheck('51 824 753 556')); // With spaces
        assert.ok(abnCheck('51-824-753-556')); // With dashes
    });

    void test('rejects invalid ABN numbers', () => {
        // Invalid checksum
        assert.ok(!abnCheck('51824753557')); // Wrong checksum

        // Wrong length
        assert.ok(!abnCheck('5182475355')); // Too short
        assert.ok(!abnCheck('518247535567')); // Too long

        // Empty
        assert.ok(!abnCheck(''));
    });

    void test('handles ABN formatting variations', () => {
        // Same valid ABN, different formats
        assert.ok(abnCheck('51824753556'));
        assert.ok(abnCheck('51 824 753 556'));
        assert.ok(abnCheck('51-824-753-556'));
    });

    void test('applies subtract-1-from-first-digit rule correctly', () => {
        // ABN algorithm subtracts 1 from first digit before weighting
        // Testing that this is applied correctly
        const validAbn = '51824753556';
        assert.ok(abnCheck(validAbn));

        // Changing first digit should invalidate
        assert.ok(!abnCheck('61824753556'));
    });
});

describe('Date of Birth Validation', () => {
    void test('validates plausible birth dates (18-120 years)', () => {
        // Valid ages (calculated from current year)
        const currentYear = new Date().getFullYear();

        // 18 years old (lower bound)
        const eighteenYearsAgo = currentYear - 18;
        assert.ok(validateBirthDate(`${eighteenYearsAgo}-05-28`).isValid);

        // 50 years old (middle)
        assert.ok(validateBirthDate('1975-03-15').isValid);

        // 120 years old (upper bound)
        const oneHundredTwentyYearsAgo = currentYear - 120;
        assert.ok(validateBirthDate(`${oneHundredTwentyYearsAgo}-01-01`).isValid);
    });

    void test('rejects implausible ages', () => {
        const currentYear = new Date().getFullYear();

        // Too young (< 18)
        const seventeenYearsAgo = currentYear - 17;
        const result1 = validateBirthDate(`${seventeenYearsAgo}-05-28`);
        assert.ok(!result1.isValid);
        assert.ok(result1.reason?.includes('< 18'));

        // Too old (> 120)
        const tooOld = currentYear - 121;
        const result2 = validateBirthDate(`${tooOld}-01-01`);
        assert.ok(!result2.isValid);
        assert.ok(result2.reason?.includes('> 120'));

        // Future date
        const nextYear = currentYear + 1;
        const result3 = validateBirthDate(`${nextYear}-01-01`);
        assert.ok(!result3.isValid);
        assert.ok(result3.reason?.includes('Future date'));
    });

    test('rejects invalid calendar dates', () => {
        // February 30 doesn't exist
        const result1 = validateBirthDate('1986-02-30');
        assert.ok(!result1.isValid);
        assert.ok(result1.reason?.includes('Invalid calendar date'));

        // April 31 doesn't exist
        const result2 = validateBirthDate('1986-04-31');
        assert.ok(!result2.isValid);

        // Month 13 doesn't exist
        const result3 = validateBirthDate('1986-13-01');
        assert.ok(!result3.isValid);
    });

    test('handles both YYYY-MM-DD and DD-MM-YYYY formats', () => {
        // YYYY-MM-DD format
        assert.ok(validateBirthDate('1986-05-28').isValid);

        // DD-MM-YYYY format
        assert.ok(validateBirthDate('28-05-1986').isValid);
    });

    test('rejects malformed dates', () => {
        const result1 = validateBirthDate('not-a-date');
        assert.ok(!result1.isValid);

        const result2 = validateBirthDate('1986-05');
        assert.ok(!result2.isValid);

        const result3 = validateBirthDate('');
        assert.ok(!result3.isValid);
    });

    test('provides helpful confidence scores', () => {
        // Valid date should have high confidence
        const validResult = validateBirthDate('1986-05-28');
        assert.ok(validResult.isValid);
        assert.ok(validResult.confidence >= 0.9);

        // Invalid date should have low confidence
        const invalidResult = validateBirthDate('2030-01-01');
        assert.ok(!invalidResult.isValid);
        assert.ok(invalidResult.confidence < 0.5);
    });
});

describe('Email Validation', () => {
    test('validates real email addresses', () => {
        assert.ok(validateEmail('john.doe@company.com').isValid);
        assert.ok(validateEmail('user+tag@domain.co.uk').isValid);
        assert.ok(validateEmail('admin@company.com').isValid);
    });

    test('rejects test/example emails', () => {
        const result1 = validateEmail('test@example.com');
        assert.ok(!result1.isValid);
        assert.ok(result1.reason?.includes('Test/example'));

        const result2 = validateEmail('user@test.com');
        assert.ok(!result2.isValid);

        const result3 = validateEmail('noreply@sample.com');
        assert.ok(!result3.isValid);
    });

    test('rejects malformed emails', () => {
        const result1 = validateEmail('not-an-email');
        assert.ok(!result1.isValid);

        const result2 = validateEmail('@example.com');
        assert.ok(!result2.isValid);

        const result3 = validateEmail('user@');
        assert.ok(!result3.isValid);
    });

    test('provides confidence scores', () => {
        // Valid email should have high confidence
        const validResult = validateEmail('john@company.com');
        assert.ok(validResult.isValid);
        assert.ok(validResult.confidence >= 0.8);

        // Test email should have low confidence
        const testResult = validateEmail('test@example.com');
        assert.ok(!testResult.isValid);
        assert.ok(testResult.confidence < 0.3);
    });
});

describe('IBAN Validation', () => {
    test('validates correct IBAN numbers', () => {
        // Valid IBANs from different countries
        assert.ok(ibanCheck('GB82WEST12345698765432')); // UK
        assert.ok(ibanCheck('DE89370400440532013000')); // Germany
        assert.ok(ibanCheck('FR1420041010050500013M02606')); // France

        // With spaces (should be removed)
        assert.ok(ibanCheck('GB82 WEST 1234 5698 7654 32'));
    });

    test('rejects invalid IBAN numbers', () => {
        // Invalid checksum
        assert.ok(!ibanCheck('GB82WEST12345698765433')); // Wrong check digit

        // Wrong length
        assert.ok(!ibanCheck('GB82WEST')); // Too short

        // Missing country code
        assert.ok(!ibanCheck('82WEST12345698765432'));

        // Empty
        assert.ok(!ibanCheck(''));
    });

    test('handles IBAN formatting', () => {
        // Same valid IBAN, different formats
        assert.ok(ibanCheck('GB82WEST12345698765432'));
        assert.ok(ibanCheck('GB82 WEST 1234 5698 7654 32'));
        assert.ok(ibanCheck('gb82west12345698765432')); // Lowercase
    });

    test('validates country code format', () => {
        // Must start with 2 letters
        assert.ok(!ibanCheck('1234567890123456')); // No letters
        assert.ok(!ibanCheck('A234567890123456')); // Only 1 letter
        assert.ok(!ibanCheck('123B567890123456')); // Letters not at start
    });
});

describe('FORMAT_VALIDATORS Registry', () => {
    test('contains validators for all major PII types', () => {
        assert.ok(FORMAT_VALIDATORS.creditCard);
        assert.ok(FORMAT_VALIDATORS.australianTFN);
        assert.ok(FORMAT_VALIDATORS.australianABN);
        assert.ok(FORMAT_VALIDATORS.dateOfBirth);
        assert.ok(FORMAT_VALIDATORS.email);
        assert.ok(FORMAT_VALIDATORS.iban);
    });

    test('validators return ValidationResult objects', () => {
        const result = FORMAT_VALIDATORS.creditCard('4532015112830366');

        assert.ok(typeof result === 'object');
        assert.ok(typeof result.isValid === 'boolean');
        assert.ok(typeof result.confidence === 'number');
        assert.ok(result.confidence >= 0 && result.confidence <= 1);
        assert.ok(result.reason === undefined || typeof result.reason === 'string');
    });

    test('creditCard validator uses Luhn algorithm', () => {
        const validResult = FORMAT_VALIDATORS.creditCard('4532015112830366');
        assert.ok(validResult.isValid);
        assert.ok(validResult.confidence >= 0.9);
        assert.ok(validResult.reason?.includes('Luhn'));

        const invalidResult = FORMAT_VALIDATORS.creditCard('4532015112830367');
        assert.ok(!invalidResult.isValid);
        assert.ok(invalidResult.confidence < 0.5);
    });

    test('australianTFN validator uses TFN checksum', () => {
        const validResult = FORMAT_VALIDATORS.australianTFN('123456782');
        assert.ok(validResult.isValid);
        assert.ok(validResult.confidence >= 0.9);
        assert.ok(validResult.reason?.includes('TFN checksum'));

        const invalidResult = FORMAT_VALIDATORS.australianTFN('123456789');
        assert.ok(!invalidResult.isValid);
        assert.ok(invalidResult.reason?.includes('invalid'));
    });

    test('australianABN validator uses ABN checksum', () => {
        const validResult = FORMAT_VALIDATORS.australianABN('51824753556');
        assert.ok(validResult.isValid);
        assert.ok(validResult.confidence >= 0.9);

        const invalidResult = FORMAT_VALIDATORS.australianABN('51824753557');
        assert.ok(!invalidResult.isValid);
    });
});

describe('Edge Cases and Error Handling', () => {
    test('handles empty strings gracefully', () => {
        assert.ok(!luhnCheck(''));
        assert.ok(!tfnCheck(''));
        assert.ok(!abnCheck(''));
        assert.ok(!ibanCheck(''));
        assert.ok(!validateBirthDate('').isValid);
        assert.ok(!validateEmail('').isValid);
    });

    test('handles whitespace-only strings', () => {
        assert.ok(!luhnCheck('   '));
        assert.ok(!tfnCheck('   '));
        assert.ok(!abnCheck('   '));
        assert.ok(!ibanCheck('   '));
    });

    test('handles non-numeric input for numeric validators', () => {
        assert.ok(!luhnCheck('abcd-efgh-ijkl-mnop'));
        assert.ok(!tfnCheck('abc-def-ghi'));
        assert.ok(!abnCheck('ab-cde-fgh-ijk'));
    });

    test('handles null and undefined as strings', () => {
        // TypeScript would prevent this, but runtime might receive these
        assert.ok(!luhnCheck('null'));
        assert.ok(!luhnCheck('undefined'));
        assert.ok(!validateBirthDate('null').isValid);
    });
});

describe('Performance Tests', () => {
    test('validators execute quickly', () => {
        const start = Date.now();

        // Run each validator 1000 times
        for (let i = 0; i < 1000; i++) {
            luhnCheck('4532015112830366');
            tfnCheck('123456782');
            abnCheck('51824753556');
            validateBirthDate('1986-05-28');
            validateEmail('john@company.com');
            ibanCheck('GB82WEST12345698765432');
        }

        const end = Date.now();
        const elapsed = end - start;

        // Should complete 6000 validations in < 500ms
        assert.ok(elapsed < 500, `Validators too slow: ${elapsed}ms`);
    });
});
