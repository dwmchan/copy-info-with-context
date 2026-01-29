const text = `            Customer Information:
            Name: Robert Chen
            Email: robert.chen@company.com
            Phone: +61 407 888 999
            Credit Card: 4532 1234 5678 9010`;

// Current patterns using \s (includes newlines)
const phonePattern = /\b(?:\+?61|0)[2-478](?:[\s-]?\d){8}\b/g;
const creditCardPattern = /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

// Fixed patterns using [ \t] (space and tab only, excludes newlines)
const phonePatternFixed = /\b(?:\+?61|0)[2-478](?:[ \t-]?\d){8}\b/g;
const creditCardPatternFixed = /\b4\d{3}[-\t ]?\d{4}[-\t ]?\d{4}[-\t ]?\d{4}\b/g;

console.log('=== Testing Current Patterns (with \s) ===');
console.log('\nPhone matches:');
const phoneMatches = Array.from(text.matchAll(phonePattern));
phoneMatches.forEach(m => {
    console.log(`  Match: "${m[0].replace(/\n/g, '\n')}" at index ${m.index}, length: ${m[0].length}`);
});

console.log('\nCredit card matches:');
const ccMatches = Array.from(text.matchAll(creditCardPattern));
ccMatches.forEach(m => {
    console.log(`  Match: "${m[0].replace(/\n/g, '\n')}" at index ${m.index}, length: ${m[0].length}`);
});

console.log('\n=== Testing Fixed Patterns (with [ \t]) ===');
console.log('\nPhone matches:');
const phoneMatchesFixed = Array.from(text.matchAll(phonePatternFixed));
phoneMatchesFixed.forEach(m => {
    console.log(`  Match: "${m[0].replace(/\n/g, '\n')}" at index ${m.index}, length: ${m[0].length}`);
});

console.log('\nCredit card matches:');
const ccMatchesFixed = Array.from(text.matchAll(creditCardPatternFixed));
ccMatchesFixed.forEach(m => {
    console.log(`  Match: "${m[0].replace(/\n/g, '\n')}" at index ${m.index}, length: ${m[0].length}`);
});

console.log('\n=== Analysis ===');
if (phoneMatches.length > 0 && phoneMatches.some(m => m[0].includes('\n'))) {
    console.log('❌ Current phone pattern DOES match across newlines!');
} else {
    console.log('✓ Current phone pattern does NOT match across newlines');
}

if (ccMatches.length > 0 && ccMatches.some(m => m[0].includes('\n'))) {
    console.log('❌ Current credit card pattern DOES match across newlines!');
} else {
    console.log('✓ Current credit card pattern does NOT match across newlines');
}
