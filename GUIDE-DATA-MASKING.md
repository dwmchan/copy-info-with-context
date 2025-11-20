# Data Masking Guide

> **Complete guide to the Data Masking feature** - Automatically detect and mask PII (Personally Identifiable Information) when copying code, data, and configuration files.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Supported PII Types](#supported-pii-types)
- [Masking Strategies](#masking-strategies)
- [Industry Presets](#industry-presets)
- [Configuration](#configuration)
- [Advanced Features](#advanced-features)
- [Use Cases](#use-cases)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Privacy & Security](#privacy--security)
- [Examples](#examples)

---

## Overview

The **Data Masking** feature automatically detects and masks sensitive personal information (PII) when copying code, data files, or configuration snippets. This ensures compliance with privacy regulations (GDPR, CCPA, HIPAA) while allowing you to share real-world examples.

**What it does:**
- ✅ Detects 25+ types of PII automatically
- ✅ Works with CSV, JSON, XML, plain text, and code files
- ✅ Provides 4 masking strategies (partial, full, structural, hash)
- ✅ Offers industry-specific presets (Financial, Healthcare, Enterprise)
- ✅ Supports custom patterns for company-specific data
- ✅ 100% local processing - no cloud, no telemetry

**What it protects:**
- Personal information (email, phone, address, date of birth)
- Financial data (credit cards, bank accounts, SSN)
- Australian banking (BSB, TFN, ABN, Medicare)
- Identity documents (passports, driver's licenses, national IDs)
- Enterprise identifiers (client numbers, transaction IDs, policy numbers)
- International banking (IBAN, SWIFT/BIC)

---

## Quick Start

### Enable Data Masking

**Step 1: Open Settings**
- Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
- Or: `File` → `Preferences` → `Settings`

**Step 2: Search for "masking"**

**Step 3: Enable the feature**
```json
{
  "copyInfoWithContext.enableDataMasking": true
}
```

**Step 4: Choose a preset (optional)**
```json
{
  "copyInfoWithContext.maskingPreset": "financial"
}
```

**Step 5: Copy as usual**
- Select text with sensitive data
- Press `Ctrl+Alt+C` (or `Cmd+Alt+C` on Mac)
- Sensitive data is automatically masked!

### Example

**Before (Original Data):**
```csv
Name,Email,Phone,BSB,AccountNo
John Doe,john.doe@example.com,0412 345 678,123-456,987654321
```

**After (Masked - Partial Strategy):**
```csv
Name,Email,Phone,BSB,AccountNo
John Doe,j***@e***.com,0*** *** ***,***-*56,***321
```

---

## Supported PII Types

### Personal Identifiers

| Type | Example | Masked (Partial) | Detection |
|------|---------|------------------|-----------|
| **Email** | `john.doe@example.com` | `j***@e***.com` | Pattern + Column name |
| **Phone** | `0412 345 678` | `0*** *** ***` | Pattern + Column name |
| **Address** | `123 Main Street, Melbourne VIC 3000` | `[ADDRESS REDACTED]` | Column name only |
| **Date of Birth** | `1986-05-28` | `1986-**-**` | Pattern (YYYY-MM-DD) + Context |

**Column Patterns for Address:**
- `address`, `street`, `addr`, `location`, `residence`, `mailing`

**Column Patterns for Date of Birth:**
- `dob`, `dateofbirth`, `birthdate`, `birthday`, `date_of_birth`

**Date Exclusions** (won't mask):
- Service dates (`eligibleServiceDate`, `serviceStartDate`)
- Transaction dates (`transactionDate`, `effectiveDate`)
- System dates (`createdDate`, `modifiedDate`, `paymentDate`)
- 25+ other business date types

---

### Financial Data

| Type | Example | Masked (Partial) | Detection |
|------|---------|------------------|-----------|
| **Credit Card (Visa)** | `4532 1234 5678 9010` | `**** **** **** **10` | Luhn algorithm |
| **Credit Card (MasterCard)** | `5425 2334 3010 9903` | `**** **** **** **03` | Luhn algorithm |
| **Credit Card (Amex)** | `3782 822463 10005` | `**** ****** *0005` | Luhn algorithm |
| **SSN** | `123-45-6789` | `***-**-6789` | Pattern |
| **Account Number** | `987654321` | `***321` | Pattern + Column name |
| **IBAN** | `GB29NWBK60161331926819` | `GB**************6819` | Pattern |
| **SWIFT/BIC** | `NWBKGB2L` | `N*****2L` | Pattern |
| **Routing Number** | `021000021` | `***021` | Pattern (US only) |

**Column Patterns for Account Numbers:**
- `account`, `accountno`, `acct`, `accountnumber`, `bankaccount`

---

### Australian Banking & Government

| Type | Example | Masked (Partial) | Detection |
|------|---------|------------------|-----------|
| **BSB** | `123-456` | `***-*56` | Pattern + Column name |
| **TFN** | `123 456 789` | `*** *** ***` | Pattern |
| **ABN** | `12 345 678 901` | `** *** *** ***` | Pattern |
| **Medicare** | `2234 56789 1` | `**** ***** *` | Pattern |
| **Passport** | `N1234567` | `N*****7` | Pattern (A + 7 digits) |
| **Driver's License** | `NSW12345` | `N*****5` | Pattern + Column name |

**Column Patterns for BSB:**
- `bsb`, `bsbcode`, `bsb_code`, `bankcode`, `bank_code`

**Column Patterns for TFN:**
- `tfn`, `taxfile`, `taxfilenumber`, `tax_file_number`

**Column Patterns for Medicare:**
- `medicare`, `medicareno`, `medicarenumber`, `medicare_number`

---

### Identity Documents

| Type | Example | Masked (Partial) | Detection |
|------|---------|------------------|-----------|
| **Passport (AU)** | `N1234567` | `N*****7` | Pattern: A + 7 digits |
| **Passport (US)** | `123456789` | `1*******9` | Pattern: 9 digits |
| **Passport (UK)** | `123456789` | `1*******9` | Pattern: 9 digits |
| **Driver's License (AU)** | `NSW12345` | `N*****5` | Pattern + Column name |
| **Driver's License (US)** | `DL A1234567` | `A******7` | Pattern + Column name |
| **Driver's License (UK)** | `SMITH751234AB5CD` | `S**********5CD` | Pattern (specific format) |
| **National ID (UK)** | `AB123456C` | `AB****56C` | Pattern: AA999999A |

**Column Patterns for Passports:**
- `passport`, `passportno`, `passportnumber`, `travel_document`

**Column Patterns for Driver's License:**
- `license`, `licence`, `driverslicense`, `drivers_license`, `dl`

**Column Patterns for National ID:**
- `nationalid`, `national_id`, `identitycard`, `id_card`, `idno`

---

### Enterprise Identifiers

| Type | Example | Masked (Partial) | Detection |
|------|---------|------------------|-----------|
| **Client Number** | `CUST-00012345` | `C***5` | Pattern + Column name |
| **Customer Number** | `CUSTOMER-789456` | `C***6` | Pattern + Column name |
| **Reference Number** | `REF-ABC123XYZ` | `R***Z` | Pattern + Column name |
| **Policy Number** | `POL-123456789` | `P***9` | Pattern + Column name |
| **Transaction ID** | `TXN-ABC12345678` | `T***8` | Pattern + Column name |
| **NMI** | `1234567890` | `1*******90` | Pattern (10 digits) + Column name |

**Column Patterns for Client/Customer Numbers:**
- `client`, `customer`, `clientno`, `customerno`, `account`, `member`

**Column Patterns for NMI:**
- `nmi`, `meterid`, `meter_id`, `nationalmeternumber`

---

### Detection Methods

**1. Pattern-Based Detection**
- Uses regex patterns to match common formats
- Examples: Email (`\S+@\S+\.\S+`), Phone (`\+?\d[\d\s-()]{8,}`), Credit Card (Luhn validation)

**2. Column Name Detection**
- Analyzes CSV/JSON/XML field names to identify sensitive columns
- Case-insensitive matching with common variations
- Examples: `email`/`Email`/`EMAIL`, `bsb`/`BSB`/`bsb_code`

**3. Context-Aware Detection**
- For date of birth: excludes service/transaction dates using 25 exclusion keywords
- For field names: never masks XML/JSON tag names, only values
- Smart enough to distinguish `<transactionDate>` (tag) from `2024-11-17` (value)

---

## Masking Strategies

### 1. Partial (Default) - Recommended

**Shows:** First and last few characters, masks the middle

**Best for:** Human readability while protecting data

**Examples:**

| Original | Masked |
|----------|--------|
| `john.doe@example.com` | `j***@e***.com` |
| `0412 345 678` | `0*** *** ***` |
| `123-456` (BSB) | `***-*56` |
| `987654321` (Account) | `***321` |
| `4532 1234 5678 9010` (Visa) | `**** **** **** **10` |
| `1986-05-28` (DOB) | `1986-**-**` |
| `N1234567` (Passport) | `N*****7` |

**When to use:**
- ✅ Bug reports with context
- ✅ Documentation
- ✅ Code reviews
- ✅ Training materials

---

### 2. Full - Maximum Security

**Shows:** Nothing - complete replacement with `***`

**Best for:** Maximum privacy, zero data leakage

**Examples:**

| Original | Masked |
|----------|--------|
| `john.doe@example.com` | `***` |
| `0412 345 678` | `***` |
| `123-456` (BSB) | `***` |
| `987654321` (Account) | `***` |
| `4532 1234 5678 9010` (Visa) | `***` |
| `1986-05-28` (DOB) | `***` |

**When to use:**
- ✅ Public documentation
- ✅ Open-source examples
- ✅ External training
- ✅ GDPR/CCPA strict compliance

**Configuration:**
```json
{
  "copyInfoWithContext.maskingStrategy": "full"
}
```

---

### 3. Structural - Format Preservation

**Shows:** Format/structure, masks content

**Best for:** Understanding data format while protecting values

**Examples:**

| Original | Masked |
|----------|--------|
| `john.doe@example.com` | `****@****.***` |
| `0412 345 678` | `**** *** ***` |
| `123-456` (BSB) | `***-***` |
| `4532 1234 5678 9010` (Visa) | `**** **** **** ****` |
| `1986-05-28` (DOB) | `****-**-28` (shows day) |

**When to use:**
- ✅ Testing format validation
- ✅ Data migration planning
- ✅ Understanding data structure
- ✅ Regex pattern development

**Configuration:**
```json
{
  "copyInfoWithContext.maskingStrategy": "structural"
}
```

---

### 4. Hash - Deterministic Masking

**Shows:** Cryptographic hash (future implementation)

**Best for:** Consistency across multiple documents, referencing same entity

**Examples (Future):**

| Original | Masked |
|----------|--------|
| `john.doe@example.com` | `#A3F8B2E4` |
| `0412 345 678` | `#7C9D1F5A` |

**When to use (Future):**
- ✅ Cross-referencing records
- ✅ Data analysis with consistent IDs
- ✅ Debugging with traceable entities

**Status:** ⏳ Reserved for Phase 2

---

## Industry Presets

### None (Default)

**What it does:** Disables all automatic masking

**When to use:** Internal development, non-sensitive data

**Configuration:**
```json
{
  "copyInfoWithContext.maskingPreset": "none"
}
```

---

### Basic - Email & Phone Only

**What it masks:**
- ✅ Email addresses
- ✅ Phone numbers

**What it skips:**
- ❌ Financial data
- ❌ Government identifiers
- ❌ Enterprise IDs

**When to use:** General communication, low-sensitivity data

**Configuration:**
```json
{
  "copyInfoWithContext.maskingPreset": "basic"
}
```

---

### Financial - Banking & Credit

**What it masks:**
- ✅ Email, Phone, Address
- ✅ Credit Cards (Visa, MasterCard, Amex)
- ✅ Bank Account Numbers
- ✅ BSB codes (Australia)
- ✅ IBAN, SWIFT/BIC
- ✅ SSN, Routing Numbers
- ✅ TFN, ABN (Australia)

**What it skips:**
- ❌ Medical data
- ❌ Passports
- ❌ Enterprise reference numbers

**When to use:** Banking, fintech, payment processing

**Configuration:**
```json
{
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

**Example:**
```csv
// Before:
Name,Email,BSB,AccountNo,CreditCard
John Doe,john@example.com,123-456,987654321,4532123456789010

// After:
Name,Email,BSB,AccountNo,CreditCard
John Doe,j***@e***.com,***-*56,***321,**** **** **** **10
```

---

### Healthcare - Medical & Patient Data

**What it masks:**
- ✅ Email, Phone, Address
- ✅ Date of Birth (with smart exclusions)
- ✅ Medicare Numbers
- ✅ SSN
- ✅ Patient identifiers
- ✅ Medical record numbers

**What it skips:**
- ❌ Credit cards (unless also sensitive in your context)
- ❌ Enterprise transaction IDs

**When to use:** Hospitals, clinics, health tech, HIPAA compliance

**Configuration:**
```json
{
  "copyInfoWithContext.maskingPreset": "healthcare",
  "copyInfoWithContext.maskingStrategy": "full"
}
```

**Example:**
```csv
// Before:
PatientName,DateOfBirth,Medicare,Email
Sarah Mitchell,1975-08-22,3345 67890 2,sarah@example.com

// After:
PatientName,DateOfBirth,Medicare,Email
Sarah Mitchell,***,***,***
```

---

### Enterprise - Comprehensive Protection

**What it masks:**
- ✅ **All personal identifiers** (email, phone, address, DOB)
- ✅ **All financial data** (cards, accounts, BSB, IBAN, SSN, TFN, ABN)
- ✅ **All identity documents** (passports, licenses, national IDs)
- ✅ **All enterprise IDs** (client numbers, transactions, policies)
- ✅ **All international banking** (SWIFT, routing, NMI)

**When to use:** Maximum protection, multi-industry platforms, compliance-first

**Configuration:**
```json
{
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

---

### Custom - Define Your Own

**What it does:** Disables presets, only masks based on your deny-list and custom patterns

**When to use:** Company-specific patterns, unique data types

**Configuration:**
```json
{
  "copyInfoWithContext.maskingPreset": "custom",
  "copyInfoWithContext.maskingDenyList": [
    "InternalID",
    "EmployeeNumber",
    "ProjectCode"
  ],
  "copyInfoWithContext.maskingCustomPatterns": [
    {
      "name": "Employee ID",
      "pattern": "EMP-\\d{6}",
      "replacement": "EMP-######",
      "enabled": true
    }
  ]
}
```

---

## Configuration

### Quick Configuration Templates

#### Template 1: Financial Services (Recommended)

```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.maskingMode": "auto",
  "copyInfoWithContext.showMaskingIndicator": true,
  "copyInfoWithContext.includeMaskingStats": false,
  "copyInfoWithContext.maskingDenyList": [
    "BSB",
    "Account Number",
    "Client ID",
    "Customer Number"
  ]
}
```

#### Template 2: Healthcare (HIPAA Compliant)

```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "healthcare",
  "copyInfoWithContext.maskingStrategy": "full",
  "copyInfoWithContext.maskingMode": "strict",
  "copyInfoWithContext.showMaskingIndicator": true,
  "copyInfoWithContext.includeMaskingStats": true,
  "copyInfoWithContext.maskingDenyList": [
    "PatientID",
    "MedicalRecordNumber",
    "MRN",
    "Date of Birth",
    "Medicare"
  ]
}
```

#### Template 3: General Development

```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "basic",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.maskingMode": "auto",
  "copyInfoWithContext.showMaskingIndicator": false,
  "copyInfoWithContext.includeMaskingStats": false
}
```

---

### Complete Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableDataMasking` | boolean | `false` | Enable/disable data masking feature |
| `maskingPreset` | string | `"none"` | Industry preset: `none`, `basic`, `financial`, `healthcare`, `enterprise`, `custom` |
| `maskingStrategy` | string | `"partial"` | Masking strategy: `partial`, `full`, `structural`, `hash` |
| `maskingMode` | string | `"auto"` | Detection sensitivity: `auto`, `manual`, `strict` |
| `maskingDenyList` | array | `[]` | Column names to ALWAYS mask (e.g., `["email", "ssn"]`) |
| `maskingAllowList` | array | `[]` | Column names to NEVER mask (overrides auto-detection) |
| `showMaskingIndicator` | boolean | `true` | Show status bar indicator when masking is active |
| `includeMaskingStats` | boolean | `false` | Include statistics in clipboard (e.g., "6 items masked") |
| `maskingCustomPatterns` | array | `[]` | Custom regex patterns for company-specific data |
| `maskingTypes` | object | (varies) | Fine-grained control over individual PII types |

---

### Masking Modes

#### Auto Mode (Default) - Balanced

**Behavior:**
- Detects patterns automatically
- Uses column names for context
- Applies exclusions (e.g., service dates)
- Recommended for most users

**Example:**
```csv
Email,ServiceDate,DateOfBirth
john@example.com,2024-11-17,1986-05-28
```

**Result:**
- Email: ✅ Masked (`j***@e***.com`)
- ServiceDate: ❌ Not masked (exclusion keyword "service")
- DateOfBirth: ✅ Masked (`1986-**-**`)

**Configuration:**
```json
{
  "copyInfoWithContext.maskingMode": "auto"
}
```

---

#### Manual Mode - Deny-List Only

**Behavior:**
- **Only masks columns in deny-list**
- Ignores automatic pattern detection
- Useful for precise control

**Example Configuration:**
```json
{
  "copyInfoWithContext.maskingMode": "manual",
  "copyInfoWithContext.maskingDenyList": ["Email", "Phone", "BSB"]
}
```

**Result:**
- Only columns named "Email", "Phone", "BSB" are masked
- All other columns remain visible

---

#### Strict Mode - Maximum Sensitivity

**Behavior:**
- Detects all patterns aggressively
- Minimal exclusions
- May have false positives

**When to use:** Highly regulated industries, maximum compliance

**Configuration:**
```json
{
  "copyInfoWithContext.maskingMode": "strict"
}
```

---

### Fine-Grained Control

You can enable/disable individual PII types:

```json
{
  "copyInfoWithContext.maskingTypes": {
    "email": true,
    "phone": true,
    "address": true,
    "dateOfBirth": true,
    "ssn": true,
    "creditCard": true,
    "bsb": true,
    "accountNumber": true,
    "tfn": true,
    "abn": true,
    "medicare": true,
    "iban": true,
    "swift": true,
    "routingNumber": true,
    "nmi": true,
    "clientNumber": true,
    "customerNumber": true,
    "referenceNumber": true,
    "policyNumber": true,
    "transactionID": true,
    "passportNumber": true,
    "driversLicense": true,
    "nationalID": true
  }
}
```

**Disable specific types:**
```json
{
  "copyInfoWithContext.maskingTypes": {
    "dateOfBirth": false,
    "passportNumber": false
  }
}
```

---

## Advanced Features

### Deny-List and Allow-List

**Deny-List** - Force masking of specific columns:

```json
{
  "copyInfoWithContext.maskingDenyList": [
    "InternalID",
    "EmployeeNumber",
    "CustomerReference",
    "API_Key",
    "Secret"
  ]
}
```

**Allow-List** - Never mask specific columns:

```json
{
  "copyInfoWithContext.maskingAllowList": [
    "ProductID",
    "OrderID",
    "Status",
    "Category"
  ]
}
```

**Priority:** Allow-List > Deny-List > Auto-Detection

---

### Custom Patterns

Define company-specific sensitive data patterns:

```json
{
  "copyInfoWithContext.maskingCustomPatterns": [
    {
      "name": "Employee ID",
      "pattern": "EMP-\\d{6}",
      "replacement": "EMP-######",
      "enabled": true
    },
    {
      "name": "Project Code",
      "pattern": "PROJ-[A-Z]{3}-\\d{4}",
      "replacement": "PROJ-XXX-####",
      "enabled": true
    },
    {
      "name": "API Key",
      "pattern": "sk_live_[A-Za-z0-9]{32}",
      "replacement": "sk_live_################################",
      "enabled": true
    }
  ]
}
```

**Pattern Format:**
- `name`: Human-readable identifier
- `pattern`: JavaScript regex (escape backslashes with `\\`)
- `replacement`: What to replace with (use `#` for digits, `X` for letters, `*` for any)
- `enabled`: Turn on/off without removing pattern

---

### Masking Statistics

Show summary of masked items in clipboard:

**Enable:**
```json
{
  "copyInfoWithContext.includeMaskingStats": true
}
```

**Example Output:**
```
// data.csv:2-4 (CSV (Comma-Separated) > Name, Email, Phone, BSB)
2: John Doe,j***@e***.com,0*** *** ***,***-*56
3: Jane Smith,j***@e***.com,0*** *** ***,***-*78
4: Bob Johnson,b***@e***.com,0*** *** ***,***-*90

// Masking Summary: 9 items masked (3 emails, 3 phones, 3 bsb)
```

---

### Status Bar Indicator

Visual reminder when masking is active:

**Enable:**
```json
{
  "copyInfoWithContext.showMaskingIndicator": true
}
```

**What you'll see:**
- 🔒 Icon in status bar (bottom of VS Code)
- Tooltip: "Data Masking: Active (Preset: financial)"

---

## Use Cases

### Use Case 1: Bug Report with Production Data

**Scenario:** Need to show customer data causing a bug

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.includeMaskingStats": true
}
```

**Before:**
```csv
CustomerID,Name,Email,Phone,CreditCard
CUST-00012345,John Doe,john.doe@example.com,0412 345 678,4532 1234 5678 9010
```

**After:**
```csv
CustomerID,Name,Email,Phone,CreditCard
C***5,John Doe,j***@e***.com,0*** *** ***,**** **** **** **10

// Masking Summary: 4 items masked (1 customer_number, 1 email, 1 phone, 1 credit_card)
```

**Result:** Bug is reproducible, customer privacy protected ✅

---

### Use Case 2: Documentation with Real Examples

**Scenario:** Writing API docs with real response examples

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "basic",
  "copyInfoWithContext.maskingStrategy": "structural"
}
```

**Before:**
```json
{
  "user": {
    "id": 12345,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123"
  }
}
```

**After:**
```json
{
  "user": {
    "id": 12345,
    "name": "John Doe",
    "email": "****@****.***",
    "phone": "*-***-****"
  }
}
```

**Result:** Format is clear, actual data is protected ✅

---

### Use Case 3: HIPAA-Compliant Training Materials

**Scenario:** Creating training docs with patient records

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "healthcare",
  "copyInfoWithContext.maskingStrategy": "full",
  "copyInfoWithContext.showMaskingIndicator": true
}
```

**Before:**
```csv
PatientID,Name,DOB,Medicare,Email
PAT-00123,Sarah Mitchell,1975-08-22,3345 67890 2,sarah@example.com
```

**After:**
```csv
PatientID,Name,DOB,Medicare,Email
***,Sarah Mitchell,***,***,***
```

**Result:** HIPAA compliance maintained ✅

---

### Use Case 4: Code Review with Config Files

**Scenario:** Sharing `.env` or config with sensitive keys

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "custom",
  "copyInfoWithContext.maskingDenyList": ["API_KEY", "SECRET", "PASSWORD"],
  "copyInfoWithContext.maskingCustomPatterns": [
    {
      "name": "API Key",
      "pattern": "sk_live_[A-Za-z0-9]{32}",
      "replacement": "sk_live_################################",
      "enabled": true
    }
  ]
}
```

**Before:**
```env
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=MySecretPassword123
API_KEY=sk_example_1234567890ABCDEFGHIJK
```

**After:**
```env
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=***
API_KEY=sk_example_####################
```

**Result:** Safe to share in pull requests ✅

---

## How It Works

### Detection Pipeline

1. **File Type Detection**
   - Determines if file is CSV, JSON, XML, or plain text
   - Chooses appropriate parsing strategy

2. **Column/Field Detection** (for structured data)
   - Parses headers from CSV line 1
   - Analyzes JSON keys and XML tag names
   - Builds column name index

3. **Pattern Matching**
   - Runs 25+ regex patterns against text
   - Validates matches (e.g., Luhn algorithm for credit cards)
   - Records match position and type

4. **Statistical Anomaly Detection (v1.4.3+)**
   - **Test Data Detection**: Checks for repeated digits (e.g., `111-11-1111`)
   - **Sequential Patterns**: Identifies sequential numbers (e.g., `123-45-6789`, `987-65-4321`)
   - **Placeholder Patterns**: Detects `XXXXXXXX`, `00000000`, `N/A`, `TBD`, `test@example.com`
   - **Same Character**: Flags values like `AAAAAAA` or `9999999`
   - Skips masking if value appears to be test/placeholder data

5. **Context Analysis**
   - **Field Name Protection**: Checks if match is inside an XML/JSON field name
   - **Date Exclusion**: For date of birth, checks if in a service date field
   - Skips matches that are tag names or excluded contexts

6. **Column Type Matching**
   - For CSV/structured data, maps columns to PII types
   - Applies column-specific masking (e.g., "Email" column → email masking)

7. **Masking Application**
   - Applies selected strategy (partial/full/structural)
   - Replaces sensitive values with masked versions
   - Preserves formatting and structure

8. **Output Generation**
   - Combines masked data with context headers
   - Adds statistics if enabled
   - Copies to clipboard

---

### Field Name Protection

**Problem:** Early versions masked XML/JSON tag names like `<transactionDate>` → `<t***e>`

**Solution:** `isInsideFieldName()` function

**How it works:**
- Looks 50 characters before and after each match
- Checks if match is between `<` and `>` (XML tag)
- Checks if match is in `"field":` pattern (JSON key)
- Skips masking if inside a field/tag name

**Example:**
```xml
<transactionDate>2024-11-17</transactionDate>
     ^^^^^^^^^^^ NOT masked (inside tag name)
                 ^^^^^^^^^^ Checked for masking (value)
```

---

### Date of Birth Exclusion

**Problem:** Date pattern `\d{4}-\d{2}-\d{2}` matches ALL dates (service, transaction, birth)

**Solution:** `isNonBirthDateField()` function with 25 exclusion keywords

**Exclusion Keywords:**
```typescript
[
  'eligible', 'service', 'start', 'end', 'expiry', 'expire', 'effective', 'transaction',
  'created', 'modified', 'updated', 'deleted', 'issued', 'commence', 'completion',
  'payment', 'settlement', 'process', 'registration', 'enrollment', 'join', 'leave',
  'termination', 'cancellation', 'renewal', 'anniversary', 'due', 'maturity',
  'valuation', 'assessment', 'review', 'audit', 'report', 'statement', 'financial'
]
```

**How it works:**
- Examines 100 characters before the date match
- Checks if any exclusion keyword appears
- If found, skips masking (it's a service/business date)
- If not found, applies masking (it's likely a birth date)

**Example:**
```xml
<eligibleServiceDate>2012-06-15</eligibleServiceDate>  ← NOT masked ("eligible" in context)
<lifeDateOfBirth>1986-05-28</lifeDateOfBirth>          ← IS masked ("birth" in context)
```

---

### Statistical Anomaly Detection

**Added in v1.4.3** - Automatically detects and skips test/placeholder data to reduce false positives.

**Why This Matters:**
- Prevents masking example data in documentation
- Avoids false positives in test files with synthetic data
- Preserves placeholder markers like "N/A", "TBD" in your code

**Detection Rules:**

| **Anomaly Type** | **Pattern** | **Examples** | **Confidence Multiplier** |
|------------------|-------------|--------------|---------------------------|
| **Repeated Digits** | 5+ consecutive same digit | `111-11-1111`, `555-555-5555` | 0.2 (likely not masked) |
| **Sequential Numbers** | 4+ sequential digits | `123-45-6789`, `987-65-4321` | 0.3 (likely not masked) |
| **Common Placeholders** | Known test patterns | `XXXXXXXX`, `00000000`, `test@example.com` | 0.1 (won't mask) |
| **All Same Character** | Same character repeated 4+ times | `AAAAAAA`, `9999999` | 0.15 (likely not masked) |

**How It Works:**

1. After a pattern match is found (e.g., TFN regex matches `"987 654 321"`)
2. The value is analyzed for statistical anomalies
3. If anomalies detected, confidence score is drastically reduced
4. If score falls below threshold (default 0.7), masking is skipped

**Example: TFN with Sequential Pattern**

```json
{
  "tfn": "987 654 321"
}
```

**Analysis:**
- ✅ Matches TFN pattern: `/\b\d{3}\s?\d{3}\s?\d{3}\b/g`
- ❌ Contains sequential digits: "987" and "654"
- 📊 Statistical confidence: 0.3 (below threshold)
- 🚫 **Result:** NOT masked

**Example: Random-Looking TFN**

```json
{
  "tfn": "123 456 782"
}
```

**Analysis:**
- ✅ Matches TFN pattern
- ✅ No obvious sequential patterns ("782" is not sequential)
- 📊 Statistical confidence: 1.0 (no anomalies)
- ✅ **Result:** IS masked → `***`

**Overriding Detection:**

If you need to mask test data (e.g., for compliance training), use the deny-list:

```json
{
  "copyInfoWithContext.maskingDenyList": ["tfn", "ssn", "creditCard"]
}
```

This forces masking regardless of statistical checks.

**Future Improvements (Phase 2):**

In v1.5.0, checksum validation will be added:
- **TFN**: Mod-11 checksum algorithm
- **ABN**: Mod-89 checksum algorithm
- **Credit Cards**: Luhn algorithm

This will better distinguish real vs. test data (e.g., `"987 654 321"` might actually be a valid TFN if checksum passes).

---

## Troubleshooting

### Issue 1: Data Not Being Masked

**Symptom:** Sensitive data copied without masking

**Possible Causes:**

1. **Masking not enabled**
   ```json
   {
     "copyInfoWithContext.enableDataMasking": true  ← Check this
   }
   ```

2. **Column on allow-list**
   ```json
   {
     "copyInfoWithContext.maskingAllowList": ["Email"]  ← Remove if needed
   }
   ```

3. **Pattern not detected**
   - Check if pattern matches regex
   - Try adding to deny-list:
   ```json
   {
     "copyInfoWithContext.maskingDenyList": ["YourColumnName"]
   }
   ```

4. **Preset set to "none"**
   ```json
   {
     "copyInfoWithContext.maskingPreset": "basic"  ← Change from "none"
   }
   ```

---

### Issue 2: Too Much Data Masked (False Positives)

**Symptom:** Non-sensitive data is being masked

**Possible Causes:**

1. **Mode set to "strict"**
   ```json
   {
     "copyInfoWithContext.maskingMode": "auto"  ← Change from "strict"
   }
   ```

2. **Column name triggers detection**
   - Add to allow-list:
   ```json
   {
     "copyInfoWithContext.maskingAllowList": ["ProductID", "OrderID"]
   }
   ```

3. **Pattern too broad**
   - Disable specific PII type:
   ```json
   {
     "copyInfoWithContext.maskingTypes": {
       "dateOfBirth": false  ← Disable if causing issues
     }
   }
   ```

---

### Issue 3: Service Dates Being Masked

**Symptom:** Dates like `transactionDate`, `serviceStartDate` are masked

**Solution:** Ensure exclusion keywords are working

**Test File:** Create `test-dates.xml`:
```xml
<customer>
  <dateOfBirth>1986-05-28</dateOfBirth>          ← Should mask
  <eligibleServiceDate>2012-06-15</eligibleServiceDate>  ← Should NOT mask
</customer>
```

**Expected Result:**
```xml
<customer>
  <dateOfBirth>1986-**-**</dateOfBirth>
  <eligibleServiceDate>2012-06-15</eligibleServiceDate>
</customer>
```

**If still masking:** Use allow-list
```json
{
  "copyInfoWithContext.maskingAllowList": ["eligibleServiceDate", "serviceStartDate"]
}
```

---

### Issue 4: Test Data or Sequential Patterns Not Being Masked

**Symptom:** Data that looks like PII is not being masked (e.g., TFN `"987 654 321"`, SSN `"123-45-6789"`)

**Reason:** This is **intentional** - the extension includes intelligent test data detection to avoid masking placeholder/test values.

**Statistical Anomaly Detection (v1.4.3+):**

The masking engine automatically **skips** values that appear to be test/placeholder data:

| **Pattern Type** | **Example Value** | **Detection** | **Action** |
|------------------|-------------------|---------------|------------|
| **Repeated Digits** | `111-11-1111` | 5+ consecutive same digits | Not masked |
| **Sequential Numbers** | `123-45-6789`, `987-65-4321` | 4+ sequential digits | Not masked |
| **Common Placeholders** | `XXXXXXXX`, `00000000` | All X's or zeros | Not masked |
| **Test Markers** | `test@example.com`, `N/A`, `TBD` | Known test patterns | Not masked |
| **All Same Character** | `AAAAAAA`, `9999999` | Same character repeated | Not masked |

**Why This Matters:**

1. **Documentation & Examples**: Prevents masking example data in API docs, README files, code comments
2. **Test Files**: Avoids false positives in unit tests with synthetic data
3. **Placeholders**: Preserves "TBD", "N/A", "TODO" markers in your code

**Example Scenarios:**

```json
// Scenario 1: Real TFN with sequential digits
{
  "tfn": "987 654 321"  ← Contains "987" and "654" sequences → NOT masked
}

// Scenario 2: Test SSN
{
  "ssn": "123-45-6789"  ← Sequential pattern → NOT masked
}

// Scenario 3: Repeated pattern
{
  "phone": "555-555-5555"  ← Repeated "555" → NOT masked
}

// Scenario 4: Real-looking data (no anomalies)
{
  "tfn": "123 456 782",  ← No obvious patterns → IS masked
  "ssn": "234-56-7890",  ← Random digits → IS masked
  "phone": "0412 345 678" ← Normal pattern → IS masked
}
```

**If You Need to Mask Test Data:**

Use the **deny-list** to force masking:

```json
{
  "copyInfoWithContext.maskingDenyList": ["tfn", "ssn", "phone"]
}
```

This overrides statistical checks and **always** masks those columns.

**Note:** In Phase 2 (v1.5.0+), checksum validation will be added for TFN, ABN, and credit cards to better distinguish real vs. test data.

---

### Issue 5: XML Tag Names Being Masked

**Symptom:** Tag names like `<transactionDate>` become `<t***e>`

**Solution:** This should be fixed in latest version. Update extension.

**How it's fixed:** `isInsideFieldName()` detects when match is between `<` and `>`

**Test:**
```xml
<transactionDate>2024-11-17</transactionDate>
```

**Expected:**
```xml
<transactionDate>2024-11-17</transactionDate>  ← Tag name preserved
```

---

### Issue 5: Numbers in Table Mode Not Masked

**Symptom:** Sensitive numbers visible in TABLE mode

**Cause:** TABLE mode is a formatting layer, masking happens before formatting

**Solution:** Masking should work the same across all CSV modes. If not:
1. Check that `enableDataMasking` is `true`
2. Verify preset is not "none"
3. Try MINIMAL mode to debug

---

## Privacy & Security

### Local Processing Only

**How it works:**
- ✅ All masking happens in VS Code process
- ✅ No cloud API calls
- ✅ No telemetry or tracking
- ✅ Original data never leaves your machine
- ✅ Masked data copied to system clipboard only

**What we DON'T do:**
- ❌ Send data to external servers
- ❌ Log sensitive information
- ❌ Store unmasked data
- ❌ Transmit usage statistics

---

### Compliance Benefits

**GDPR (General Data Protection Regulation):**
- ✅ Date of birth is personal data (Article 4)
- ✅ Email, phone, address are PII
- ✅ "Privacy by design" principle (Article 25)

**CCPA (California Consumer Privacy Act):**
- ✅ Personal information includes identifiers
- ✅ Financial account numbers protected
- ✅ Identity documents masked

**HIPAA (Health Insurance Portability and Accountability Act):**
- ✅ Protected Health Information (PHI) includes:
  - Date of birth
  - Email, phone, address
  - Medicare numbers
  - Medical record numbers

**Privacy Act 1988 (Australia):**
- ✅ TFN (Tax File Number) - highly sensitive
- ✅ Medicare number - health identifier
- ✅ ABN (Australian Business Number)
- ✅ BSB and account numbers

---

### Best Practices

**1. Use Appropriate Presets**
- Financial industry → `"financial"` preset
- Healthcare → `"healthcare"` preset
- Multi-industry → `"enterprise"` preset

**2. Choose Right Strategy**
- Internal docs → `"partial"` (readable)
- Public docs → `"full"` (maximum privacy)
- Testing → `"structural"` (format validation)

**3. Maintain Deny-Lists**
- Add company-specific sensitive fields
- Review quarterly
- Update as new data types emerge

**4. Enable Masking Indicator**
```json
{
  "copyInfoWithContext.showMaskingIndicator": true
}
```
- Visual reminder in status bar
- Prevents accidental unmasked copies

**5. Test with Real Data**
- Create test files with sample PII
- Verify masking works correctly
- Check for false positives/negatives

---

## Examples

### Example 1: Financial Services CSV

**File: `transactions.csv`**
```csv
TransactionID,Date,CustomerEmail,BSB,AccountNo,Amount,CreditCard
TXN-123456,2024-11-17,john.doe@example.com,123-456,987654321,1500.00,4532123456789010
TXN-123457,2024-11-17,jane.smith@example.com,234-567,876543210,2500.00,5425233430109903
```

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

**Output (MINIMAL mode):**
```csv
// transactions.csv:2-3 (CSV (Comma-Separated) > TransactionID, Date, CustomerEmail, BSB, AccountNo, Amount, CreditCard)
2: T***6,2024-11-17,j***@e***.com,***-*56,***321,1500.00,**** **** **** **10
3: T***7,2024-11-17,j***@e***.com,***-*67,***210,2500.00,**** **** **** **03
```

---

### Example 2: Healthcare Patient Record (XML)

**File: `patient.xml`**
```xml
<patient>
  <patientID>PAT-00123</patientID>
  <name>Sarah Mitchell</name>
  <dateOfBirth>1975-08-22</dateOfBirth>
  <email>sarah.mitchell@email.com</email>
  <phone>+61 423 456 789</phone>
  <medicare>3345 67890 2</medicare>
  <eligibleServiceDate>2012-06-15</eligibleServiceDate>
</patient>
```

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "healthcare",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

**Output:**
```xml
// patient.xml:2-8 (patient)
2: <patientID>PAT-00123</patientID>
3: <name>Sarah Mitchell</name>
4: <dateOfBirth>1975-**-**</dateOfBirth>
5: <email>s***@e***.com</email>
6: <phone>+61 *** ** **9</phone>
7: <medicare>**** ***** *</medicare>
8: <eligibleServiceDate>2012-06-15</eligibleServiceDate>  ← NOT masked (service date)
```

---

### Example 3: Identity Documents

**File: `travelers.csv`**
```csv
Name,PassportNo,DriversLicense,NationalID,DateOfBirth
John Anderson,N1234567,NSW12345,AB123456C,1980-05-15
Jane Smith,123456789,DL A1234567,,1990-08-22
```

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "enterprise",
  "copyInfoWithContext.maskingStrategy": "partial"
}
```

**Output (TABLE mode):**
```
// travelers.csv:2-3 (CSV (Comma-Separated) > 5 columns)

╔════╤════════════════╤═════════════╤════════════════╤═════════════╤══════════════╗
║ #  │ Name           │ PassportNo  │ DriversLicense │ NationalID  │ DateOfBirth  ║
╠════╪════════════════╪═════════════╪════════════════╪═════════════╪══════════════╣
║ 2  │ John Anderson  │ N*****7     │ N*****5        │ AB****56C   │ 1980-**-**   ║
║ 3  │ Jane Smith     │ 1*******9   │ A******7       │             │ 1990-**-**   ║
╚════╧════════════════╧═════════════╧════════════════╧═════════════╧══════════════╝
```

---

### Example 4: API Configuration (JSON)

**File: `config.json`**
```json
{
  "database": {
    "host": "db.example.com",
    "user": "admin",
    "password": "MySecretPassword123"
  },
  "api": {
    "key": "sk_example_1234567890ABCDEFGHIJK",
    "email": "api@example.com"
  },
  "support": {
    "phone": "+1-555-0123",
    "email": "support@example.com"
  }
}
```

**Configuration:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "custom",
  "copyInfoWithContext.maskingDenyList": ["password", "key"],
  "copyInfoWithContext.maskingCustomPatterns": [
    {
      "name": "API Key",
      "pattern": "sk_live_[A-Za-z0-9]{32}",
      "replacement": "sk_live_################################",
      "enabled": true
    }
  ]
}
```

**Output:**
```json
{
  "database": {
    "host": "db.example.com",
    "user": "admin",
    "password": "***"
  },
  "api": {
    "key": "sk_live_################################",
    "email": "a***@e***.com"
  },
  "support": {
    "phone": "+1-***-****",
    "email": "s***@e***.com"
  }
}
```

---

## Summary

The **Data Masking** feature provides comprehensive PII protection with:

| Feature | Description |
|---------|-------------|
| **25+ PII Types** | Email, phone, financial, government IDs, identity documents |
| **4 Strategies** | Partial, full, structural, hash (future) |
| **5 Presets** | None, basic, financial, healthcare, enterprise, custom |
| **3 Modes** | Auto, manual, strict |
| **Smart Detection** | Pattern + column name + context-aware |
| **100% Local** | No cloud, no telemetry, maximum privacy |

**Quick Start:**
1. Enable: `"copyInfoWithContext.enableDataMasking": true`
2. Choose preset: `"maskingPreset": "financial"`
3. Copy as usual: `Ctrl+Alt+C`

**Next Steps:**
- Configure your preset and strategy
- Test with sample data
- Add custom patterns if needed
- Combine with [CSV Intelligence](GUIDE-CSV-INTELLIGENCE.md)

---

**Need help?** Check the [Troubleshooting](#troubleshooting) section or open an issue on GitHub.

**Want to learn about CSV modes?** See the [CSV Intelligence Guide](GUIDE-CSV-INTELLIGENCE.md).
