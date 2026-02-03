# GitHub Copilot ESLint Fix Instructions

## Issue Summary
`npm test` reports 24 linting problems (16 errors, 8 warnings) that need to be fixed.

---

## Critical Errors (Must Fix - 16 total)

### File: `src/utils/maskingEngine.ts`

**Problem**: 16 unused import errors

#### Error 1: Unused 'vscode' import (Line 3)
```typescript
// CURRENT (Line 3):
import * as vscode from 'vscode';

// FIX:
// Remove this line entirely - 'vscode' is never used in this file
```

**Action**: Delete line 3

---

#### Errors 2-16: Unused masking function imports (Lines 30-46)

```typescript
// CURRENT (Lines 28-46):
import {
    maskGeneric,
    maskEmail,        // ← UNUSED (Line 30)
    maskPhone,        // ← UNUSED (Line 31)
    maskSSN,          // ← UNUSED (Line 32)
    maskCreditCard,   // ← UNUSED (Line 33)
    maskAddress,      // ← UNUSED (Line 34)
    maskDateOfBirth,  // ← UNUSED (Line 35)
    maskPassport,     // ← UNUSED (Line 36)
    maskDriversLicense, // ← UNUSED (Line 37)
    maskNationalID,   // ← UNUSED (Line 38)
    maskAustralianBSB, // ← UNUSED (Line 39)
    maskAccountNumber, // ← UNUSED (Line 40)
    maskAustralianTFN, // ← UNUSED (Line 41)
    maskAustralianABN, // ← UNUSED (Line 42)
    maskIPAddress,    // ← UNUSED (Line 43)
    MASKING_FUNCTIONS
} from './masking/maskingFunctions';
import {
    parseCsvLine,     // ← UNUSED (Line 46)
    detectColumnType,
    detectHeaders,
    getColumnRangeFromSelection,
    buildAsciiTable
} from './masking/csvHelpers';
```

**Fix Option 1 - Remove unused imports**:
```typescript
// FIXED:
import {
    maskGeneric,
    MASKING_FUNCTIONS
} from './masking/maskingFunctions';
import {
    detectColumnType,
    detectHeaders,
    getColumnRangeFromSelection,
    buildAsciiTable
} from './masking/csvHelpers';
```

**Fix Option 2 - If these ARE actually used somewhere**:
Check if these functions are used elsewhere in the file (search for each function name).
If they are used, the linter may be incorrectly flagging them. In that case, check:
1. Are they used in exported functions?
2. Are they re-exported?
3. Are they used in type definitions only?

**Recommended Action**:
- Search `maskingEngine.ts` for usage of each flagged function
- If truly unused, remove them from the import statement
- If used, investigate why linter thinks they're unused

---

## Warnings (Optional - 8 total)

### Non-null assertion warnings in multiple files

**Files affected**:
- `src/commands/copyWithContext.ts` (lines 110, 214, 244)
- `src/utils/jsonContext.ts` (lines 104, 118, 141)
- `src/utils/masking/csvHelpers.ts` (line 109)
- `src/utils/xmlContext.ts` (line 206)

**Warning type**: `@typescript-eslint/no-non-null-assertion`

**What it means**: Using the non-null assertion operator `!` is discouraged

**Example pattern**:
```typescript
// WARNING:
const value = someObject.property!;
match.index!

// SAFER:
const value = someObject.property ?? defaultValue;
if (match.index !== undefined) {
    const value = match.index;
}
```

**Note**: These are warnings, not errors. The code will still compile and run correctly. Fixing these is optional but improves code safety.

---

## Fix Priority

### High Priority (Blocks npm test):
1. ✅ Remove unused `vscode` import from `maskingEngine.ts` (line 3)
2. ✅ Remove unused masking function imports from `maskingEngine.ts` (lines 30-43)
3. ✅ Remove unused `parseCsvLine` import from `maskingEngine.ts` (line 46)

### Low Priority (Optional improvements):
4. ⚠️ Replace non-null assertions with safer checks (8 warnings across 4 files)

---

## Verification Commands

After making changes, run:

```bash
# Check if linting passes
npm run lint

# Full test including compile + lint
npm test
```

**Expected output after fix**:
```
✓ No linting errors
✓ 8 warnings may remain (non-null assertions - optional)
```

---

## Notes

- The unused imports suggest `maskingEngine.ts` may have been refactored
- Functions might be imported for re-export but not used directly
- Check if `MASKING_FUNCTIONS` object contains these functions
- If functions are in `MASKING_FUNCTIONS`, they don't need individual imports
- The `vscode` import is definitely safe to remove (not used anywhere)
