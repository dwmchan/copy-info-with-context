# Change Log

All notable changes to the "Copy Info with Context" extension will be documented in this file.

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
