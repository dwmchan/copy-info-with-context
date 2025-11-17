# CSV Intelligence Guide

> **Complete guide to the CSV/TSV/PSV Intelligence feature** - Four output modes, smart column detection, and intelligent formatting for delimited data files.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Four Output Modes](#four-output-modes)
  - [Mode 1: MINIMAL](#mode-1-minimal-)
  - [Mode 2: SMART](#mode-2-smart-)
  - [Mode 3: TABLE](#mode-3-table-)
  - [Mode 4: DETAILED](#mode-4-detailed-)
- [Switching Between Modes](#switching-between-modes)
- [Supported Delimiters](#supported-delimiters)
- [Smart Features](#smart-features)
- [Configuration Options](#configuration-options)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

---

## Overview

The CSV Intelligence feature provides four distinct output modes for copying delimited data files (CSV, TSV, PSV, SSV). Each mode is optimized for different scenarios - from compact data sharing to comprehensive analysis with column metadata.

**What it does:**
- ✅ Automatically detects file delimiter (comma, tab, pipe, semicolon, space)
- ✅ Parses headers from line 1 (even if not selected)
- ✅ Shows column context in header comments
- ✅ Handles multi-row selections with proper formatting
- ✅ Supports partial field selections with smart trimming
- ✅ Provides four distinct output modes for different needs

**Supported File Types:**
- `.csv` - Comma-Separated Values
- `.tsv` - Tab-Separated Values
- `.psv` - Pipe-Separated Values
- `.ssv` - Space-Separated Values (custom delimiter: `|`)

---

## Quick Start

### Basic Usage

1. **Open a CSV/TSV/PSV file** in VS Code
2. **Select one or more rows** (you can select partial fields, full rows, or multiple rows)
3. **Press `Ctrl+Alt+C`** (Windows/Linux) or `Cmd+Alt+C` (Mac)
4. **Paste** - your data is copied with full context!

### Change Output Mode

**Keyboard Shortcut:** `Ctrl+Alt+X` (or `Cmd+Alt+X` on Mac)

Cycles through: **MINIMAL → SMART → TABLE → DETAILED → MINIMAL ...**

**Command Palette:** `Ctrl+Shift+P` → Type "CSV Output Mode"

### Example

**File: `users.csv`**
```csv
Name,Email,Status,Role,Department
John Doe,john@example.com,Active,Manager,Sales
Jane Smith,jane@example.com,Active,Developer,Engineering
Bob Johnson,bob@example.com,Inactive,Designer,Marketing
```

**Select line 2, press `Ctrl+Alt+C`:**

**MINIMAL Mode Output:**
```
// users.csv:2 (CSV (Comma-Separated) > Name, Email, Status, Role, Department)
2: John Doe,john@example.com,Active,Manager,Sales
```

**SMART Mode Output:**
```
// users.csv:2 (CSV (Comma-Separated) > 5 columns)

Name: John Doe
Email: john@example.com
Status: Active
Role: Manager
Department: Sales
```

**TABLE Mode Output:**
```
// users.csv:2 (CSV (Comma-Separated) > 5 columns)

╔════╤═══════════╤═══════════════════════╤═════════╤═══════════╤═════════════╗
║ #  │ Name      │ Email                 │ Status  │ Role      │ Department  ║
╠════╪═══════════╪═══════════════════════╪═════════╪═══════════╪═════════════╣
║ 2  │ John Doe  │ john@example.com      │ Active  │ Manager   │ Sales       ║
╚════╧═══════════╧═══════════════════════╧═════════╧═══════════╧═════════════╝
```

**DETAILED Mode Output:**
```
// users.csv:2 (CSV (Comma-Separated) > 5 columns: Name, Email, Status, Role, Department)
// Row 2 of 4 total rows (including header)

Column 1 (Name): John Doe
Column 2 (Email): john@example.com
Column 3 (Status): Active
Column 4 (Role): Manager
Column 5 (Department): Sales

// Format: CSV with comma delimiter
// Header detected: Name, Email, Status, Role, Department
```

---

## Four Output Modes

### Mode 1: MINIMAL ⚡

**Best for:** Quick data sharing, compact output, single-line selections

**What you get:**
- Clean, compact format with just the essentials
- Automatic header detection from line 1
- Smart partial field trimming (auto-adjusts to complete fields)
- Column context in header (shows which columns you selected)

**Features:**
- ✅ Most compact output
- ✅ Preserves original CSV format
- ✅ Line numbers included
- ✅ Column names in context header
- ✅ Perfect for code reviews, bug reports, documentation

**Example:**
```
// data.csv:5 (CSV (Comma-Separated) > ProductID, ProductName, Price)
5: PROD-001,Laptop,1299.99
```

**Use Cases:**
- Sharing a single row of data in Slack/Teams
- Quick reference in documentation
- Code review comments
- Bug reports with minimal context

---

### Mode 2: SMART 🧠

**Best for:** Human-readable data review, detailed analysis of individual records

**What you get:**
- **Key-value pairs** for each field (e.g., `Email: john@example.com`)
- **Vertical layout** - one field per line
- **Column headers** automatically fetched from line 1
- **Clean formatting** - no delimiters, just field names and values

**Features:**
- ✅ Easy to read and understand
- ✅ Perfect for reviewing individual records
- ✅ No need to count columns or match headers
- ✅ Great for documentation and presentations
- ✅ Handles multi-row selections (shows each row as a group)

**Example (Single Row):**
```
// users.csv:3 (CSV (Comma-Separated) > 5 columns)

Name: Jane Smith
Email: jane@example.com
Status: Active
Role: Developer
Department: Engineering
```

**Example (Multi-Row):**
```
// users.csv:2-3 (CSV (Comma-Separated) > 5 columns)

--- Row 2 ---
Name: John Doe
Email: john@example.com
Status: Active
Role: Manager
Department: Sales

--- Row 3 ---
Name: Jane Smith
Email: jane@example.com
Status: Active
Role: Developer
Department: Engineering
```

**Use Cases:**
- Reviewing user profiles or customer records
- Analyzing individual transactions
- Documentation with clear field labels
- Training materials
- Data validation

---

### Mode 3: TABLE 📊

**Best for:** Side-by-side comparison, data analysis, reporting

**What you get:**
- **Beautiful ASCII table** with borders and alignment
- **Multi-row display** - perfect for comparing multiple records
- **Automatic column sizing** based on content
- **Number alignment** - right-aligned by default (configurable)
- **Row numbering** - shows original line numbers
- **Professional formatting** - publication-ready output

**Features:**
- ✅ Visual clarity with borders and alignment
- ✅ Easy column comparison
- ✅ Handles up to 20 rows (configurable)
- ✅ Handles up to 10 columns (configurable)
- ✅ Smart truncation for large datasets
- ✅ Number alignment (right/left)

**Example:**
```
// users.csv:2-4 (CSV (Comma-Separated) > 5 columns)

╔════╤═══════════════╤═══════════════════════╤═════════╤════════════╤═════════════╗
║ #  │ Name          │ Email                 │ Status  │ Role       │ Department  ║
╠════╪═══════════════╪═══════════════════════╪═════════╪════════════╪═════════════╣
║ 2  │ John Doe      │ john@example.com      │ Active  │ Manager    │ Sales       ║
║ 3  │ Jane Smith    │ jane@example.com      │ Active  │ Developer  │ Engineering ║
║ 4  │ Bob Johnson   │ bob@example.com       │ Inactive│ Designer   │ Marketing   ║
╚════╧═══════════════╧═══════════════════════╧═════════╧════════════╧═════════════╝
```

**Configuration Options:**
```json
{
  "copyInfoWithContext.csvTableMaxRows": 20,
  "copyInfoWithContext.csvTableMaxColumns": 10,
  "copyInfoWithContext.csvTableAlignNumbers": "right"
}
```

**Use Cases:**
- Comparing multiple records side-by-side
- Creating reports or presentations
- Data analysis and review
- Documentation with professional formatting
- Email/Slack messages with structured data

---

### Mode 4: DETAILED 📝

**Best for:** Comprehensive analysis, debugging, documentation with full metadata

**What you get:**
- **Everything from SMART mode** (key-value pairs)
- **Plus comprehensive metadata:**
  - Row count (current row out of total)
  - Column count and names
  - Delimiter information
  - Header detection status
  - File format details

**Features:**
- ✅ Most comprehensive output
- ✅ Includes all metadata
- ✅ Perfect for debugging CSV parsing issues
- ✅ Shows header detection results
- ✅ Useful for documentation and training

**Example:**
```
// users.csv:2 (CSV (Comma-Separated) > 5 columns: Name, Email, Status, Role, Department)
// Row 2 of 4 total rows (including header)

Column 1 (Name): John Doe
Column 2 (Email): john@example.com
Column 3 (Status): Active
Column 4 (Role): Manager
Column 5 (Department): Sales

// Format: CSV with comma delimiter
// Header detected: Name, Email, Status, Role, Department
```

**Use Cases:**
- Debugging CSV parsing issues
- Understanding file structure
- Training and documentation
- Data migration analysis
- Verifying delimiter detection

---

## Switching Between Modes

### Method 1: Keyboard Shortcut (Fastest)

**Press `Ctrl+Alt+X`** (Windows/Linux) or **`Cmd+Alt+X`** (Mac)

- Cycles through modes in order: **MINIMAL → SMART → TABLE → DETAILED → MINIMAL**
- Current mode shown in status bar notification
- Setting is remembered for the entire VS Code session

### Method 2: Command Palette

1. **Press `Ctrl+Shift+P`** (Windows/Linux) or **`Cmd+Shift+P`** (Mac)
2. **Type:** "CSV Output Mode"
3. **Select:** "Copy Info with Context: Change CSV Output Mode"
4. **Choose** your preferred mode from the dropdown

### Method 3: Settings (Default Mode)

Set your preferred default mode in VS Code settings:

```json
{
  "copyInfoWithContext.csvOutputMode": "smart"
}
```

**Options:**
- `"minimal"` - Compact format (default)
- `"smart"` - Key-value pairs
- `"table"` - ASCII table
- `"detailed"` - Full metadata

---

## Supported Delimiters

The CSV Intelligence feature automatically detects delimiters:

| Delimiter | File Extension | Detection Pattern | Example |
|-----------|----------------|-------------------|---------|
| **Comma** | `.csv` | `,` | `Name,Email,Status` |
| **Tab** | `.tsv` | `\t` | `Name	Email	Status` |
| **Pipe** | `.psv` | `\|` | `Name\|Email\|Status` |
| **Semicolon** | `.csv` | `;` | `Name;Email;Status` |
| **Space/Custom** | `.ssv` | ` ` or custom | `Name Email Status` |

**How Detection Works:**

1. **File Extension Priority**: `.csv` → comma, `.tsv` → tab, `.psv` → pipe
2. **Auto-Detection**: Analyzes first line to find most common delimiter
3. **Fallback**: Defaults to comma if detection fails

**Delimiter Detection Function:**
```typescript
function detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0];
    const delimiters = [',', '\t', '|', ';'];

    let maxCount = 0;
    let detectedDelimiter = ',';

    for (const delimiter of delimiters) {
        const count = (firstLine.match(new RegExp(delimiter, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            detectedDelimiter = delimiter;
        }
    }

    return detectedDelimiter;
}
```

---

## Smart Features

### 1. Automatic Header Detection

**How it works:**
- Always reads **line 1** of the file to extract column names
- Works even if you select **data rows only** (not including header)
- Handles missing headers gracefully (uses "Column 1", "Column 2", etc.)

**Example:**
```csv
// File: users.csv
1: Name,Email,Status          ← Header (not selected)
2: John Doe,john@example.com,Active  ← Selected
```

**Output:**
```
// users.csv:2 (CSV (Comma-Separated) > Name, Email, Status)
2: John Doe,john@example.com,Active
```

Notice the header `Name, Email, Status` is shown even though line 1 wasn't selected!

---

### 2. Smart Partial Field Trimming

**Problem:** What if you select starting from the middle of a field?

**Example Selection:**
```
|--- Selection starts here
ware,Bob Smith,5bcfd3f9,bob.smith@company.com,Active
```

**MINIMAL Mode:** Automatically trims "ware" and outputs complete fields only:
```
// users.csv:3 (CSV (Comma-Separated) > Name, Email, Status)
3: Bob Smith,bob.smith@company.com,Active
```

**Other Modes:** Include all selected content (no trimming)

---

### 3. Multi-Row Selections

**All modes support multi-row selections:**

**MINIMAL Mode:**
```
// users.csv:2-4 (CSV (Comma-Separated) > Name, Email, Status)
2: John Doe,john@example.com,Active
3: Jane Smith,jane@example.com,Active
4: Bob Johnson,bob@example.com,Inactive
```

**SMART Mode:**
```
// users.csv:2-4 (CSV (Comma-Separated) > 3 columns)

--- Row 2 ---
Name: John Doe
Email: john@example.com
Status: Active

--- Row 3 ---
Name: Jane Smith
Email: jane@example.com
Status: Active

--- Row 4 ---
Name: Bob Johnson
Email: bob@example.com
Status: Inactive
```

**TABLE Mode:**
```
╔════╤═══════════════╤═══════════════════════╤═════════╗
║ #  │ Name          │ Email                 │ Status  ║
╠════╪═══════════════╪═══════════════════════╪═════════╣
║ 2  │ John Doe      │ john@example.com      │ Active  ║
║ 3  │ Jane Smith    │ jane@example.com      │ Active  ║
║ 4  │ Bob Johnson   │ bob@example.com       │ Inactive║
╚════╧═══════════════╧═══════════════════════╧═════════╝
```

---

### 4. Large Dataset Handling

**TABLE Mode Limits** (configurable):
- **Max Rows:** 20 (default)
- **Max Columns:** 10 (default)

**What happens if you exceed limits:**
- Rows beyond limit are **truncated** with a message: `... and 15 more rows`
- Columns beyond limit are **truncated** with a message: `... and 3 more columns`

**Configure limits:**
```json
{
  "copyInfoWithContext.csvTableMaxRows": 50,
  "copyInfoWithContext.csvTableMaxColumns": 15
}
```

---

### 5. Number Alignment in Tables

**Default:** Numbers are **right-aligned** in TABLE mode

**Example:**
```
╔════╤══════════╤═══════╗
║ #  │ Name     │ Price ║
╠════╪══════════╪═══════╣
║ 1  │ Laptop   │  1299 ║  ← Right-aligned
║ 2  │ Mouse    │    25 ║  ← Right-aligned
╚════╧══════════╧═══════╝
```

**Change to left-aligned:**
```json
{
  "copyInfoWithContext.csvTableAlignNumbers": "left"
}
```

**Result:**
```
╔════╤══════════╤═══════╗
║ #  │ Name     │ Price ║
╠════╪══════════╪═══════╣
║ 1  │ Laptop   │ 1299  ║  ← Left-aligned
║ 2  │ Mouse    │ 25    ║  ← Left-aligned
╚════╧══════════╧═══════╝
```

---

## Configuration Options

### Complete Settings Reference

```json
{
  // CSV Output Mode
  "copyInfoWithContext.csvOutputMode": "minimal",
  // Options: "minimal", "smart", "table", "detailed"

  // TABLE Mode Settings
  "copyInfoWithContext.csvTableMaxRows": 20,
  "copyInfoWithContext.csvTableMaxColumns": 10,
  "copyInfoWithContext.csvTableAlignNumbers": "right",
  // Options: "right", "left"

  // General Settings (apply to all modes)
  "copyInfoWithContext.showLineNumbers": true,
  "copyInfoWithContext.showContextPath": true,
  "copyInfoWithContext.lineNumberPadding": false
}
```

### Recommended Configurations

**For Quick Sharing (Slack/Teams):**
```json
{
  "copyInfoWithContext.csvOutputMode": "minimal",
  "copyInfoWithContext.showLineNumbers": true
}
```

**For Documentation:**
```json
{
  "copyInfoWithContext.csvOutputMode": "smart",
  "copyInfoWithContext.showContextPath": true
}
```

**For Data Analysis:**
```json
{
  "copyInfoWithContext.csvOutputMode": "table",
  "copyInfoWithContext.csvTableMaxRows": 50,
  "copyInfoWithContext.csvTableAlignNumbers": "right"
}
```

**For Debugging:**
```json
{
  "copyInfoWithContext.csvOutputMode": "detailed",
  "copyInfoWithContext.showContextPath": true,
  "copyInfoWithContext.showLineNumbers": true
}
```

---

## Use Cases

### Use Case 1: Bug Reports

**Scenario:** Reporting a data issue in a customer record

**Best Mode:** SMART

**Example:**
```
// customers.csv:42 (CSV (Comma-Separated) > 8 columns)

CustomerID: CUST-00012345
Name: John Doe
Email: john.doe@example.com
Status: Active
Balance: -500.00  ← Issue: Negative balance shouldn't be allowed
CreditLimit: 5000.00
LastPurchase: 2024-11-15
AccountType: Premium
```

---

### Use Case 2: Code Reviews

**Scenario:** Reviewing test data in a CSV file

**Best Mode:** TABLE

**Example:**
```
// test-users.csv:5-8 (CSV (Comma-Separated) > 4 columns)

╔════╤═══════════════╤═══════════════════════╤════════╤═══════╗
║ #  │ Username      │ Email                 │ Role   │ Active║
╠════╪═══════════════╪═══════════════════════╪════════╪═══════╣
║ 5  │ admin         │ admin@test.com        │ Admin  │ true  ║
║ 6  │ testuser1     │ test1@test.com        │ User   │ true  ║
║ 7  │ testuser2     │ test2@test.com        │ User   │ false ║
║ 8  │ reviewer      │ reviewer@test.com     │ Editor │ true  ║
╚════╧═══════════════╧═══════════════════════╧════════╧═══════╝
```

---

### Use Case 3: Documentation

**Scenario:** Creating user guide with sample data

**Best Mode:** SMART or DETAILED

**Example (SMART):**
```
// products.csv:10 (CSV (Comma-Separated) > 6 columns)

ProductID: PROD-00789
ProductName: Wireless Mouse
Category: Electronics
Price: 29.99
Stock: 150
Supplier: TechSupply Co.
```

---

### Use Case 4: Data Migration

**Scenario:** Verifying CSV structure before import

**Best Mode:** DETAILED

**Example:**
```
// import-data.csv:1 (CSV (Comma-Separated) > 12 columns: UserID, FirstName, LastName, Email, Phone, Address, City, State, ZIP, Country, JoinDate, Status)
// Row 1 of 5000 total rows (including header)

Column 1 (UserID): USER-00001
Column 2 (FirstName): John
Column 3 (LastName): Doe
Column 4 (Email): john.doe@example.com
Column 5 (Phone): +1-555-0123
Column 6 (Address): 123 Main Street
Column 7 (City): Springfield
Column 8 (State): IL
Column 9 (ZIP): 62701
Column 10 (Country): USA
Column 11 (JoinDate): 2024-01-15
Column 12 (Status): Active

// Format: CSV with comma delimiter
// Header detected: UserID, FirstName, LastName, Email, Phone, Address, City, State, ZIP, Country, JoinDate, Status
```

---

## Troubleshooting

### Issue 1: Wrong Delimiter Detected

**Symptom:** Output shows garbled data or single columns

**Example:**
```
// File uses semicolons, but comma is detected
Name;Email;Status → Treated as single column
```

**Solution:**
- Check file extension (`.csv` assumes comma, `.tsv` assumes tab, `.psv` assumes pipe)
- Rename file to match delimiter: `data.csv` → `data.tsv`
- Or use custom delimiter settings (future feature)

---

### Issue 2: Headers Not Detected

**Symptom:** Column names show as "Column 1", "Column 2", etc.

**Cause:** Line 1 doesn't contain headers, or file is empty

**Solution:**
- Ensure line 1 contains column names
- Check that file isn't empty
- Verify delimiter matches file format

---

### Issue 3: Partial Field Selection Trimming

**Symptom:** MINIMAL mode removes content you wanted

**Example:**
```
Selected: "ware,Bob Smith,bob@example.com"
Output: "Bob Smith,bob@example.com"  ← "ware" was trimmed
```

**Solution:**
- Use **SMART**, **TABLE**, or **DETAILED** mode (they don't trim)
- Or select from the start of a complete field

---

### Issue 4: Table Truncated

**Symptom:** TABLE mode shows "... and X more rows/columns"

**Cause:** Exceeded `csvTableMaxRows` or `csvTableMaxColumns` limits

**Solution:**
```json
{
  "copyInfoWithContext.csvTableMaxRows": 50,
  "copyInfoWithContext.csvTableMaxColumns": 20
}
```

---

### Issue 5: Numbers Not Aligned

**Symptom:** Numbers in TABLE mode are left-aligned instead of right-aligned

**Solution:**
```json
{
  "copyInfoWithContext.csvTableAlignNumbers": "right"
}
```

---

## Examples

### Example 1: Sales Data

**File: `sales.csv`**
```csv
Date,Product,Quantity,Revenue,Profit
2024-11-01,Laptop,5,6499.95,1299.99
2024-11-02,Mouse,25,624.75,249.90
2024-11-03,Keyboard,15,899.85,269.95
```

**MINIMAL Mode (Select line 2):**
```
// sales.csv:2 (CSV (Comma-Separated) > Date, Product, Quantity, Revenue, Profit)
2: 2024-11-01,Laptop,5,6499.95,1299.99
```

**SMART Mode (Select line 2):**
```
// sales.csv:2 (CSV (Comma-Separated) > 5 columns)

Date: 2024-11-01
Product: Laptop
Quantity: 5
Revenue: 6499.95
Profit: 1299.99
```

**TABLE Mode (Select lines 2-4):**
```
// sales.csv:2-4 (CSV (Comma-Separated) > 5 columns)

╔════╤════════════╤══════════╤══════════╤═════════╤═════════╗
║ #  │ Date       │ Product  │ Quantity │ Revenue │ Profit  ║
╠════╪════════════╪══════════╪══════════╪═════════╪═════════╣
║ 2  │ 2024-11-01 │ Laptop   │        5 │ 6499.95 │ 1299.99 ║
║ 3  │ 2024-11-02 │ Mouse    │       25 │  624.75 │  249.90 ║
║ 4  │ 2024-11-03 │ Keyboard │       15 │  899.85 │  269.95 ║
╚════╧════════════╧══════════╧══════════╧═════════╧═════════╝
```

---

### Example 2: User Accounts (TSV)

**File: `users.tsv`**
```tsv
UserID	Username	Email	Role	Active
1	admin	admin@company.com	Administrator	true
2	jsmith	jsmith@company.com	Editor	true
3	bjones	bjones@company.com	Viewer	false
```

**SMART Mode (Select line 3):**
```
// users.tsv:3 (TSV (Tab-Separated) > 5 columns)

UserID: 2
Username: jsmith
Email: jsmith@company.com
Role: Editor
Active: true
```

**TABLE Mode (Select lines 2-4):**
```
// users.tsv:2-4 (TSV (Tab-Separated) > 5 columns)

╔════╤════════╤═══════════╤═══════════════════════╤════════════════╤════════╗
║ #  │ UserID │ Username  │ Email                 │ Role           │ Active ║
╠════╪════════╪═══════════╪═══════════════════════╪════════════════╪════════╣
║ 2  │      1 │ admin     │ admin@company.com     │ Administrator  │ true   ║
║ 3  │      2 │ jsmith    │ jsmith@company.com    │ Editor         │ true   ║
║ 4  │      3 │ bjones    │ bjones@company.com    │ Viewer         │ false  ║
╚════╧════════╧═══════════╧═══════════════════════╧════════════════╧════════╝
```

---

### Example 3: Server Logs (PSV)

**File: `logs.psv`**
```psv
Timestamp|Level|Message|User
2024-11-17 10:00:00|INFO|User login successful|john.doe
2024-11-17 10:05:00|WARN|High memory usage detected|system
2024-11-17 10:10:00|ERROR|Database connection failed|admin
```

**MINIMAL Mode (Select line 4):**
```
// logs.psv:4 (PSV (Pipe-Separated) > Timestamp, Level, Message, User)
4: 2024-11-17 10:10:00|ERROR|Database connection failed|admin
```

**SMART Mode (Select line 4):**
```
// logs.psv:4 (PSV (Pipe-Separated) > 4 columns)

Timestamp: 2024-11-17 10:10:00
Level: ERROR
Message: Database connection failed
User: admin
```

---

## Summary

The **CSV Intelligence** feature provides four powerful modes for working with delimited data:

| Mode | Best For | Key Features |
|------|----------|--------------|
| **MINIMAL** | Quick sharing | Compact, preserves CSV format, smart trimming |
| **SMART** | Human review | Key-value pairs, vertical layout, easy reading |
| **TABLE** | Comparison | ASCII tables, alignment, professional formatting |
| **DETAILED** | Debugging | Full metadata, row/column counts, delimiter info |

**Quick Reference:**
- **Switch modes:** `Ctrl+Alt+X` / `Cmd+Alt+X`
- **Copy with context:** `Ctrl+Alt+C` / `Cmd+Alt+C`
- **Supported files:** CSV, TSV, PSV, SSV
- **Smart features:** Auto headers, delimiter detection, partial field trimming

**Next Steps:**
- Try all four modes with your data
- Configure your preferred default mode
- Combine with [Data Masking](GUIDE-DATA-MASKING.md) for PII protection
- Check out the [main README](README.md) for more features

---

**Need help?** Check the [Troubleshooting](#troubleshooting) section or open an issue on GitHub.

**Want to learn about Data Masking?** See the [Data Masking Guide](GUIDE-DATA-MASKING.md).
