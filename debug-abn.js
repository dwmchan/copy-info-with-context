// Debug script to trace ABN validation for '61824753556'

function abnCheck(s) {
    const digits = (s || '').toString().replace(/\D/g, '');
    console.log('Input:', s);
    console.log('Digits:', digits);
    console.log('Length:', digits.length);

    if (digits.length !== 11) {
        console.log('INVALID: Length not 11');
        return false;
    }

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    console.log('Weights:', weights);

    let sum = 0;
    const firstAdjusted = parseInt(digits[0] ?? '0', 10) - 1;
    console.log('First digit:', digits[0], '→ adjusted:', firstAdjusted);

    const firstContribution = firstAdjusted * (weights[0] ?? 0);
    console.log('First contribution:', firstAdjusted, '×', weights[0], '=', firstContribution);
    sum += firstContribution;

    console.log('\nRemaining digits:');
    for (let i = 1; i < digits.length; i++) {
        const digit = parseInt(digits[i] ?? '0', 10);
        const weight = weights[i] ?? 0;
        const contribution = digit * weight;
        console.log(`Position ${i}: digit=${digit}, weight=${weight}, contribution=${contribution}`);
        sum += contribution;
    }

    console.log('\nTotal sum:', sum);
    console.log('Sum mod 89:', sum % 89);
    console.log('Result:', sum % 89 === 0 ? 'VALID' : 'INVALID');

    return sum % 89 === 0;
}

// Test the failing case
console.log('=== Testing ABN: 61824753556 ===\n');
const result = abnCheck('61824753556');
console.log('\nFinal result:', result);

console.log('\n=== Testing valid ABN: 51824753556 ===\n');
const validResult = abnCheck('51824753556');
console.log('\nFinal result:', validResult);
