# GitHub Copilot: Full Refactor of maskingEngine.ts

**Objective:** Reduce `src/utils/maskingEngine.ts` from 927 lines to ~500-550 lines by extracting modules and removing duplication.

**Current State:** maskingEngine.ts contains duplicate code and logic that should be in separate modules.

---

## 🎯 Step 1: Remove Duplicate UI Functions

**File:** `src/utils/maskingEngine.ts`

### Actions:

1. **Delete lines 172-226** (entire STATUS BAR INDICATOR section):
   ```typescript
   // ============================================================================
   // STATUS BAR INDICATOR
   // ============================================================================

   let maskingStatusBarItem: vscode.StatusBarItem | undefined;

   export function updateMaskingStatusBar(result: MaskedResult, config: MaskingConfig): void {
       // ... 55 lines ...
   }

   export function showMaskingNotification(result: MaskedResult, _config: MaskingConfig): void {
       // ... 22 lines ...
   }
   ```

2. **Update imports section** (around line 50):
   - Remove the comment `// remove UI functions from imports`
   - Add UI functions to imports:
   ```typescript
   import {
       // ... existing imports ...

       // CSV utilities
       parseCsvLine,
       shouldMaskColumn,
       detectColumnType,

       // UI functions
       updateMaskingStatusBar,
       showMaskingNotification
   } from './masking';
   ```

3. **Update exports section** (around line 53):
   ```typescript
   export {
       PiiType,
       MaskingStrategy,
       Detection,
       MaskedResult,
       CustomPattern,
       MaskingConfig,
       getMaskingConfig,
       updateMaskingStatusBar,
       showMaskingNotification
   };
   ```

**Result:** Removes 77 duplicate lines, uses existing `ui.ts` module.

---

## 🎯 Step 2: Extract Preset Definitions

**Create new file:** `src/utils/masking/presets.ts`

### Actions:

1. **Create `src/utils/masking/presets.ts`** with content from maskingEngine.ts lines 55-123:

```typescript
// presets.ts - Masking preset configurations for different industries
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts

import { MaskingConfig } from './config';

/**
 * Preset definition for industry-specific masking configurations
 */
export interface PresetDefinition {
    name: string;
    description: string;
    enabledTypes: string[];
}

/**
 * Predefined masking presets for different industries
 */
export const MASKING_PRESETS: Record<string, PresetDefinition> = {
    default: {
        name: 'default',
        description: 'Default masking: common sensitive types enabled',
        enabledTypes: [
            'email',
            'phone',
            'creditCard',
            'ssn',
            'dateOfBirth',
            'passportNumber',
            'driversLicense',
            'nationalID',
            'address'
        ]
    },
    // ... copy all other presets from lines 86-122 ...
};

/**
 * Apply a preset configuration to the masking config
 * Enables only the types specified in the preset
 */
export function applyPreset(config: MaskingConfig): MaskingConfig {
    if (config.preset === 'none' || config.preset === 'custom') {
        return config;
    }

    const preset = MASKING_PRESETS[config.preset];
    if (!preset) {
        return config;
    }

    // Enable only the types in the preset
    const types = { ...config.types };
    for (const key of Object.keys(types)) {
        types[key] = preset.enabledTypes.includes(key);
    }

    return { ...config, types };
}
```

2. **Update `src/utils/masking/index.ts`** - add exports:
```typescript
// Presets
export {
    PresetDefinition,
    MASKING_PRESETS,
    applyPreset
} from './presets';
```

3. **Update `src/utils/maskingEngine.ts`**:
   - Delete lines 55-123 (entire PRESET CONFIGURATIONS section)
   - Add to imports (around line 50):
   ```typescript
   import {
       // ... existing imports ...

       // Presets
       applyPreset
   } from './masking';
   ```

**Result:** Removes 69 lines, better organized presets.

---

## 🎯 Step 3: Extract CDATA Masking Function

**Create new file:** `src/utils/masking/cdata.ts`

### Actions:

1. **Create `src/utils/masking/cdata.ts`** with content from maskingEngine.ts lines 227-339:

```typescript
// cdata.ts - Specialized masking for XML CDATA sections
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts

import { MaskingConfig, Detection, PiiType } from './config';
import { patternFactory } from './patterns';

/**
 * Masks PII patterns in CDATA content with EXACT length preservation
 * This function guarantees that the masked output has the exact same character count as the input
 * to prevent XML corruption when using position-based text replacement.
 *
 * @param cdataContent - The raw CDATA content (without CDATA markers)
 * @param config - Masking configuration
 * @returns Object with maskedText (same length as input) and detections array
 */
export function maskCdataContent(
    cdataContent: string,
    config: MaskingConfig
): { maskedText: string; detections: Detection[] } {
    // ... copy entire function from lines 231-349 ...
}
```

2. **Update `src/utils/masking/index.ts`** - add exports:
```typescript
// CDATA utilities
export {
    maskCdataContent
} from './cdata';
```

3. **Update `src/utils/maskingEngine.ts`**:
   - Delete lines 227-339 (entire DEDICATED CDATA MASKING FUNCTION section)
   - Add to imports (around line 50):
   ```typescript
   import {
       // ... existing imports ...

       // CDATA utilities
       maskCdataContent
   } from './masking';
   ```

**Result:** Removes 113 lines, CDATA logic now in separate module.

---

## 🎯 Step 4: Extract CSV Masking Function

**Create new file:** `src/utils/masking/csv.ts`

### Actions:

1. **Create `src/utils/masking/csv.ts`** with content from maskingEngine.ts lines 795-905:

```typescript
// csv.ts - CSV-specific masking with column-aware detection
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts

import { MaskingConfig, MaskedResult, Detection, PiiType } from './config';
import { parseCsvLine, shouldMaskColumn, detectColumnType } from './csvHelpers';
import { applyPreset } from './presets';

/**
 * Mask sensitive data in CSV text with column-aware detection
 * Detects column headers and masks entire columns based on column names
 *
 * @param text - CSV text to mask
 * @param config - Masking configuration
 * @param headersLine - Optional external header line (for data-only selections)
 * @returns Masked result with detections
 */
export function maskCsvText(
    text: string,
    config: MaskingConfig,
    headersLine?: string
): MaskedResult {
    // ... copy entire function from lines 799-905 ...
}
```

2. **Update `src/utils/masking/index.ts`** - add exports:
```typescript
// CSV masking
export {
    maskCsvText
} from './csv';
```

3. **Update `src/utils/maskingEngine.ts`**:
   - Delete lines 795-905 (entire CSV-SPECIFIC MASKING section)
   - Add to imports (around line 50):
   ```typescript
   import {
       // ... existing imports ...

       // CSV masking
       maskCsvText
   } from './masking';
   ```

4. **Re-export for backward compatibility** (around line 53):
   ```typescript
   export {
       // ... existing exports ...
       maskCsvText
   };
   ```

**Result:** Removes 111 lines, CSV masking logic now in dedicated module.

---

## 🎯 Step 5: Move Function Mapping to maskingFunctions.ts

**File:** `src/utils/masking/maskingFunctions.ts`

### Actions:

1. **Open `src/utils/masking/maskingFunctions.ts`**

2. **Add at the end of the file** (before exports):

```typescript
// ============================================================================
// MASKING FUNCTION REGISTRY
// ============================================================================

/**
 * Central registry mapping PII pattern types to their masking functions
 * Used by the main masking engine to look up the appropriate function
 */
export const MASKING_FUNCTIONS: Record<string, (value: string, strategy: string) => string> = {
    email: maskEmail,
    phone: maskPhone,
    australianPhone: maskPhone,
    ssn: maskSSN,
    dateOfBirth: maskDateOfBirth,

    // Identity Documents
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
```

3. **Update `src/utils/masking/index.ts`** - add export:
```typescript
// Masking functions
export {
    maskGeneric,
    // ... existing exports ...
    MASKING_FUNCTIONS  // ADD THIS
} from './maskingFunctions';
```

4. **Update `src/utils/maskingEngine.ts`**:
   - Delete lines 124-171 (entire MASKING FUNCTIONS section)
   - Add to imports (around line 50):
   ```typescript
   import {
       // ... existing imports ...

       // Masking functions
       maskGeneric,
       maskEmail,
       maskPhone,
       maskSSN,
       maskCreditCard,
       maskAddress,
       maskDateOfBirth,
       maskPassport,
       maskDriversLicense,
       maskNationalID,
       maskAustralianBSB,
       maskAccountNumber,
       maskAustralianTFN,
       maskAustralianABN,
       maskIPAddress,
       MASKING_FUNCTIONS  // ADD THIS
   } from './masking';
   ```

**Result:** Removes 48 lines, function mapping now with function definitions.

---

## 🎯 Step 6: Verify and Test

### Actions:

1. **Check imports in `src/utils/maskingEngine.ts`** are correct:
   ```typescript
   import {
       // Types and configuration
       PiiType,
       MaskingStrategy,
       Detection,
       MaskedResult,
       CustomPattern,
       MaskingConfig,
       getMaskingConfig,

       // Pattern detection
       patternFactory,

       // Confidence scoring
       detectStructureType,
       getAdaptiveThreshold,
       calculateMaskingConfidence,
       isInsideFieldName,

       // Validators
       shouldMaskAsDateOfBirth,

       // Masking functions
       maskGeneric,
       maskEmail,
       maskPhone,
       maskSSN,
       maskCreditCard,
       maskAddress,
       maskDateOfBirth,
       maskPassport,
       maskDriversLicense,
       maskNationalID,
       maskAustralianBSB,
       maskAccountNumber,
       maskAustralianTFN,
       maskAustralianABN,
       maskIPAddress,
       MASKING_FUNCTIONS,

       // CSV utilities
       parseCsvLine,
       shouldMaskColumn,
       detectColumnType,

       // CSV masking
       maskCsvText,

       // CDATA utilities
       maskCdataContent,

       // Presets
       applyPreset,

       // UI functions
       updateMaskingStatusBar,
       showMaskingNotification
   } from './masking';
   ```

2. **Verify exports in `src/utils/maskingEngine.ts`**:
   ```typescript
   export {
       PiiType,
       MaskingStrategy,
       Detection,
       MaskedResult,
       CustomPattern,
       MaskingConfig,
       getMaskingConfig,
       maskText,
       maskCsvText,
       updateMaskingStatusBar,
       showMaskingNotification
   };
   ```

3. **Compile TypeScript**:
   ```bash
   npm run compile
   ```

4. **Check for errors**:
   - Zero TypeScript errors expected
   - All imports should resolve correctly
   - No circular dependencies

5. **Verify line count reduction**:
   ```bash
   wc -l src/utils/maskingEngine.ts
   # Expected: ~500-550 lines (down from 927)
   ```

---

## 📊 Expected Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Total Lines** | 927 | ~500-550 | **-400 lines** |
| **Duplicate Code** | Yes (UI) | No | ✅ Fixed |
| **Module Count** | 1 large file | 4 new modules | ✅ Better organized |
| **Compilation** | ✅ Pass | ✅ Pass | No breaks |

### New File Structure:
```
src/utils/masking/
├── cdata.ts          ← NEW (113 lines)
├── csv.ts            ← NEW (111 lines)
├── presets.ts        ← NEW (69 lines)
├── confidence.ts     (existing)
├── config.ts         (existing)
├── csvHelpers.ts     (existing)
├── index.ts          (updated with new exports)
├── maskingFunctions.ts (updated with MASKING_FUNCTIONS)
├── patterns.ts       (existing)
├── ui.ts             (existing - now used!)
└── validators.ts     (existing)

src/utils/
└── maskingEngine.ts  (~500-550 lines, orchestration only)
```

---

## ⚠️ Important Notes

1. **Copy entire functions** - Don't truncate when moving code between files
2. **Preserve comments** - Keep JSDoc comments and implementation notes
3. **Test after each step** - Run `npm run compile` after each major change
4. **Maintain exports** - Ensure backward compatibility for consumers
5. **Watch for typos** - Import names must match exactly

---

## 🐛 Common Issues

**Issue:** "Cannot find module './masking'"
- **Fix:** Check that `index.ts` exports the new functions

**Issue:** "Module has no exported member 'applyPreset'"
- **Fix:** Verify `presets.ts` exports the function and `index.ts` re-exports it

**Issue:** Circular dependency error
- **Fix:** Ensure `presets.ts` only imports from `config.ts`, not from `index.ts`

**Issue:** "Property 'maskCsvText' does not exist"
- **Fix:** Add `maskCsvText` to both `index.ts` exports and `maskingEngine.ts` re-exports

---

## ✅ Completion Checklist

- [ ] Step 1: UI duplication removed, imports added
- [ ] Step 2: Presets extracted to `presets.ts`
- [ ] Step 3: CDATA extracted to `cdata.ts`
- [ ] Step 4: CSV masking extracted to `csv.ts`
- [ ] Step 5: Function mapping moved to `maskingFunctions.ts`
- [ ] Step 6: All imports verified and TypeScript compiles
- [ ] Line count reduced from 927 to ~500-550
- [ ] No regression in functionality
- [ ] Git commit with message: "refactor: extract maskingEngine modules (927→550 lines)"

---

**End of Instructions**
