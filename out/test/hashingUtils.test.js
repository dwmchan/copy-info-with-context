"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const hashingUtils_1 = require("../utils/hashingUtils");
(0, node_test_1.describe)('Deterministic Hash Generation', () => {
    (0, node_test_1.test)('generates consistent hashes for same input', () => {
        const value = 'test@example.com';
        const hash1 = (0, hashingUtils_1.generateDeterministicHash)(value);
        const hash2 = (0, hashingUtils_1.generateDeterministicHash)(value);
        node_assert_1.strict.equal(hash1, hash2, 'Same input should produce same hash');
    });
    (0, node_test_1.test)('generates different hashes for different inputs', () => {
        const hash1 = (0, hashingUtils_1.generateDeterministicHash)('test1@example.com');
        const hash2 = (0, hashingUtils_1.generateDeterministicHash)('test2@example.com');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different inputs should produce different hashes');
    });
    (0, node_test_1.test)('respects custom salt', () => {
        const value = 'test@example.com';
        const hash1 = (0, hashingUtils_1.generateDeterministicHash)(value, 'salt1');
        const hash2 = (0, hashingUtils_1.generateDeterministicHash)(value, 'salt2');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different salts should produce different hashes');
    });
    (0, node_test_1.test)('respects truncate length', () => {
        const value = 'test@example.com';
        const hash4 = (0, hashingUtils_1.generateDeterministicHash)(value, undefined, 4);
        const hash8 = (0, hashingUtils_1.generateDeterministicHash)(value, undefined, 8);
        const hash16 = (0, hashingUtils_1.generateDeterministicHash)(value, undefined, 16);
        node_assert_1.strict.equal(hash4.length, 4, 'Should truncate to 4 characters');
        node_assert_1.strict.equal(hash8.length, 8, 'Should truncate to 8 characters');
        node_assert_1.strict.equal(hash16.length, 16, 'Should truncate to 16 characters');
    });
    (0, node_test_1.test)('uses default salt when not provided', () => {
        const value = 'test@example.com';
        const hash1 = (0, hashingUtils_1.generateDeterministicHash)(value);
        const hash2 = (0, hashingUtils_1.generateDeterministicHash)(value, undefined);
        node_assert_1.strict.equal(hash1, hash2, 'Undefined salt should use default');
    });
    (0, node_test_1.test)('uses default truncate length of 8', () => {
        const value = 'test@example.com';
        const hash = (0, hashingUtils_1.generateDeterministicHash)(value);
        node_assert_1.strict.equal(hash.length, 8, 'Default truncate length should be 8');
    });
});
(0, node_test_1.describe)('Email Hashing', () => {
    (0, node_test_1.test)('preserves domain by default', () => {
        const hashed = (0, hashingUtils_1.hashEmail)('john.doe@example.com');
        node_assert_1.strict.ok(hashed.includes('@example.com'), 'Should preserve domain');
        node_assert_1.strict.ok(!hashed.includes('john.doe'), 'Should hash local part');
    });
    (0, node_test_1.test)('hashes local part consistently', () => {
        const hash1 = (0, hashingUtils_1.hashEmail)('john.doe@example.com');
        const hash2 = (0, hashingUtils_1.hashEmail)('john.doe@example.com');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('can hash entire email including domain', () => {
        const hashed = (0, hashingUtils_1.hashEmail)('john.doe@example.com', false);
        node_assert_1.strict.ok(!hashed.includes('@example.com'), 'Should hash domain');
        node_assert_1.strict.ok(hashed.includes('@'), 'Should still have @ separator');
        node_assert_1.strict.ok(hashed.includes('.com'), 'Should end with .com');
    });
    (0, node_test_1.test)('handles invalid email format gracefully', () => {
        const hashed = (0, hashingUtils_1.hashEmail)('notanemail');
        node_assert_1.strict.ok(typeof hashed === 'string', 'Should return a string');
        node_assert_1.strict.ok(hashed.length > 0, 'Should not return empty string');
    });
    (0, node_test_1.test)('hashes different emails to different values', () => {
        const hash1 = (0, hashingUtils_1.hashEmail)('alice@example.com');
        const hash2 = (0, hashingUtils_1.hashEmail)('bob@example.com');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different emails should hash differently');
    });
});
(0, node_test_1.describe)('Phone Number Hashing', () => {
    (0, node_test_1.test)('preserves country code when present', () => {
        const hashed = (0, hashingUtils_1.hashPhone)('+61 412 345 678');
        node_assert_1.strict.ok(hashed.startsWith('+61-'), 'Should preserve country code');
        node_assert_1.strict.ok(!hashed.includes('412'), 'Should hash rest of number');
    });
    (0, node_test_1.test)('handles phone without country code', () => {
        const hashed = (0, hashingUtils_1.hashPhone)('0412345678');
        node_assert_1.strict.ok(typeof hashed === 'string', 'Should return a string');
        node_assert_1.strict.ok(hashed.length > 0, 'Should not return empty string');
        node_assert_1.strict.ok(!hashed.includes('0412345678'), 'Should hash the number');
    });
    (0, node_test_1.test)('produces consistent hashes', () => {
        const hash1 = (0, hashingUtils_1.hashPhone)('+61 412 345 678');
        const hash2 = (0, hashingUtils_1.hashPhone)('+61 412 345 678');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('handles various phone formats', () => {
        const hash1 = (0, hashingUtils_1.hashPhone)('+61412345678');
        const hash2 = (0, hashingUtils_1.hashPhone)('+61 412 345 678');
        const hash3 = (0, hashingUtils_1.hashPhone)('+61-412-345-678');
        // All should produce consistent output (digits extracted)
        node_assert_1.strict.ok(hash1.startsWith('+61-'), 'Format 1 should preserve country code');
        node_assert_1.strict.ok(hash2.startsWith('+61-'), 'Format 2 should preserve country code');
        node_assert_1.strict.ok(hash3.startsWith('+61-'), 'Format 3 should preserve country code');
    });
    (0, node_test_1.test)('different phone numbers hash differently', () => {
        const hash1 = (0, hashingUtils_1.hashPhone)('+61 412 345 678');
        const hash2 = (0, hashingUtils_1.hashPhone)('+61 412 999 888');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different numbers should hash differently');
    });
});
(0, node_test_1.describe)('Credit Card Hashing', () => {
    (0, node_test_1.test)('preserves last 4 digits', () => {
        const hashed = (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
        node_assert_1.strict.ok(hashed.endsWith('-9010'), 'Should preserve last 4 digits');
        node_assert_1.strict.ok(!hashed.includes('4532'), 'Should hash first digits');
    });
    (0, node_test_1.test)('produces consistent hashes', () => {
        const hash1 = (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
        const hash2 = (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('handles various credit card formats', () => {
        const hash1 = (0, hashingUtils_1.hashCreditCard)('4532123456789010');
        const hash2 = (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
        const hash3 = (0, hashingUtils_1.hashCreditCard)('4532-1234-5678-9010');
        // All should preserve last 4 digits
        node_assert_1.strict.ok(hash1.endsWith('-9010'), 'Format 1 should preserve last 4');
        node_assert_1.strict.ok(hash2.endsWith('-9010'), 'Format 2 should preserve last 4');
        node_assert_1.strict.ok(hash3.endsWith('-9010'), 'Format 3 should preserve last 4');
    });
    (0, node_test_1.test)('handles short card numbers gracefully', () => {
        const hashed = (0, hashingUtils_1.hashCreditCard)('123456');
        node_assert_1.strict.ok(typeof hashed === 'string', 'Should return a string');
        node_assert_1.strict.ok(hashed.length > 0, 'Should not return empty string');
    });
    (0, node_test_1.test)('different cards hash differently', () => {
        const hash1 = (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
        const hash2 = (0, hashingUtils_1.hashCreditCard)('5425 2334 3010 9903');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different cards should hash differently');
    });
    (0, node_test_1.test)('hash portion is uppercase', () => {
        const hashed = (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
        const hashPart = hashed.split('-')[0];
        node_assert_1.strict.equal(hashPart, hashPart?.toUpperCase(), 'Hash should be uppercase');
    });
});
(0, node_test_1.describe)('SSN Hashing', () => {
    (0, node_test_1.test)('preserves last 4 digits', () => {
        const hashed = (0, hashingUtils_1.hashSSN)('123-45-6789');
        node_assert_1.strict.ok(hashed.endsWith('-6789'), 'Should preserve last 4 digits');
        node_assert_1.strict.ok(!hashed.includes('123'), 'Should hash first part');
    });
    (0, node_test_1.test)('maintains SSN format structure', () => {
        const hashed = (0, hashingUtils_1.hashSSN)('123-45-6789');
        const parts = hashed.split('-');
        node_assert_1.strict.equal(parts.length, 3, 'Should have 3 parts separated by dashes');
        node_assert_1.strict.equal(parts[2], '6789', 'Last part should be last 4 digits');
    });
    (0, node_test_1.test)('produces consistent hashes', () => {
        const hash1 = (0, hashingUtils_1.hashSSN)('123-45-6789');
        const hash2 = (0, hashingUtils_1.hashSSN)('123-45-6789');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('handles invalid SSN format gracefully', () => {
        const hashed = (0, hashingUtils_1.hashSSN)('12345');
        node_assert_1.strict.equal(hashed, '***-**-****', 'Should return masked format for invalid SSN');
    });
    (0, node_test_1.test)('different SSNs hash differently', () => {
        const hash1 = (0, hashingUtils_1.hashSSN)('123-45-6789');
        const hash2 = (0, hashingUtils_1.hashSSN)('987-65-4321');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different SSNs should hash differently');
    });
    (0, node_test_1.test)('hash portion is uppercase', () => {
        const hashed = (0, hashingUtils_1.hashSSN)('123-45-6789');
        const hashParts = hashed.split('-').slice(0, 2);
        hashParts.forEach(part => {
            if (part) {
                node_assert_1.strict.equal(part, part.toUpperCase(), 'Hash parts should be uppercase');
            }
        });
    });
});
(0, node_test_1.describe)('Date of Birth Hashing', () => {
    (0, node_test_1.test)('preserves year in YYYY-MM-DD format', () => {
        const hashed = (0, hashingUtils_1.hashDateOfBirth)('1986-05-28');
        node_assert_1.strict.ok(hashed.startsWith('1986-'), 'Should preserve year');
        node_assert_1.strict.ok(!hashed.includes('05'), 'Should hash month');
        node_assert_1.strict.ok(!hashed.includes('28'), 'Should hash day');
    });
    (0, node_test_1.test)('preserves year in DD-MM-YYYY format', () => {
        const hashed = (0, hashingUtils_1.hashDateOfBirth)('28-05-1986');
        node_assert_1.strict.ok(hashed.endsWith('-1986'), 'Should preserve year');
        node_assert_1.strict.ok(!hashed.includes('28'), 'Should hash day');
        node_assert_1.strict.ok(!hashed.includes('05'), 'Should hash month');
    });
    (0, node_test_1.test)('produces consistent hashes', () => {
        const hash1 = (0, hashingUtils_1.hashDateOfBirth)('1986-05-28');
        const hash2 = (0, hashingUtils_1.hashDateOfBirth)('1986-05-28');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('handles invalid date format gracefully', () => {
        const hashed = (0, hashingUtils_1.hashDateOfBirth)('notadate');
        node_assert_1.strict.ok(typeof hashed === 'string', 'Should return a string');
        node_assert_1.strict.ok(hashed.length > 0, 'Should not return empty string');
    });
    (0, node_test_1.test)('different dates hash differently', () => {
        const hash1 = (0, hashingUtils_1.hashDateOfBirth)('1986-05-28');
        const hash2 = (0, hashingUtils_1.hashDateOfBirth)('1990-12-15');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different dates should hash differently');
    });
    (0, node_test_1.test)('hash portion is uppercase', () => {
        const hashed = (0, hashingUtils_1.hashDateOfBirth)('1986-05-28');
        const hashPart = hashed.split('-')[1];
        if (hashPart) {
            node_assert_1.strict.equal(hashPart, hashPart.toUpperCase(), 'Hash should be uppercase');
        }
    });
});
(0, node_test_1.describe)('Address Hashing', () => {
    (0, node_test_1.test)('preserves postcode when present', () => {
        const hashed = (0, hashingUtils_1.hashAddress)('123 Main Street, Melbourne VIC 3000');
        node_assert_1.strict.ok(hashed.includes('3000'), 'Should preserve postcode');
        node_assert_1.strict.ok(!hashed.includes('123 Main Street'), 'Should hash street address');
    });
    (0, node_test_1.test)('produces consistent hashes', () => {
        const hash1 = (0, hashingUtils_1.hashAddress)('123 Main Street, Melbourne VIC 3000');
        const hash2 = (0, hashingUtils_1.hashAddress)('123 Main Street, Melbourne VIC 3000');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('handles address without postcode', () => {
        const hashed = (0, hashingUtils_1.hashAddress)('Some Street Name');
        node_assert_1.strict.ok(typeof hashed === 'string', 'Should return a string');
        node_assert_1.strict.ok(hashed.length > 0, 'Should not return empty string');
        node_assert_1.strict.ok(!hashed.includes('Some Street Name'), 'Should hash address');
    });
    (0, node_test_1.test)('handles various postcode formats', () => {
        const hash1 = (0, hashingUtils_1.hashAddress)('Address with 3000');
        const hash2 = (0, hashingUtils_1.hashAddress)('Address with 12345');
        node_assert_1.strict.ok(hash1.includes('3000'), 'Should preserve 4-digit postcode');
        node_assert_1.strict.ok(hash2.includes('12345'), 'Should preserve 5-digit postcode');
    });
    (0, node_test_1.test)('different addresses hash differently', () => {
        const hash1 = (0, hashingUtils_1.hashAddress)('123 Main Street, Melbourne VIC 3000');
        const hash2 = (0, hashingUtils_1.hashAddress)('456 Queen Street, Brisbane QLD 4000');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different addresses should hash differently');
    });
    (0, node_test_1.test)('hash portion is uppercase', () => {
        const hashed = (0, hashingUtils_1.hashAddress)('123 Main Street, Melbourne VIC 3000');
        const hashPart = hashed.split(',')[0];
        if (hashPart) {
            node_assert_1.strict.equal(hashPart, hashPart.toUpperCase(), 'Hash should be uppercase');
        }
    });
});
(0, node_test_1.describe)('Generic Hashing', () => {
    (0, node_test_1.test)('produces consistent hashes', () => {
        const hash1 = (0, hashingUtils_1.hashGeneric)('test-value');
        const hash2 = (0, hashingUtils_1.hashGeneric)('test-value');
        node_assert_1.strict.equal(hash1, hash2, 'Should produce consistent hash');
    });
    (0, node_test_1.test)('different values hash differently', () => {
        const hash1 = (0, hashingUtils_1.hashGeneric)('value1');
        const hash2 = (0, hashingUtils_1.hashGeneric)('value2');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different values should hash differently');
    });
    (0, node_test_1.test)('respects custom context', () => {
        const hash1 = (0, hashingUtils_1.hashGeneric)('value', 'context1');
        const hash2 = (0, hashingUtils_1.hashGeneric)('value', 'context2');
        node_assert_1.strict.notEqual(hash1, hash2, 'Different contexts should produce different hashes');
    });
    (0, node_test_1.test)('respects custom length', () => {
        const hash4 = (0, hashingUtils_1.hashGeneric)('value', 'context', 4);
        const hash16 = (0, hashingUtils_1.hashGeneric)('value', 'context', 16);
        node_assert_1.strict.equal(hash4.length, 4, 'Should respect length parameter');
        node_assert_1.strict.equal(hash16.length, 16, 'Should respect length parameter');
    });
    (0, node_test_1.test)('returns uppercase hash', () => {
        const hash = (0, hashingUtils_1.hashGeneric)('test-value');
        node_assert_1.strict.equal(hash, hash.toUpperCase(), 'Hash should be uppercase');
    });
});
(0, node_test_1.describe)('HASH_FUNCTIONS Registry', () => {
    (0, node_test_1.test)('contains functions for all major PII types', () => {
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['email'], 'Should have email hash function');
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['phone'], 'Should have phone hash function');
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['creditCard'], 'Should have creditCard hash function');
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['ssn'], 'Should have ssn hash function');
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['dateOfBirth'], 'Should have dateOfBirth hash function');
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['address'], 'Should have address hash function');
        node_assert_1.strict.ok(hashingUtils_1.HASH_FUNCTIONS['generic'], 'Should have generic hash function');
    });
    (0, node_test_1.test)('creditCard variants map to same function', () => {
        node_assert_1.strict.equal(hashingUtils_1.HASH_FUNCTIONS['creditCard'], hashingUtils_1.HASH_FUNCTIONS['creditCardVisa']);
        node_assert_1.strict.equal(hashingUtils_1.HASH_FUNCTIONS['creditCard'], hashingUtils_1.HASH_FUNCTIONS['creditCardMastercard']);
        node_assert_1.strict.equal(hashingUtils_1.HASH_FUNCTIONS['creditCard'], hashingUtils_1.HASH_FUNCTIONS['creditCardAmex']);
        node_assert_1.strict.equal(hashingUtils_1.HASH_FUNCTIONS['creditCard'], hashingUtils_1.HASH_FUNCTIONS['creditCardGeneric']);
    });
    (0, node_test_1.test)('all functions return strings', () => {
        const testValue = 'test-value';
        Object.entries(hashingUtils_1.HASH_FUNCTIONS).forEach(([type, hashFn]) => {
            const result = hashFn(testValue);
            node_assert_1.strict.ok(typeof result === 'string', `${type} should return string`);
            node_assert_1.strict.ok(result.length > 0, `${type} should return non-empty string`);
        });
    });
});
(0, node_test_1.describe)('getHashFunction Helper', () => {
    (0, node_test_1.test)('returns correct function for known types', () => {
        const emailFn = (0, hashingUtils_1.getHashFunction)('email');
        const phoneFn = (0, hashingUtils_1.getHashFunction)('phone');
        node_assert_1.strict.equal(emailFn, hashingUtils_1.HASH_FUNCTIONS.email, 'Should return email hash function');
        node_assert_1.strict.equal(phoneFn, hashingUtils_1.HASH_FUNCTIONS.phone, 'Should return phone hash function');
    });
    (0, node_test_1.test)('returns generic function for unknown types', () => {
        const unknownFn = (0, hashingUtils_1.getHashFunction)('unknown-type');
        node_assert_1.strict.equal(unknownFn, hashingUtils_1.HASH_FUNCTIONS.generic, 'Should return generic hash function');
    });
    (0, node_test_1.test)('returned function works correctly', () => {
        const hashFn = (0, hashingUtils_1.getHashFunction)('email');
        const result = hashFn('test@example.com');
        node_assert_1.strict.ok(typeof result === 'string', 'Should return string');
        node_assert_1.strict.ok(result.length > 0, 'Should return non-empty string');
    });
    (0, node_test_1.test)('handles null and undefined gracefully', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        const nullFn = (0, hashingUtils_1.getHashFunction)(null);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        const undefinedFn = (0, hashingUtils_1.getHashFunction)(undefined);
        node_assert_1.strict.ok(typeof nullFn === 'function', 'Should return function for null');
        node_assert_1.strict.ok(typeof undefinedFn === 'function', 'Should return function for undefined');
    });
});
(0, node_test_1.describe)('Edge Cases and Error Handling', () => {
    (0, node_test_1.test)('handles empty strings gracefully', () => {
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashEmail)('') === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashPhone)('') === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashCreditCard)('') === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashSSN)('') === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashDateOfBirth)('') === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashAddress)('') === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashGeneric)('') === 'string');
    });
    (0, node_test_1.test)('handles whitespace-only strings', () => {
        const value = '   ';
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashEmail)(value) === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashPhone)(value) === 'string');
        node_assert_1.strict.ok(typeof (0, hashingUtils_1.hashGeneric)(value) === 'string');
    });
    (0, node_test_1.test)('handles special characters', () => {
        const specialChars = '!@#$%^&*()_+-={}[]|:;<>?,./';
        const hashed = (0, hashingUtils_1.hashGeneric)(specialChars);
        node_assert_1.strict.ok(typeof hashed === 'string');
        node_assert_1.strict.ok(hashed.length > 0);
    });
    (0, node_test_1.test)('handles unicode characters', () => {
        const unicode = '测试中文字符🎉🎊';
        const hashed = (0, hashingUtils_1.hashGeneric)(unicode);
        node_assert_1.strict.ok(typeof hashed === 'string');
        node_assert_1.strict.ok(hashed.length > 0);
    });
    (0, node_test_1.test)('handles very long strings', () => {
        const longString = 'a'.repeat(10000);
        const hashed = (0, hashingUtils_1.hashGeneric)(longString);
        node_assert_1.strict.ok(typeof hashed === 'string');
        node_assert_1.strict.ok(hashed.length > 0);
    });
});
(0, node_test_1.describe)('Performance Tests', () => {
    (0, node_test_1.test)('hash functions execute quickly', () => {
        const start = Date.now();
        // Run each hash function 1000 times
        for (let i = 0; i < 1000; i++) {
            (0, hashingUtils_1.generateDeterministicHash)('test-value');
            (0, hashingUtils_1.hashEmail)('test@example.com');
            (0, hashingUtils_1.hashPhone)('+61 412 345 678');
            (0, hashingUtils_1.hashCreditCard)('4532 1234 5678 9010');
            (0, hashingUtils_1.hashSSN)('123-45-6789');
            (0, hashingUtils_1.hashDateOfBirth)('1986-05-28');
            (0, hashingUtils_1.hashAddress)('123 Main Street, Melbourne VIC 3000');
            (0, hashingUtils_1.hashGeneric)('test-value');
        }
        const end = Date.now();
        const elapsed = end - start;
        // Should complete 8000 hash operations in < 1000ms
        node_assert_1.strict.ok(elapsed < 1000, `Hash functions too slow: ${elapsed}ms`);
    });
    (0, node_test_1.test)('deterministic hashing is consistent under load', () => {
        const value = 'consistency-test';
        const hashes = new Set();
        // Generate same hash 1000 times
        for (let i = 0; i < 1000; i++) {
            hashes.add((0, hashingUtils_1.generateDeterministicHash)(value));
        }
        // Should only have one unique hash
        node_assert_1.strict.equal(hashes.size, 1, 'Should produce consistent hash under load');
    });
});
(0, node_test_1.describe)('Hash Collision Resistance', () => {
    (0, node_test_1.test)('different inputs produce different hashes', () => {
        const hashes = new Set();
        // Generate hashes for many different inputs
        for (let i = 0; i < 1000; i++) {
            const hash = (0, hashingUtils_1.generateDeterministicHash)(`value-${i}`);
            hashes.add(hash);
        }
        // Should have 1000 unique hashes (no collisions)
        node_assert_1.strict.equal(hashes.size, 1000, 'Should produce unique hashes for different inputs');
    });
    (0, node_test_1.test)('similar inputs produce different hashes', () => {
        const hash1 = (0, hashingUtils_1.generateDeterministicHash)('test@example.com');
        const hash2 = (0, hashingUtils_1.generateDeterministicHash)('test@example.co');
        const hash3 = (0, hashingUtils_1.generateDeterministicHash)('test@example.comm');
        node_assert_1.strict.notEqual(hash1, hash2, 'Similar inputs should hash differently');
        node_assert_1.strict.notEqual(hash2, hash3, 'Similar inputs should hash differently');
        node_assert_1.strict.notEqual(hash1, hash3, 'Similar inputs should hash differently');
    });
});
//# sourceMappingURL=hashingUtils.test.js.map