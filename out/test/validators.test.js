"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const validators_1 = require("../utils/validators");
(0, node_test_1.describe)('Luhn Algorithm (Credit Card Validation)', () => {
    void (0, node_test_1.test)('validates correct credit card numbers', () => {
        // Valid Visa card
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532015112830366'));
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532-0151-1283-0366')); // With dashes
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532 0151 1283 0366')); // With spaces
        // Valid MasterCard
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('5425233430109903'));
        // Valid American Express
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('374245455400126'));
    });
    void (0, node_test_1.test)('rejects invalid credit card numbers', () => {
        // Invalid checksum
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('4532015112830367'));
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('5425233430109904'));
        // Too short
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('123456789012'));
        // Too long
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('12345678901234567890'));
        // Empty
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)(''));
    });
    void (0, node_test_1.test)('handles various formatting', () => {
        // All same valid card, different formats
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532015112830366'));
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532-0151-1283-0366'));
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532 0151 1283 0366'));
        node_assert_1.strict.ok((0, validators_1.luhnCheck)('4532.0151.1283.0366'));
    });
    void (0, node_test_1.test)('rejects sequential and repeated patterns', () => {
        // While Luhn might technically pass for some sequential numbers,
        // our statistical anomaly detection would catch these
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('1234567890123'));
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('0000000000000'));
    });
});
(0, node_test_1.describe)('Australian Tax File Number (TFN) Validation', () => {
    void (0, node_test_1.test)('validates correct TFN numbers', () => {
        // Valid TFN examples (these pass the checksum algorithm)
        node_assert_1.strict.ok((0, validators_1.tfnCheck)('123456782')); // Valid checksum
        node_assert_1.strict.ok((0, validators_1.tfnCheck)('123 456 782')); // With spaces
        node_assert_1.strict.ok((0, validators_1.tfnCheck)('123-456-782')); // With dashes
    });
    void (0, node_test_1.test)('rejects invalid TFN numbers', () => {
        // Invalid checksum
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('123456789')); // Wrong checksum
        // Wrong length
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('12345678')); // Too short
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('1234567890')); // Too long
        // Empty
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)(''));
    });
    void (0, node_test_1.test)('handles TFN formatting variations', () => {
        // Same valid TFN, different formats
        node_assert_1.strict.ok((0, validators_1.tfnCheck)('123456782'));
        node_assert_1.strict.ok((0, validators_1.tfnCheck)('123 456 782'));
        node_assert_1.strict.ok((0, validators_1.tfnCheck)('123-456-782'));
    });
    void (0, node_test_1.test)('rejects sequential patterns', () => {
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('123456789')); // Sequential, also fails checksum
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('111111111')); // Repeated
    });
});
(0, node_test_1.describe)('Australian Business Number (ABN) Validation', () => {
    void (0, node_test_1.test)('validates correct ABN numbers', () => {
        // Valid ABN examples (these pass the modulo 89 check)
        node_assert_1.strict.ok((0, validators_1.abnCheck)('51824753556')); // Valid ABN
        node_assert_1.strict.ok((0, validators_1.abnCheck)('51 824 753 556')); // With spaces
        node_assert_1.strict.ok((0, validators_1.abnCheck)('51-824-753-556')); // With dashes
    });
    void (0, node_test_1.test)('rejects invalid ABN numbers', () => {
        // Invalid checksum
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)('51824753557')); // Wrong checksum
        // Wrong length
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)('5182475355')); // Too short
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)('518247535567')); // Too long
        // Empty
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)(''));
    });
    void (0, node_test_1.test)('handles ABN formatting variations', () => {
        // Same valid ABN, different formats
        node_assert_1.strict.ok((0, validators_1.abnCheck)('51824753556'));
        node_assert_1.strict.ok((0, validators_1.abnCheck)('51 824 753 556'));
        node_assert_1.strict.ok((0, validators_1.abnCheck)('51-824-753-556'));
    });
    void (0, node_test_1.test)('applies subtract-1-from-first-digit rule correctly', () => {
        // ABN algorithm subtracts 1 from first digit before weighting
        // Testing that this is applied correctly
        const validAbn = '51824753556';
        node_assert_1.strict.ok((0, validators_1.abnCheck)(validAbn));
        // Changing first digit should invalidate
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)('61824753556'));
    });
});
(0, node_test_1.describe)('Date of Birth Validation', () => {
    void (0, node_test_1.test)('validates plausible birth dates (18-120 years)', () => {
        // Valid ages (calculated from current year)
        const currentYear = new Date().getFullYear();
        // 18 years old (lower bound)
        const eighteenYearsAgo = currentYear - 18;
        node_assert_1.strict.ok((0, validators_1.validateBirthDate)(`${eighteenYearsAgo}-05-28`).isValid);
        // 50 years old (middle)
        node_assert_1.strict.ok((0, validators_1.validateBirthDate)('1975-03-15').isValid);
        // 120 years old (upper bound)
        const oneHundredTwentyYearsAgo = currentYear - 120;
        node_assert_1.strict.ok((0, validators_1.validateBirthDate)(`${oneHundredTwentyYearsAgo}-01-01`).isValid);
    });
    void (0, node_test_1.test)('rejects implausible ages', () => {
        const currentYear = new Date().getFullYear();
        // Too young (< 18)
        const seventeenYearsAgo = currentYear - 17;
        const result1 = (0, validators_1.validateBirthDate)(`${seventeenYearsAgo}-05-28`);
        node_assert_1.strict.ok(!result1.isValid);
        node_assert_1.strict.ok(result1.reason?.includes('< 18'));
        // Too old (> 120)
        const tooOld = currentYear - 121;
        const result2 = (0, validators_1.validateBirthDate)(`${tooOld}-01-01`);
        node_assert_1.strict.ok(!result2.isValid);
        node_assert_1.strict.ok(result2.reason?.includes('> 120'));
        // Future date
        const nextYear = currentYear + 1;
        const result3 = (0, validators_1.validateBirthDate)(`${nextYear}-01-01`);
        node_assert_1.strict.ok(!result3.isValid);
        node_assert_1.strict.ok(result3.reason?.includes('Future date'));
    });
    (0, node_test_1.test)('rejects invalid calendar dates', () => {
        // February 30 doesn't exist
        const result1 = (0, validators_1.validateBirthDate)('1986-02-30');
        node_assert_1.strict.ok(!result1.isValid);
        node_assert_1.strict.ok(result1.reason?.includes('Invalid calendar date'));
        // April 31 doesn't exist
        const result2 = (0, validators_1.validateBirthDate)('1986-04-31');
        node_assert_1.strict.ok(!result2.isValid);
        // Month 13 doesn't exist
        const result3 = (0, validators_1.validateBirthDate)('1986-13-01');
        node_assert_1.strict.ok(!result3.isValid);
    });
    (0, node_test_1.test)('handles both YYYY-MM-DD and DD-MM-YYYY formats', () => {
        // YYYY-MM-DD format
        node_assert_1.strict.ok((0, validators_1.validateBirthDate)('1986-05-28').isValid);
        // DD-MM-YYYY format
        node_assert_1.strict.ok((0, validators_1.validateBirthDate)('28-05-1986').isValid);
    });
    (0, node_test_1.test)('rejects malformed dates', () => {
        const result1 = (0, validators_1.validateBirthDate)('not-a-date');
        node_assert_1.strict.ok(!result1.isValid);
        const result2 = (0, validators_1.validateBirthDate)('1986-05');
        node_assert_1.strict.ok(!result2.isValid);
        const result3 = (0, validators_1.validateBirthDate)('');
        node_assert_1.strict.ok(!result3.isValid);
    });
    (0, node_test_1.test)('provides helpful confidence scores', () => {
        // Valid date should have high confidence
        const validResult = (0, validators_1.validateBirthDate)('1986-05-28');
        node_assert_1.strict.ok(validResult.isValid);
        node_assert_1.strict.ok(validResult.confidence >= 0.9);
        // Invalid date should have low confidence
        const invalidResult = (0, validators_1.validateBirthDate)('2030-01-01');
        node_assert_1.strict.ok(!invalidResult.isValid);
        node_assert_1.strict.ok(invalidResult.confidence < 0.5);
    });
});
(0, node_test_1.describe)('Email Validation', () => {
    (0, node_test_1.test)('validates real email addresses', () => {
        node_assert_1.strict.ok((0, validators_1.validateEmail)('john.doe@company.com').isValid);
        node_assert_1.strict.ok((0, validators_1.validateEmail)('user+tag@domain.co.uk').isValid);
        node_assert_1.strict.ok((0, validators_1.validateEmail)('admin@company.com').isValid);
    });
    (0, node_test_1.test)('rejects test/example emails', () => {
        const result1 = (0, validators_1.validateEmail)('test@example.com');
        node_assert_1.strict.ok(!result1.isValid);
        node_assert_1.strict.ok(result1.reason?.includes('Test/example'));
        const result2 = (0, validators_1.validateEmail)('user@test.com');
        node_assert_1.strict.ok(!result2.isValid);
        const result3 = (0, validators_1.validateEmail)('noreply@sample.com');
        node_assert_1.strict.ok(!result3.isValid);
    });
    (0, node_test_1.test)('rejects malformed emails', () => {
        const result1 = (0, validators_1.validateEmail)('not-an-email');
        node_assert_1.strict.ok(!result1.isValid);
        const result2 = (0, validators_1.validateEmail)('@example.com');
        node_assert_1.strict.ok(!result2.isValid);
        const result3 = (0, validators_1.validateEmail)('user@');
        node_assert_1.strict.ok(!result3.isValid);
    });
    (0, node_test_1.test)('provides confidence scores', () => {
        // Valid email should have high confidence
        const validResult = (0, validators_1.validateEmail)('john@company.com');
        node_assert_1.strict.ok(validResult.isValid);
        node_assert_1.strict.ok(validResult.confidence >= 0.8);
        // Test email should have low confidence
        const testResult = (0, validators_1.validateEmail)('test@example.com');
        node_assert_1.strict.ok(!testResult.isValid);
        node_assert_1.strict.ok(testResult.confidence < 0.3);
    });
});
(0, node_test_1.describe)('IBAN Validation', () => {
    (0, node_test_1.test)('validates correct IBAN numbers', () => {
        // Valid IBANs from different countries
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('GB82WEST12345698765432')); // UK
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('DE89370400440532013000')); // Germany
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('FR1420041010050500013M02606')); // France
        // With spaces (should be removed)
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('GB82 WEST 1234 5698 7654 32'));
    });
    (0, node_test_1.test)('rejects invalid IBAN numbers', () => {
        // Invalid checksum
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('GB82WEST12345698765433')); // Wrong check digit
        // Wrong length
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('GB82WEST')); // Too short
        // Missing country code
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('82WEST12345698765432'));
        // Empty
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)(''));
    });
    (0, node_test_1.test)('handles IBAN formatting', () => {
        // Same valid IBAN, different formats
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('GB82WEST12345698765432'));
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('GB82 WEST 1234 5698 7654 32'));
        node_assert_1.strict.ok((0, validators_1.ibanCheck)('gb82west12345698765432')); // Lowercase
    });
    (0, node_test_1.test)('validates country code format', () => {
        // Must start with 2 letters
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('1234567890123456')); // No letters
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('A234567890123456')); // Only 1 letter
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('123B567890123456')); // Letters not at start
    });
});
(0, node_test_1.describe)('FORMAT_VALIDATORS Registry', () => {
    (0, node_test_1.test)('contains validators for all major PII types', () => {
        node_assert_1.strict.ok(validators_1.FORMAT_VALIDATORS.creditCard);
        node_assert_1.strict.ok(validators_1.FORMAT_VALIDATORS.australianTFN);
        node_assert_1.strict.ok(validators_1.FORMAT_VALIDATORS.australianABN);
        node_assert_1.strict.ok(validators_1.FORMAT_VALIDATORS.dateOfBirth);
        node_assert_1.strict.ok(validators_1.FORMAT_VALIDATORS.email);
        node_assert_1.strict.ok(validators_1.FORMAT_VALIDATORS.iban);
    });
    (0, node_test_1.test)('validators return ValidationResult objects', () => {
        const result = validators_1.FORMAT_VALIDATORS.creditCard('4532015112830366');
        node_assert_1.strict.ok(typeof result === 'object');
        node_assert_1.strict.ok(typeof result.isValid === 'boolean');
        node_assert_1.strict.ok(typeof result.confidence === 'number');
        node_assert_1.strict.ok(result.confidence >= 0 && result.confidence <= 1);
        node_assert_1.strict.ok(result.reason === undefined || typeof result.reason === 'string');
    });
    (0, node_test_1.test)('creditCard validator uses Luhn algorithm', () => {
        const validResult = validators_1.FORMAT_VALIDATORS.creditCard('4532015112830366');
        node_assert_1.strict.ok(validResult.isValid);
        node_assert_1.strict.ok(validResult.confidence >= 0.9);
        node_assert_1.strict.ok(validResult.reason?.includes('Luhn'));
        const invalidResult = validators_1.FORMAT_VALIDATORS.creditCard('4532015112830367');
        node_assert_1.strict.ok(!invalidResult.isValid);
        node_assert_1.strict.ok(invalidResult.confidence < 0.5);
    });
    (0, node_test_1.test)('australianTFN validator uses TFN checksum', () => {
        const validResult = validators_1.FORMAT_VALIDATORS.australianTFN('123456782');
        node_assert_1.strict.ok(validResult.isValid);
        node_assert_1.strict.ok(validResult.confidence >= 0.9);
        node_assert_1.strict.ok(validResult.reason?.includes('TFN checksum'));
        const invalidResult = validators_1.FORMAT_VALIDATORS.australianTFN('123456789');
        node_assert_1.strict.ok(!invalidResult.isValid);
        node_assert_1.strict.ok(invalidResult.reason?.includes('invalid'));
    });
    (0, node_test_1.test)('australianABN validator uses ABN checksum', () => {
        const validResult = validators_1.FORMAT_VALIDATORS.australianABN('51824753556');
        node_assert_1.strict.ok(validResult.isValid);
        node_assert_1.strict.ok(validResult.confidence >= 0.9);
        const invalidResult = validators_1.FORMAT_VALIDATORS.australianABN('51824753557');
        node_assert_1.strict.ok(!invalidResult.isValid);
    });
});
(0, node_test_1.describe)('Edge Cases and Error Handling', () => {
    (0, node_test_1.test)('handles empty strings gracefully', () => {
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)(''));
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)(''));
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)(''));
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)(''));
        node_assert_1.strict.ok(!(0, validators_1.validateBirthDate)('').isValid);
        node_assert_1.strict.ok(!(0, validators_1.validateEmail)('').isValid);
    });
    (0, node_test_1.test)('handles whitespace-only strings', () => {
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('   '));
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('   '));
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)('   '));
        node_assert_1.strict.ok(!(0, validators_1.ibanCheck)('   '));
    });
    (0, node_test_1.test)('handles non-numeric input for numeric validators', () => {
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('abcd-efgh-ijkl-mnop'));
        node_assert_1.strict.ok(!(0, validators_1.tfnCheck)('abc-def-ghi'));
        node_assert_1.strict.ok(!(0, validators_1.abnCheck)('ab-cde-fgh-ijk'));
    });
    (0, node_test_1.test)('handles null and undefined as strings', () => {
        // TypeScript would prevent this, but runtime might receive these
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('null'));
        node_assert_1.strict.ok(!(0, validators_1.luhnCheck)('undefined'));
        node_assert_1.strict.ok(!(0, validators_1.validateBirthDate)('null').isValid);
    });
});
(0, node_test_1.describe)('Performance Tests', () => {
    (0, node_test_1.test)('validators execute quickly', () => {
        const start = Date.now();
        // Run each validator 1000 times
        for (let i = 0; i < 1000; i++) {
            (0, validators_1.luhnCheck)('4532015112830366');
            (0, validators_1.tfnCheck)('123456782');
            (0, validators_1.abnCheck)('51824753556');
            (0, validators_1.validateBirthDate)('1986-05-28');
            (0, validators_1.validateEmail)('john@company.com');
            (0, validators_1.ibanCheck)('GB82WEST12345698765432');
        }
        const end = Date.now();
        const elapsed = end - start;
        // Should complete 6000 validations in < 500ms
        node_assert_1.strict.ok(elapsed < 500, `Validators too slow: ${elapsed}ms`);
    });
});
//# sourceMappingURL=validators.test.js.map