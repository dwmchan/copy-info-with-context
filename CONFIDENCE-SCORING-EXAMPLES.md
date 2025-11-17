# Confidence Scoring Examples

## How the Algorithm Analyzes Text

### Example 1: ❌ False Positive (Should NOT Mask)
```
Text: "CIB-5625 - CPU-1224 CPU-996 Payment Info Reference [10] not displaying"
Match: "Reference [10]"
```

**Analysis:**
- ✅ Line starts with ticket ID pattern (CIB-5625) → **-0.35**
- ✅ Part of descriptive phrase "Payment Info Reference" → **-0.25**
- ✅ Surrounded by natural language ("Info", "not") → **-0.3**
- ✅ No structured data following (just "[10]" which is short) → **-0.2**
- ⚠️ Pattern-specific check for referenceNumber → **-0.2**
  (No clear "Reference:" label before alphanumeric code)

**Final Score:** 0.5 - 0.35 - 0.25 - 0.3 - 0.2 - 0.2 = **-0.5** → **0.0** (clamped)

**Decision:** ❌ **DO NOT MASK** (0.0 < 0.7 threshold)

---

### Example 2: ✅ True Positive (SHOULD Mask)
```
Text: "Customer Reference: CUS-2024-ABC123 for account verification"
Match: "Reference: CUS-2024-ABC123"
```

**Analysis:**
- ✅ Has clear label pattern "Reference:" → **+0.3**
- ✅ Followed by alphanumeric code "CUS-2024-ABC123" → **+0.25**
- ✅ Key-value pair with ":" separator → **+0.2**

**Final Score:** 0.5 + 0.3 + 0.25 + 0.2 = **1.25** → **1.0** (clamped)

**Decision:** ✅ **MASK** (1.0 > 0.7 threshold)

---

### Example 3: ❌ Natural Language (Should NOT Mask)
```
Text: "Please see the reference documentation for more details"
Match: "reference"
```

**Analysis:**
- ✅ Surrounded by common words ("the", "for") → **-0.3**
- ✅ No structured data following (just "documentation") → **-0.2**
- ✅ Part of descriptive phrase → **-0.25**
- ⚠️ Pattern-specific check (no label+value) → **-0.2**

**Final Score:** 0.5 - 0.3 - 0.2 - 0.25 - 0.2 = **-0.45** → **0.0** (clamped)

**Decision:** ❌ **DO NOT MASK** (0.0 < 0.7 threshold)

---

### Example 4: ✅ Invoice Pattern (SHOULD Mask)
```
Text: "Invoice No: INV-2024-001"
Match: "Invoice No: INV-2024-001"
```

**Analysis:**
- ✅ Has clear label pattern "Invoice" → **+0.3**
- ✅ Followed by alphanumeric code "INV-2024-001" → **+0.25**
- ✅ Key-value pair with ":" separator → **+0.2**

**Final Score:** 0.5 + 0.3 + 0.25 + 0.2 = **1.25** → **1.0** (clamped)

**Decision:** ✅ **MASK** (1.0 > 0.7 threshold)

---

### Example 5: ⚖️ Edge Case - Title/Header
```
Text: "Reference - Employee Handbook Section 3"
Match: "Reference"
```

**Analysis:**
- ✅ Followed by dash (title/header pattern) → **-0.4**
- ✅ No structured data following → **-0.2**
- ⚠️ Pattern-specific check (no label+value) → **-0.2**

**Final Score:** 0.5 - 0.4 - 0.2 - 0.2 = **-0.3** → **0.0** (clamped)

**Decision:** ❌ **DO NOT MASK** (0.0 < 0.7 threshold)

---

## Confidence Threshold Settings

### Threshold: 0.5 (More Aggressive)
- Masks more patterns
- **May have false positives** in natural text
- Good for: Highly sensitive environments where over-masking is acceptable

### Threshold: 0.7 (Balanced - Default)
- Good balance between security and usability
- Minimal false positives
- Good for: Most production environments

### Threshold: 0.9 (Conservative)
- Only masks very clear PII patterns
- **May miss some real PII**
- Good for: Documentation, code reviews, internal tools

---

## Visual Confidence Scale

```
0.0 ──────────── 0.5 ──────────── 0.7 ──────────── 0.9 ──────────── 1.0
│                 │                 │                 │                 │
Natural Language  │              Default           Very Clear       Absolute
(Don't mask)      │              Threshold         PII Pattern      Certainty
                  │              (Balanced)         (Mask)          (Mask)
                  │
              Neutral
             Starting
              Point
```

---

## Context Window Analysis

The algorithm looks at **100 characters** before and after each match:

```
[────────── 100 chars before ──────────][MATCH][────────── 100 chars after ──────────]
                                         ^
                                    Pattern found here
```

**Immediate context (30 chars)** is given more weight for natural language detection.

---

## Special Cases

### Ticket IDs with Descriptions
```
CIB-5625 - CPU-1224 Payment Info Reference [10] not displaying
           ↑
    Detected as ticket format → Reduces confidence for "Reference"
```

### Structured Data Forms
```
Reference Number: ABC123
                 ↑
         Clear label+value → Increases confidence
```

### Column Headers in Data
```
Name        | Email            | Reference Number
John Smith  | john@email.com   | REF-001
                                ↑
                        Should mask (value in data row)
```

### Natural Sentences
```
The reference documentation is available in the wiki
    ↑
Surrounded by common words → Reduces confidence
```
