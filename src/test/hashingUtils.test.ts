import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    generateDeterministicHash,
    hashEmail,
    hashPhone,
    hashCreditCard,
    hashSSN,
    hashDateOfBirth,
    hashAddress,
    hashGeneric,
    getHashFunction,
    HASH_FUNCTIONS
} from '../utils/hashingUtils';

describe('Deterministic Hash Generation', () => {
    test('generates consistent hashes for same input', () => {
        const value = 'test@example.com';
        const hash1 = generateDeterministicHash(value);
        const hash2 = generateDeterministicHash(value);

        assert.equal(hash1, hash2, 'Same input should produce same hash');
    });

    test('generates different hashes for different inputs', () => {
        const hash1 = generateDeterministicHash('test1@example.com');
        const hash2 = generateDeterministicHash('test2@example.com');

        assert.notEqual(hash1, hash2, 'Different inputs should produce different hashes');
    });

    test('respects custom salt', () => {
        const value = 'test@example.com';
        const hash1 = generateDeterministicHash(value, 'salt1');
        const hash2 = generateDeterministicHash(value, 'salt2');

        assert.notEqual(hash1, hash2, 'Different salts should produce different hashes');
    });

    test('respects truncate length', () => {
        const value = 'test@example.com';
        const hash4 = generateDeterministicHash(value, undefined, 4);
        const hash8 = generateDeterministicHash(value, undefined, 8);
        const hash16 = generateDeterministicHash(value, undefined, 16);

        assert.equal(hash4.length, 4, 'Should truncate to 4 characters');
        assert.equal(hash8.length, 8, 'Should truncate to 8 characters');
        assert.equal(hash16.length, 16, 'Should truncate to 16 characters');
    });

    test('uses default salt when not provided', () => {
        const value = 'test@example.com';
        const hash1 = generateDeterministicHash(value);
        const hash2 = generateDeterministicHash(value, undefined);

        assert.equal(hash1, hash2, 'Undefined salt should use default');
    });

    test('uses default truncate length of 8', () => {
        const value = 'test@example.com';
        const hash = generateDeterministicHash(value);

        assert.equal(hash.length, 8, 'Default truncate length should be 8');
    });
});

describe('Email Hashing', () => {
    test('preserves domain by default', () => {
        const hashed = hashEmail('john.doe@example.com');

        assert.ok(hashed.includes('@example.com'), 'Should preserve domain');
        assert.ok(!hashed.includes('john.doe'), 'Should hash local part');
    });

    test('hashes local part consistently', () => {
        const hash1 = hashEmail('john.doe@example.com');
        const hash2 = hashEmail('john.doe@example.com');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('can hash entire email including domain', () => {
        const hashed = hashEmail('john.doe@example.com', false);

        assert.ok(!hashed.includes('@example.com'), 'Should hash domain');
        assert.ok(hashed.includes('@'), 'Should still have @ separator');
        assert.ok(hashed.includes('.com'), 'Should end with .com');
    });

    test('handles invalid email format gracefully', () => {
        const hashed = hashEmail('notanemail');

        assert.ok(typeof hashed === 'string', 'Should return a string');
        assert.ok(hashed.length > 0, 'Should not return empty string');
    });

    test('hashes different emails to different values', () => {
        const hash1 = hashEmail('alice@example.com');
        const hash2 = hashEmail('bob@example.com');

        assert.notEqual(hash1, hash2, 'Different emails should hash differently');
    });
});

describe('Phone Number Hashing', () => {
    test('preserves country code when present', () => {
        const hashed = hashPhone('+61 412 345 678');

        assert.ok(hashed.startsWith('+61-'), 'Should preserve country code');
        assert.ok(!hashed.includes('412'), 'Should hash rest of number');
    });

    test('handles phone without country code', () => {
        const hashed = hashPhone('0412345678');

        assert.ok(typeof hashed === 'string', 'Should return a string');
        assert.ok(hashed.length > 0, 'Should not return empty string');
        assert.ok(!hashed.includes('0412345678'), 'Should hash the number');
    });

    test('produces consistent hashes', () => {
        const hash1 = hashPhone('+61 412 345 678');
        const hash2 = hashPhone('+61 412 345 678');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('handles various phone formats', () => {
        const hash1 = hashPhone('+61412345678');
        const hash2 = hashPhone('+61 412 345 678');
        const hash3 = hashPhone('+61-412-345-678');

        // All should produce consistent output (digits extracted)
        assert.ok(hash1.startsWith('+61-'), 'Format 1 should preserve country code');
        assert.ok(hash2.startsWith('+61-'), 'Format 2 should preserve country code');
        assert.ok(hash3.startsWith('+61-'), 'Format 3 should preserve country code');
    });

    test('different phone numbers hash differently', () => {
        const hash1 = hashPhone('+61 412 345 678');
        const hash2 = hashPhone('+61 412 999 888');

        assert.notEqual(hash1, hash2, 'Different numbers should hash differently');
    });
});

describe('Credit Card Hashing', () => {
    test('preserves last 4 digits', () => {
        const hashed = hashCreditCard('4532 1234 5678 9010');

        assert.ok(hashed.endsWith('-9010'), 'Should preserve last 4 digits');
        assert.ok(!hashed.includes('4532'), 'Should hash first digits');
    });

    test('produces consistent hashes', () => {
        const hash1 = hashCreditCard('4532 1234 5678 9010');
        const hash2 = hashCreditCard('4532 1234 5678 9010');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('handles various credit card formats', () => {
        const hash1 = hashCreditCard('4532123456789010');
        const hash2 = hashCreditCard('4532 1234 5678 9010');
        const hash3 = hashCreditCard('4532-1234-5678-9010');

        // All should preserve last 4 digits
        assert.ok(hash1.endsWith('-9010'), 'Format 1 should preserve last 4');
        assert.ok(hash2.endsWith('-9010'), 'Format 2 should preserve last 4');
        assert.ok(hash3.endsWith('-9010'), 'Format 3 should preserve last 4');
    });

    test('handles short card numbers gracefully', () => {
        const hashed = hashCreditCard('123456');

        assert.ok(typeof hashed === 'string', 'Should return a string');
        assert.ok(hashed.length > 0, 'Should not return empty string');
    });

    test('different cards hash differently', () => {
        const hash1 = hashCreditCard('4532 1234 5678 9010');
        const hash2 = hashCreditCard('5425 2334 3010 9903');

        assert.notEqual(hash1, hash2, 'Different cards should hash differently');
    });

    test('hash portion is uppercase', () => {
        const hashed = hashCreditCard('4532 1234 5678 9010');
        const hashPart = hashed.split('-')[0];

        assert.equal(hashPart, hashPart?.toUpperCase(), 'Hash should be uppercase');
    });
});

describe('SSN Hashing', () => {
    test('preserves last 4 digits', () => {
        const hashed = hashSSN('123-45-6789');

        assert.ok(hashed.endsWith('-6789'), 'Should preserve last 4 digits');
        assert.ok(!hashed.includes('123'), 'Should hash first part');
    });

    test('maintains SSN format structure', () => {
        const hashed = hashSSN('123-45-6789');
        const parts = hashed.split('-');

        assert.equal(parts.length, 3, 'Should have 3 parts separated by dashes');
        assert.equal(parts[2], '6789', 'Last part should be last 4 digits');
    });

    test('produces consistent hashes', () => {
        const hash1 = hashSSN('123-45-6789');
        const hash2 = hashSSN('123-45-6789');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('handles invalid SSN format gracefully', () => {
        const hashed = hashSSN('12345');

        assert.equal(hashed, '***-**-****', 'Should return masked format for invalid SSN');
    });

    test('different SSNs hash differently', () => {
        const hash1 = hashSSN('123-45-6789');
        const hash2 = hashSSN('987-65-4321');

        assert.notEqual(hash1, hash2, 'Different SSNs should hash differently');
    });

    test('hash portion is uppercase', () => {
        const hashed = hashSSN('123-45-6789');
        const hashParts = hashed.split('-').slice(0, 2);

        hashParts.forEach(part => {
            if (part) {
                assert.equal(part, part.toUpperCase(), 'Hash parts should be uppercase');
            }
        });
    });
});

describe('Date of Birth Hashing', () => {
    test('preserves year in YYYY-MM-DD format', () => {
        const hashed = hashDateOfBirth('1986-05-28');

        assert.ok(hashed.startsWith('1986-'), 'Should preserve year');
        assert.ok(!hashed.includes('05'), 'Should hash month');
        assert.ok(!hashed.includes('28'), 'Should hash day');
    });

    test('preserves year in DD-MM-YYYY format', () => {
        const hashed = hashDateOfBirth('28-05-1986');

        assert.ok(hashed.endsWith('-1986'), 'Should preserve year');
        assert.ok(!hashed.includes('28'), 'Should hash day');
        assert.ok(!hashed.includes('05'), 'Should hash month');
    });

    test('produces consistent hashes', () => {
        const hash1 = hashDateOfBirth('1986-05-28');
        const hash2 = hashDateOfBirth('1986-05-28');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('handles invalid date format gracefully', () => {
        const hashed = hashDateOfBirth('notadate');

        assert.ok(typeof hashed === 'string', 'Should return a string');
        assert.ok(hashed.length > 0, 'Should not return empty string');
    });

    test('different dates hash differently', () => {
        const hash1 = hashDateOfBirth('1986-05-28');
        const hash2 = hashDateOfBirth('1990-12-15');

        assert.notEqual(hash1, hash2, 'Different dates should hash differently');
    });

    test('hash portion is uppercase', () => {
        const hashed = hashDateOfBirth('1986-05-28');
        const hashPart = hashed.split('-')[1];

        if (hashPart) {
            assert.equal(hashPart, hashPart.toUpperCase(), 'Hash should be uppercase');
        }
    });
});

describe('Address Hashing', () => {
    test('preserves postcode when present', () => {
        const hashed = hashAddress('123 Main Street, Melbourne VIC 3000');

        assert.ok(hashed.includes('3000'), 'Should preserve postcode');
        assert.ok(!hashed.includes('123 Main Street'), 'Should hash street address');
    });

    test('produces consistent hashes', () => {
        const hash1 = hashAddress('123 Main Street, Melbourne VIC 3000');
        const hash2 = hashAddress('123 Main Street, Melbourne VIC 3000');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('handles address without postcode', () => {
        const hashed = hashAddress('Some Street Name');

        assert.ok(typeof hashed === 'string', 'Should return a string');
        assert.ok(hashed.length > 0, 'Should not return empty string');
        assert.ok(!hashed.includes('Some Street Name'), 'Should hash address');
    });

    test('handles various postcode formats', () => {
        const hash1 = hashAddress('Address with 3000');
        const hash2 = hashAddress('Address with 12345');

        assert.ok(hash1.includes('3000'), 'Should preserve 4-digit postcode');
        assert.ok(hash2.includes('12345'), 'Should preserve 5-digit postcode');
    });

    test('different addresses hash differently', () => {
        const hash1 = hashAddress('123 Main Street, Melbourne VIC 3000');
        const hash2 = hashAddress('456 Queen Street, Brisbane QLD 4000');

        assert.notEqual(hash1, hash2, 'Different addresses should hash differently');
    });

    test('hash portion is uppercase', () => {
        const hashed = hashAddress('123 Main Street, Melbourne VIC 3000');
        const hashPart = hashed.split(',')[0];

        if (hashPart) {
            assert.equal(hashPart, hashPart.toUpperCase(), 'Hash should be uppercase');
        }
    });
});

describe('Generic Hashing', () => {
    test('produces consistent hashes', () => {
        const hash1 = hashGeneric('test-value');
        const hash2 = hashGeneric('test-value');

        assert.equal(hash1, hash2, 'Should produce consistent hash');
    });

    test('different values hash differently', () => {
        const hash1 = hashGeneric('value1');
        const hash2 = hashGeneric('value2');

        assert.notEqual(hash1, hash2, 'Different values should hash differently');
    });

    test('respects custom context', () => {
        const hash1 = hashGeneric('value', 'context1');
        const hash2 = hashGeneric('value', 'context2');

        assert.notEqual(hash1, hash2, 'Different contexts should produce different hashes');
    });

    test('respects custom length', () => {
        const hash4 = hashGeneric('value', 'context', 4);
        const hash16 = hashGeneric('value', 'context', 16);

        assert.equal(hash4.length, 4, 'Should respect length parameter');
        assert.equal(hash16.length, 16, 'Should respect length parameter');
    });

    test('returns uppercase hash', () => {
        const hash = hashGeneric('test-value');

        assert.equal(hash, hash.toUpperCase(), 'Hash should be uppercase');
    });
});

describe('HASH_FUNCTIONS Registry', () => {
    test('contains functions for all major PII types', () => {
        assert.ok(HASH_FUNCTIONS['email'], 'Should have email hash function');
        assert.ok(HASH_FUNCTIONS['phone'], 'Should have phone hash function');
        assert.ok(HASH_FUNCTIONS['creditCard'], 'Should have creditCard hash function');
        assert.ok(HASH_FUNCTIONS['ssn'], 'Should have ssn hash function');
        assert.ok(HASH_FUNCTIONS['dateOfBirth'], 'Should have dateOfBirth hash function');
        assert.ok(HASH_FUNCTIONS['address'], 'Should have address hash function');
        assert.ok(HASH_FUNCTIONS['generic'], 'Should have generic hash function');
    });

    test('creditCard variants map to same function', () => {
        assert.equal(HASH_FUNCTIONS['creditCard'], HASH_FUNCTIONS['creditCardVisa']);
        assert.equal(HASH_FUNCTIONS['creditCard'], HASH_FUNCTIONS['creditCardMastercard']);
        assert.equal(HASH_FUNCTIONS['creditCard'], HASH_FUNCTIONS['creditCardAmex']);
        assert.equal(HASH_FUNCTIONS['creditCard'], HASH_FUNCTIONS['creditCardGeneric']);
    });

    test('all functions return strings', () => {
        const testValue = 'test-value';

        Object.entries(HASH_FUNCTIONS).forEach(([type, hashFn]) => {
            const result = hashFn(testValue);
            assert.ok(typeof result === 'string', `${type} should return string`);
            assert.ok(result.length > 0, `${type} should return non-empty string`);
        });
    });
});

describe('getHashFunction Helper', () => {
    test('returns correct function for known types', () => {
        const emailFn = getHashFunction('email');
        const phoneFn = getHashFunction('phone');

        assert.equal(emailFn, HASH_FUNCTIONS.email, 'Should return email hash function');
        assert.equal(phoneFn, HASH_FUNCTIONS.phone, 'Should return phone hash function');
    });

    test('returns generic function for unknown types', () => {
        const unknownFn = getHashFunction('unknown-type');

        assert.equal(unknownFn, HASH_FUNCTIONS.generic, 'Should return generic hash function');
    });

    test('returned function works correctly', () => {
        const hashFn = getHashFunction('email');
        const result = hashFn('test@example.com');

        assert.ok(typeof result === 'string', 'Should return string');
        assert.ok(result.length > 0, 'Should return non-empty string');
    });

    test('handles null and undefined gracefully', () => {
        const nullFn = getHashFunction(null as any);
        const undefinedFn = getHashFunction(undefined as any);

        assert.ok(typeof nullFn === 'function', 'Should return function for null');
        assert.ok(typeof undefinedFn === 'function', 'Should return function for undefined');
    });
});

describe('Edge Cases and Error Handling', () => {
    test('handles empty strings gracefully', () => {
        assert.ok(typeof hashEmail('') === 'string');
        assert.ok(typeof hashPhone('') === 'string');
        assert.ok(typeof hashCreditCard('') === 'string');
        assert.ok(typeof hashSSN('') === 'string');
        assert.ok(typeof hashDateOfBirth('') === 'string');
        assert.ok(typeof hashAddress('') === 'string');
        assert.ok(typeof hashGeneric('') === 'string');
    });

    test('handles whitespace-only strings', () => {
        const value = '   ';
        assert.ok(typeof hashEmail(value) === 'string');
        assert.ok(typeof hashPhone(value) === 'string');
        assert.ok(typeof hashGeneric(value) === 'string');
    });

    test('handles special characters', () => {
        const specialChars = '!@#$%^&*()_+-={}[]|:;<>?,./';
        const hashed = hashGeneric(specialChars);

        assert.ok(typeof hashed === 'string');
        assert.ok(hashed.length > 0);
    });

    test('handles unicode characters', () => {
        const unicode = '测试中文字符🎉🎊';
        const hashed = hashGeneric(unicode);

        assert.ok(typeof hashed === 'string');
        assert.ok(hashed.length > 0);
    });

    test('handles very long strings', () => {
        const longString = 'a'.repeat(10000);
        const hashed = hashGeneric(longString);

        assert.ok(typeof hashed === 'string');
        assert.ok(hashed.length > 0);
    });
});

describe('Performance Tests', () => {
    test('hash functions execute quickly', () => {
        const start = Date.now();

        // Run each hash function 1000 times
        for (let i = 0; i < 1000; i++) {
            generateDeterministicHash('test-value');
            hashEmail('test@example.com');
            hashPhone('+61 412 345 678');
            hashCreditCard('4532 1234 5678 9010');
            hashSSN('123-45-6789');
            hashDateOfBirth('1986-05-28');
            hashAddress('123 Main Street, Melbourne VIC 3000');
            hashGeneric('test-value');
        }

        const end = Date.now();
        const elapsed = end - start;

        // Should complete 8000 hash operations in < 1000ms
        assert.ok(elapsed < 1000, `Hash functions too slow: ${elapsed}ms`);
    });

    test('deterministic hashing is consistent under load', () => {
        const value = 'consistency-test';
        const hashes = new Set<string>();

        // Generate same hash 1000 times
        for (let i = 0; i < 1000; i++) {
            hashes.add(generateDeterministicHash(value));
        }

        // Should only have one unique hash
        assert.equal(hashes.size, 1, 'Should produce consistent hash under load');
    });
});

describe('Hash Collision Resistance', () => {
    test('different inputs produce different hashes', () => {
        const hashes = new Set<string>();

        // Generate hashes for many different inputs
        for (let i = 0; i < 1000; i++) {
            const hash = generateDeterministicHash(`value-${i}`);
            hashes.add(hash);
        }

        // Should have 1000 unique hashes (no collisions)
        assert.equal(hashes.size, 1000, 'Should produce unique hashes for different inputs');
    });

    test('similar inputs produce different hashes', () => {
        const hash1 = generateDeterministicHash('test@example.com');
        const hash2 = generateDeterministicHash('test@example.co');
        const hash3 = generateDeterministicHash('test@example.comm');

        assert.notEqual(hash1, hash2, 'Similar inputs should hash differently');
        assert.notEqual(hash2, hash3, 'Similar inputs should hash differently');
        assert.notEqual(hash1, hash3, 'Similar inputs should hash differently');
    });
});
