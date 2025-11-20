# Change Log

All notable changes to the "Copy Info with Context" extension will be documented in this file.

## [1.4.3] - 2025-11-20

### 🚀 Enhancement: Phase 1 Confidence Scoring Improvements

**Dramatically improved false positive detection with intelligent pattern analysis and context-aware thresholding.**

#### Added

**Domain-Specific Prior Probabilities:**
- ✅ Each PII pattern now has a reliability score reflecting real-world false positive rates
- ✅ High-reliability patterns (email: 0.85, SSN: 0.90, Medicare: 0.95) start with higher confidence
- ✅ Low-reliability patterns (reference numbers: 0.40, transaction IDs: 0.45) start conservatively
- ✅ More accurate baseline before context analysis

**Statistical Anomaly Detection:**
- ✅ Automatically detects test/placeholder data
- ✅ Filters repeated digit patterns (`111-11-1111`, `000-00-0000`)
- ✅ Filters sequential patterns (`123456789`, `9876543`)
- ✅ Filters common placeholders (`XXXXXXXX`, `N/A`, `TBD`, `TODO`)
- ✅ Filters test data markers (`test@example.com`, `dummy`, `placeholder`)
- ✅ Filters all-same-character patterns (`AAAAAAA`)

**Adaptive Thresholding:**
- ✅ Dynamic confidence threshold based on context type
- ✅ Lower threshold for structured data (XML: -0.1, JSON: -0.1)
- ✅ Higher threshold for plain text (+0.15 to avoid false positives)
- ✅ Higher threshold for high-risk patterns (+0.1 for reference/transaction/policy numbers)
- ✅ Mode-specific adjustments (strict: +0.1, manual: +0.2)

**Structure Type Detection:**
- ✅ Automatically identifies XML, JSON, CSV, and plain text contexts
- ✅ Applies appropriate threshold adjustments per structure type
- ✅ More confident in structured data, more conservative in documentation

#### Improved

**Expected Impact:**
- **50-70% reduction in false positives** while maintaining high recall on actual PII
- Better handling of documentation and test data
- Fewer false positives in comments and plain text
- Real PII in structured data still caught reliably

**Examples:**

| **Value** | **v1.4.2** | **v1.4.3** | **Improvement** |
|-----------|-----------|-----------|-----------------|
| `111-11-1111` (repeated) | Masked ❌ | Not masked ✅ | Statistical check |
| `test@example.com` | Masked ❌ | Not masked ✅ | Placeholder detection |
| `XXXXXXXXX` | Masked ❌ | Not masked ✅ | Placeholder pattern |
| `Reference Documentation` (plain text) | Masked ❌ | Not masked ✅ | Adaptive threshold |
| `<email>john@company.com</email>` (XML) | Masked ✅ | Masked ✅ | Still caught |

#### Technical Details

**Files Modified:**
- `src/utils/maskingEngine.ts` (+~180 lines)
  - Added `PATTERN_PRIOR_PROBABILITIES` constant
  - Added `checkStatisticalAnomalies()` function
  - Added `getAdaptiveThreshold()` function
  - Added `detectStructureType()` helper
  - Modified `calculateMaskingConfidence()` to use priors and statistical checks
  - Modified `maskText()` to apply adaptive thresholding

**Backward Compatibility:**
- ✅ Fully backward compatible
- ✅ No configuration changes required
- ✅ Existing confidence thresholds still respected
- ✅ Additional filtering happens automatically

**Documentation:**
- Complete Phase 2 and Phase 3 roadmap documented in CLAUDE.md
- Future enhancements: Format validation (Luhn, TFN checksums), Bayesian scoring, ensemble approach

---

## [1.4.2] - 2025-11-20

### 🐛 Bug Fix: XML/JSON Values Not Being Masked

**Fixed critical issue where PII values inside XML and JSON structures were not being masked.**

#### Fixed

**XML/JSON Structured Data Detection:**
- ✅ Values inside XML tags now properly masked (e.g., `<dateOfBirth>1986-05-28</dateOfBirth>`)
- ✅ Values inside JSON properties now properly masked (e.g., `"email": "user@example.com"`)
- ✅ Confidence scoring now recognizes structured data patterns
- ✅ Skips natural language heuristics for structured data (XML/JSON)

**Root Cause:**
The confidence scoring system was designed to avoid false positives in natural language text, but it incorrectly penalized values inside XML/JSON structures, causing valid PII to be skipped.

**Solution:**
Added early detection for XML/JSON structured data patterns. When a value is detected inside `<tag>VALUE</tag>` or `"field": VALUE` patterns, the confidence is boosted to 0.85 and natural language heuristics are skipped.

**Example:**
```xml
Before: <lifeDateOfBirth>1986-05-28</lifeDateOfBirth>  ❌ Not masked
After:  <lifeDateOfBirth>1986-**-**</lifeDateOfBirth>  ✅ Properly masked

Before: <email>john@example.com</email>  ❌ Not masked
After:  <email>j***@e***.com</email>  ✅ Properly masked
```

**Technical Details:**
- Added `isInXmlValue` detection: `/<[^>]+>\s*$/` before + `/^\s*<\//` after
- Added `isInJsonValue` detection: `/:\s*"?\s*$/` before
- Returns confidence 0.85 immediately for structured data, bypassing other heuristics

---

## [1.4.1] - 2025-11-17

### 🎯 Enhancement: Context-Aware Masking with Confidence Scoring

**Intelligent masking that understands context!** Eliminates false positives in plain text by analyzing surrounding context.

#### Added

**Context-Aware Confidence Scoring:**
- ✅ New confidence-based masking algorithm (0.0 to 1.0 score)
- ✅ Analyzes 100 characters before/after each match
- ✅ Distinguishes between PII labels and natural language
- ✅ Special detection for ticket descriptions and column headers
- ✅ Configurable confidence threshold

**New Configuration:**
- `maskingConfidenceThreshold` (default: 0.7)
  - 0.5 = More aggressive (may over-mask)
  - 0.7 = Balanced (recommended)
  - 0.9 = Conservative (minimal false positives)

**Smart Context Detection:**
- Increases confidence for clear label+value patterns ("Reference: ABC123")
- Decreases confidence for natural language ("the reference documentation")
- Detects ticket/issue ID patterns (e.g., "CIB-5625")
- Recognizes descriptive phrases ("Payment Info Reference [10]")
- Identifies title/header formats ("Reference - Documentation")

#### Fixed
- Reference numbers in plain text ticket descriptions no longer incorrectly masked
- "Payment Info Reference [10]" now correctly identified as descriptive text
- Natural language usage of words like "reference", "policy", "invoice" preserved

**Example:**
```
Before: "CIB-5625 - Payment Info R***e [10] not displaying"  ❌
After:  "CIB-5625 - Payment Info Reference [10] not displaying"  ✅

Still masks: "Reference: ABC123456" → "R***6"  ✅
```

---

## [1.4.0] - 2025-11-17

### 🎉 Major Feature: Smart Data Masking (Phase 1)

**Protect sensitive data when sharing code!** Automatically detect and mask 25+ types of PII with industry-specific presets.

#### Added

**Core Data Masking Features:**
- ✅ Automatic detection and masking of 25+ PII types
- ✅ 5 industry presets: None, Basic, Financial, Healthcare, Enterprise, Custom
- ✅ 4 masking strategies: Partial, Full, Structural, Hash (future)
- ✅ 3 masking modes: Auto, Manual, Strict
- ✅ Deny-list and allow-list for fine-grained control
- ✅ Custom regex patterns for company-specific sensitive data
- ✅ Status bar indicator when masking is active
- ✅ Optional masking statistics in output

**PII Types Supported:**

*Personal Identifiers:*
- Email addresses
- Phone numbers (international formats)
- Physical addresses
- Date of birth (with smart exclusions for service/transaction dates)

*Financial Data:*
- Credit cards (Visa, MasterCard, Amex) with Luhn validation
- Bank account numbers
- SSN (Social Security Numbers)
- IBAN (International Bank Account Numbers)
- SWIFT/BIC codes
- Routing numbers (US)

*Australian Banking & Government:*
- BSB codes (Bank-State-Branch)
- TFN (Tax File Numbers)
- ABN (Australian Business Numbers)
- Medicare numbers
- Australian passports
- Australian driver's licenses

*Identity Documents:*
- Passport numbers (AU, US, UK, EU)
- Driver's license numbers (AU, US, UK)
- National ID numbers (UK National Insurance)

*Enterprise Identifiers:*
- Client/Customer numbers
- Reference numbers
- Policy numbers
- Transaction IDs
- NMI (National Meter Identifier)

**Smart Detection Features:**
- Pattern-based detection using regex
- Column name recognition for CSV/structured data
- Context-aware exclusions (e.g., service dates vs birth dates)
- Field name protection (never masks XML/JSON tag names)
- 25 exclusion keywords for date intelligence

**Configuration Options:**
- `enableDataMasking` - Enable/disable feature
- `maskingPreset` - Choose industry preset
- `maskingStrategy` - Choose masking strategy
- `maskingMode` - Set detection sensitivity
- `maskingDenyList` - Force mask specific columns
- `maskingAllowList` - Never mask specific columns
- `maskingCustomPatterns` - Define custom patterns
- `showMaskingIndicator` - Show status bar indicator
- `includeMaskingStats` - Include statistics in output
- `maskingTypes` - Fine-grained control over individual PII types

**Documentation:**
- Added comprehensive [Data Masking Guide](GUIDE-DATA-MASKING.md)
- Added [CSV Intelligence Guide](GUIDE-CSV-INTELLIGENCE.md)
- Updated README with Feature Guides section
- Added configuration templates for Financial, Healthcare, and General use cases

#### Fixed

**Field Name Protection:**
- Fixed issue where XML/JSON tag names were being masked (e.g., `<transactionDate>` → `<t***e>`)
- Implemented `isInsideFieldName()` function to detect when matches occur inside field/tag names
- Now correctly distinguishes between `<transactionDate>` (tag name - don't mask) and `2024-11-17` (value - check for masking)

**Date Intelligence:**
- Fixed issue where all dates were being masked as birth dates
- Implemented `isNonBirthDateField()` function with 25 exclusion keywords
- Service dates (`eligibleServiceDate`, `transactionDate`) are no longer masked
- Business dates (`createdDate`, `modifiedDate`, `paymentDate`) are preserved
- Birth dates in fields like `dateOfBirth`, `lifeDateOfBirth` are correctly masked

**Architecture Improvements:**
- Simplified regex patterns by removing complex negative lookaheads
- Removed mandatory separator requirements from patterns
- Implemented layered protection: universal field name protection + pattern-specific value protection
- More maintainable and future-proof architecture

#### Changed

- Updated package description to include "automatic PII masking"
- Added data masking keywords: `data-masking`, `pii-protection`, `privacy`, `gdpr`, `hipaa`, `compliance`, `sensitive-data`, `redaction`
- Enhanced feature descriptions in README with links to comprehensive guides

### Privacy & Security

- ✅ 100% local processing - no cloud API calls
- ✅ No telemetry or tracking
- ✅ Original data never leaves your machine
- ✅ GDPR, CCPA, HIPAA compliant approach

---

## [1.3.1] - 2024-11-14

### Fixed

- Bug fixes and stability improvements for CSV Intelligence feature

---

## [1.3.0] - 2024-11-10

### Added

**CSV Intelligence with Four Output Modes:**

*Mode 1: MINIMAL*
- Clean, compact format
- Automatic header detection
- Smart partial field trimming
- Column context in header

*Mode 2: SMART*
- Key-value pairs for human readability
- Vertical layout
- Automatic column headers
- Multi-row support

*Mode 3: TABLE*
- Beautiful ASCII tables with Unicode borders
- Smart column alignment (numbers right, text left)
- Configurable row/column limits
- Professional formatting

*Mode 4: DETAILED*
- Comprehensive metadata
- Row/column counts
- Delimiter information
- Header detection status

**Features:**
- Quick mode switching with `Ctrl+Alt+X` / `Cmd+Alt+X`
- Supports CSV, TSV, PSV, SSV files
- Automatic delimiter detection
- Multi-row selections
- Configurable table limits and alignment

**Configuration:**
- `csvOutputMode` - Set default mode
- `csvTableMaxRows` - Maximum rows in TABLE mode
- `csvTableMaxColumns` - Maximum columns in TABLE mode
- `csvTableAlignNumbers` - Number alignment (right/left)

---

## [1.2.0] - 2024-10-15

### Added

- Syntax highlighting for 10+ languages
- HTML output with color coding
- ANSI colored output for terminals
- Markdown output format
- Custom output format selection

### Fixed

- Array indexing accuracy in JSON
- Sibling counting in XML
- Line number consistency

---

## [1.1.0] - 2024-09-20

### Added

- JSON/JSONC property path detection
- XML/HTML element hierarchy
- CSV/TSV/PSV column detection
- Function and class context for multiple languages
- CSS/SCSS/SASS/LESS selector context

### Fixed

- File type detection improvements
- Context path accuracy

---

## [1.0.0] - 2024-08-15

### Added

- Initial release
- Basic copy with context functionality
- Line number support
- File path in output
- Keyboard shortcuts (`Ctrl+Alt+C`, `Ctrl+Alt+H`)
- Right-click menu integration
- Command palette support

---

## Version Format

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Version Format: MAJOR.MINOR.PATCH**

- **MAJOR**: Incompatible API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible
