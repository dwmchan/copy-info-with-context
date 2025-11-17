# Release Notes - Version 1.4.1

**Release Date:** November 17, 2025

## 🎯 Enhancement: Context-Aware Masking with Confidence Scoring

### Summary

Version 1.4.1 introduces **intelligent confidence-based masking** that eliminates false positives in plain text files while maintaining strong PII protection. The new algorithm analyzes surrounding context to distinguish between actual sensitive data and natural language usage of words like "reference," "policy," and "invoice."

### Problem Solved

**Before v1.4.1:**
```
Input:  "CIB-5625 - Payment Info Reference [10] not displaying"
Output: "CIB-5625 - Payment Info R***e [10] not displaying"  ❌
```
The word "Reference" in ticket descriptions was incorrectly masked as if it were a reference number.

**After v1.4.1:**
```
Input:  "CIB-5625 - Payment Info Reference [10] not displaying"
Output: "CIB-5625 - Payment Info Reference [10] not displaying"  ✅
```
Natural language is preserved, while actual PII is still masked:
```
Input:  "Reference: ABC123456 - Customer verification"
Output: "R***6 - Customer verification"  ✅
```

### Key Features

#### 1. Confidence Scoring Algorithm
- Calculates a confidence score from 0.0 (don't mask) to 1.0 (definitely mask)
- Analyzes 100 characters before and after each potential match
- Uses 9 different contextual factors to make intelligent decisions

#### 2. Smart Context Detection

**Increases Confidence (Should Mask):**
- Clear label patterns: "Reference:", "Ref #:", "Invoice No:" (+0.3)
- Followed by alphanumeric code: "ABC123456" (+0.25)
- Isolated on own line (structured data) (+0.15)
- Key-value pair format with ":" or "=" (+0.2)

**Decreases Confidence (Don't Mask):**
- Natural language context with common words (-0.3)
- Part of ticket/issue ID format like "CIB-5625" (-0.35)
- Descriptive phrase like "Payment Info Reference" (-0.25)
- No structured data following (-0.2)
- Title/header format "Reference - Documentation" (-0.4)

#### 3. Configurable Threshold

New setting: `copyInfoWithContext.maskingConfidenceThreshold`

```json
{
  "copyInfoWithContext.maskingConfidenceThreshold": 0.7  // default
}
```

**Recommended Values:**
- `0.5` - More aggressive (may have some false positives)
- `0.7` - Balanced (recommended for most users)
- `0.9` - Conservative (minimal false positives, may miss some PII)

### Files Modified

#### Code Changes
1. **[maskingEngine.ts](src/utils/maskingEngine.ts)**
   - Added `calculateMaskingConfidence()` function (lines 277-374)
   - Updated `MaskingConfig` interface with `confidenceThreshold` property
   - Integrated confidence scoring into `maskText()` function
   - Each detection now includes actual confidence score

2. **[package.json](package.json)**
   - Version bumped to 1.4.1
   - Added `maskingConfidenceThreshold` configuration property

#### Documentation
3. **[CHANGELOG.md](CHANGELOG.md)**
   - Added v1.4.1 release notes with examples

4. **[README.md](README.md)**
   - Added v1.4.1 feature section at top
   - Updated settings table with new configuration
   - Added confidence scoring to v1.4.0 feature list

#### New Documentation Files
5. **[CONTEXT-AWARE-MASKING-SOLUTION.md](CONTEXT-AWARE-MASKING-SOLUTION.md)**
   - Complete technical documentation
   - Algorithm explanation with all factors
   - Implementation details

6. **[CONFIDENCE-SCORING-EXAMPLES.md](CONFIDENCE-SCORING-EXAMPLES.md)**
   - Visual examples with step-by-step scoring
   - 5 detailed scenarios showing how the algorithm works
   - Confidence scale visualization

7. **[test-data-masking/test-reference-masking.txt](test-data-masking/test-reference-masking.txt)**
   - Real-world ticket data for testing
   - Test cases for various scenarios

### Backward Compatibility

✅ **100% Backward Compatible**
- Default threshold of 0.7 provides balanced behavior
- Existing masking configurations continue to work
- No breaking changes to API or configuration

### Testing

- ✅ TypeScript compilation successful
- ✅ All existing tests pass
- ✅ Real-world ticket data tested
- ✅ Edge cases validated (see CONFIDENCE-SCORING-EXAMPLES.md)

### Migration Guide

**No migration required!** This is an enhancement that works automatically.

**Optional: Adjust threshold if needed**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingConfidenceThreshold": 0.7  // Adjust between 0.0-1.0
}
```

### Use Cases

This enhancement is particularly valuable for:

1. **Bug Tracking Systems** - Copy ticket descriptions without over-masking
2. **Documentation** - Reference natural language examples without false positives
3. **Code Reviews** - Include issue references and comments naturally
4. **Compliance** - Maintain strong PII protection while improving usability

### Performance Impact

- Minimal performance impact (< 1ms per match)
- Context analysis uses simple string operations
- No external dependencies or API calls

### Future Enhancements

Potential improvements for future versions:
- Machine learning-based confidence scoring
- User feedback loop to improve accuracy
- Pattern-specific threshold overrides
- Confidence score visualization in UI
- Export confidence scores for auditing

### Support

- 📖 [Complete Documentation](CONTEXT-AWARE-MASKING-SOLUTION.md)
- 📊 [Visual Examples](CONFIDENCE-SCORING-EXAMPLES.md)
- 🔒 [Data Masking Guide](GUIDE-DATA-MASKING.md)
- 🐛 [Report Issues](https://github.com/dwmchan/copy-info-with-context/issues)

---

**Thank you for using Copy Info with Context!**

Version 1.4.1 continues our commitment to providing intelligent, privacy-focused developer tools.
