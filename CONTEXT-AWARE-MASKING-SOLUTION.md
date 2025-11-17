# Context-Aware Masking Solution

## Problem Summary

When copying plain text files (like ticket lists), the word "Reference" in descriptive phrases like "Payment Info Reference [10]" was being incorrectly masked because the reference number pattern matched:

```regex
/\b(?:Ref|Reference|Invoice)[#:\s-]*(?:No|Number|Num)?[#:\s-]*([A-Z0-9]{6,15})\b/gi
```

This pattern is too aggressive for natural language text where "Reference" might just be a column name or descriptive word, not a PII label.

## Solution: Confidence-Based Masking Algorithm

We've implemented a **context-aware probability scoring system** that calculates a confidence score (0.0 to 1.0) for each potential match before masking it.

### How It Works

The algorithm analyzes the text surrounding each match and assigns points based on various factors:

#### Factors That INCREASE Confidence (Should Mask)
1. **Clear label pattern** (+0.3) - "Reference:", "Ref #:", "Invoice No:"
2. **Followed by code/number** (+0.25) - "Reference ABC123" or "Ref: 12345"
3. **Isolated on own line** (+0.15) - Structured data pattern
4. **Key-value pair** (+0.2) - Has ":" or "=" separator before

#### Factors That DECREASE Confidence (Don't Mask)
1. **Natural language context** (-0.3) - Surrounded by common words (the, a, is, for, etc.)
2. **No structured data following** (-0.2) - No numbers/codes/separators nearby
3. **Part of descriptive phrase** (-0.25) - e.g., "Payment Info Reference"
4. **Followed by dash** (-0.4) - "Reference - Documentation" (title/header pattern)
5. **Part of ticket description** (-0.35) - Line starts with "CIB-5625" pattern

#### Pattern-Specific Adjustments
- For `referenceNumber` pattern specifically, we require BOTH a label AND a value pattern, otherwise reduce confidence by -0.2

### Configuration

The new setting `maskingConfidenceThreshold` controls the minimum confidence required to mask:

```json
{
  "copyInfoWithContext.maskingConfidenceThreshold": 0.7
}
```

**Recommended Values:**
- `0.7` (default) - Balanced protection, good for most use cases
- `0.5` - More aggressive masking, fewer false negatives
- `0.9` - Minimal false positives, may miss some real PII

### Example Results

With the default threshold of 0.7:

✅ **SHOULD be masked (confidence > 0.7):**
```
Reference: ABC123456
Invoice No: INV-2024-001
Customer Ref: CUS12345
```

❌ **Should NOT be masked (confidence < 0.7):**
```
Payment Info Reference [10] not displaying
The reference documentation is available
```

## Files Modified

### 1. `maskingEngine.ts`

#### Added `calculateMaskingConfidence()` function (lines 277-374)
- Analyzes context around each match
- Returns confidence score 0.0 to 1.0
- Pattern-specific logic for reference numbers

#### Updated `MaskingConfig` interface (line 98)
- Added `confidenceThreshold: number` property

#### Updated `getMaskingConfig()` (line 163)
- Reads `maskingConfidenceThreshold` from settings (default: 0.7)

#### Updated `maskText()` pattern matching (lines 891-897)
- Calculates confidence for each match
- Skips matches below threshold
- Stores actual confidence in detection result

### 2. `package.json`

#### Added configuration property (lines 320-326)
```json
"copyInfoWithContext.maskingConfidenceThreshold": {
  "type": "number",
  "default": 0.7,
  "minimum": 0.0,
  "maximum": 1.0,
  "description": "Minimum confidence score (0.0-1.0) required to mask..."
}
```

## Testing

Test file created: `test-reference-masking.txt`

This includes:
- Real ticket data from your example
- Test cases demonstrating when masking should/shouldn't occur
- Various edge cases

## Benefits

1. **Eliminates false positives** - Natural language text is no longer incorrectly masked
2. **Maintains security** - Real PII with clear label+value patterns is still masked
3. **Configurable** - Users can adjust sensitivity via the threshold setting
4. **Transparent** - Confidence scores are stored in detection results for debugging
5. **Context-aware** - Uses multiple signals to make intelligent decisions

## How to Test

1. Enable data masking:
   ```json
   "copyInfoWithContext.enableDataMasking": true,
   "copyInfoWithContext.maskingTypes": {
     "referenceNumber": true
   }
   ```

2. Open `test-reference-masking.txt`

3. Copy the ticket with "Payment Info Reference [10]"

4. Verify that "Reference" is NOT masked in the ticket description

5. Copy the test case "Reference: ABC123456"

6. Verify that this IS masked (shows as "R***6")

## Future Enhancements

Potential improvements:
- Machine learning-based confidence scoring
- User feedback loop to improve accuracy
- Pattern-specific threshold overrides
- Confidence score visualization in UI
- Export confidence scores for auditing

## Technical Notes

- The algorithm starts at confidence 0.5 (neutral)
- Multiple factors can stack (both positive and negative)
- Final confidence is clamped between 0.0 and 1.0
- Each pattern type can have custom logic (currently only `referenceNumber` does)
- The context windows are configurable (currently 100 chars before/after)
