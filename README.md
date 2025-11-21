# Copy Info with Context - VS Code Extension

> Born from the frustration of constantly copying and pasting code snippets, data, and configuration fragments without any context about where they came from or what they represented.

A VS Code extension that copies code snippets with intelligent contextual information - filename, line numbers, and smart path detection for structured data. Perfect for documentation, code reviews, debugging, and sharing code with proper attribution.

## The Problem This Solves

Have you ever:
- Copied a JSON snippet and forgot which property path it came from?
- Shared XML data without knowing which nested element you were looking at?
- Pasted code in Slack without line numbers, making it impossible to reference?
- Lost track of which file a configuration came from?
- Struggled to explain CSV data without column context?

This extension was created to solve exactly these problems - providing rich context for any code or data you copy.

## Features

### 🔧 Smart Context Detection
- **JSON/JSONC**: Full property paths with accurate array indices (e.g., `users[2].contacts[1]`)
- **XML/HTML**: Element hierarchy with precise sibling indexing (e.g., `Relations > Relation[2] > Type`)
- **CSV/TSV/PSV**: Intelligent column detection with proper delimiter handling
- **Programming Languages**: Function and class context for JavaScript, TypeScript, Python, C#, PowerShell, and more
  - Detects function names, class names, and namespaces
  - Shows full context path (e.g., `MyNamespace > MyClass > MyMethod`)
- **CSS/SCSS/SASS/LESS**: Selector context and media query detection

### 📝 Multiple Output Formats
- **Plain Text**: Clean monospace with context header
- **HTML with Syntax Highlighting**: Rich colored output for emails, Slack, documentation
- **Markdown**: Code blocks with language specification for GitHub, wikis
- **ANSI Colored**: Terminal-friendly colored output
- **Custom Formats**: Choose your preferred format on-the-fly

### 🎨 Comprehensive Syntax Highlighting
- **10+ Languages**: JavaScript, TypeScript, Python, C#, JSON, XML, HTML, CSS, YAML
- **Smart Color Coding**: Professional color schemes for different themes
- **Delimited Files**: Auto-detects CSV, TSV, PSV, SSV with proper formatting

### 🔒 Smart Data Masking (NEW)
Protect sensitive data when sharing code! Automatically detect and mask PII (Personally Identifiable Information):

> **⚠️ Note:** Data masking is **disabled by default**. You need to enable it manually in settings to use this feature.

**To Enable:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial"  // or "basic", "healthcare", "enterprise"
}
```

**What It Protects:**
- **Personal Information**: Email, phone, address, date of birth
- **Financial Data**: Credit cards, bank accounts, SSN, IBAN, SWIFT/BIC
- **Australian Banking**: BSB, TFN, ABN, Medicare
- **Identity Documents**: Passports, driver's licenses, national IDs (AU/US/UK/EU)
- **Enterprise Identifiers**: Client numbers, transactions, policies, NMI

**Industry Presets**: Basic, Financial, Healthcare, Enterprise, Custom

**Masking Strategies**: Partial (readable), Full (maximum privacy), Structural (format-preserving)

**Example**:
```csv
// Before masking:
Name,Email,BSB,DateOfBirth,Passport
John Doe,john@example.com,123-456,1986-05-28,N1234567

// After masking (partial):
Name,Email,BSB,DateOfBirth,Passport
John Doe,j***@e***.com,***-*56,1986-**-**,N*****7
```

**📖 [Complete Data Masking Guide →](GUIDE-DATA-MASKING.md)** | **Quick Start:** Press `Ctrl+,` → Search "masking" → Enable feature

Perfect for bug reports, documentation, code reviews, and compliance (GDPR, CCPA, HIPAA)

### ⚡ Performance & Reliability
- **Smart Dedenting**: Automatically removes excessive indentation while preserving code structure
- **Fixed Indexing Issues**: Accurate array/sibling counting for JSON and XML
- **Intelligent File Detection**: JSON files no longer misidentified as CSV
- **Consistent Line Numbering**: Reliable line numbers across all formats
- **Memory Efficient**: Optimized processing for large codebases (up to 5MB)
- **Safe Operations**: No crashes, no freezing, always recoverable

### ⌨️ Convenient Usage
- **Keyboard Shortcuts**: 
  - `Ctrl+Alt+C` (Windows/Linux) or `Cmd+Alt+C` (Mac) - Copy with context
  - `Ctrl+Alt+H` (Windows/Linux) or `Cmd+Alt+H` (Mac) - Copy with HTML highlighting
- **Right-Click Menu**: Context menu integration
- **Command Palette**: All features accessible via `Ctrl+Shift+P`

## Installation

1. Open VS Code
2. Press `Ctrl+P` to open Quick Open
3. Type `ext install copy-info-with-context`
4. Press Enter and reload VS Code

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=donald-chan.copy-info-with-context).

## 📚 Feature Guides

**Comprehensive documentation for major features:**

- **[📊 CSV Intelligence Guide](GUIDE-CSV-INTELLIGENCE.md)** - Four output modes (MINIMAL, SMART, TABLE, DETAILED), delimiter detection, and smart formatting for CSV/TSV/PSV files
- **[🔒 Data Masking Guide](GUIDE-DATA-MASKING.md)** - Complete PII protection with 25+ data types, industry presets, masking strategies, and compliance information

## Usage Examples

### JSON Context Detection (Fixed Array Indexing)
```javascript
// config.json:15 (users[2].profile.settings.theme)
15: "theme": "dark"
```

### XML with Array Indices (Fixed Sibling Counting)
```xml
// users.xml:8-12 (root > customers > customer[1] > addresses > address[0])
8: <address type="home">
9:   <street>123 Main St</street>
10:   <city>Springfield</city>
11:   <zip>12345</zip>
12: </address>
```

### CSV Column Context
```csv
// data.csv:3 (CSV (Comma-Separated) > Email, Phone)
3: john.doe@company.com,+1-555-0123
```

### Function Context
```javascript
// utils.js:42-46 (UserService > validateEmail)
42: function validateEmail(email) {
43:   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
44:   return emailRegex.test(email);
45: }
```

### HTML with Syntax Highlighting
Rich HTML output perfect for emails, Slack, or documentation:

```html
<div style="font-family: 'Consolas', 'Monaco', monospace; background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px;">
<div style="color: #6a9955; margin-bottom: 8px;">// config.js:25-30 (exports > database)</div>
<pre style="margin: 0; white-space: pre-wrap;">
<span style="color: #569CD6">const</span> <span style="color: #DCDCAA">database</span> = {
  <span style="color: #9CDCFE">host</span>: <span style="color: #CE9178">'localhost'</span>,
  <span style="color: #9CDCFE">port</span>: <span style="color: #B5CEA8">5432</span>
};
</pre>
</div>
```

## Configuration

Customize the extension through VS Code Settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `copyInfoWithContext.showLineNumbers` | `true` | Show line numbers on each copied line |
| `copyInfoWithContext.lineNumberPadding` | `false` | Add padding for consistent line number alignment |
| `copyInfoWithContext.showContextPath` | `true` | Show contextual path information |
| `copyInfoWithContext.enableColorCoding` | `false` | Enable syntax highlighting in default copy |
| `copyInfoWithContext.colorTheme` | `"dark"` | Color theme for syntax highlighting |
| `copyInfoWithContext.showArrayIndices` | `true` | Show array indices in context paths |
| `copyInfoWithContext.maxFileSize` | `5000000` | Maximum file size to process (bytes) |
| `copyInfoWithContext.csvOutputMode` | `"minimal"` | CSV output mode: minimal, smart, table, or detailed |
| `copyInfoWithContext.csvTableMaxRows` | `20` | Maximum rows to show in table format |
| `copyInfoWithContext.csvTableMaxColumns` | `10` | Maximum columns to show in table format |
| `copyInfoWithContext.csvTableAlignNumbers` | `"right"` | Number alignment in tables: left or right |
| **Data Masking** | | **⚠️ Disabled by default** |
| `copyInfoWithContext.enableDataMasking` | `false` | **Enable automatic detection and masking of sensitive data (PII)** - Must be enabled manually |
| `copyInfoWithContext.maskingMode` | `"auto"` | Masking sensitivity: auto, manual, or strict |
| `copyInfoWithContext.maskingStrategy` | `"partial"` | Masking strategy: partial, full, structural, or hash |
| `copyInfoWithContext.maskingPreset` | `"none"` | Industry preset: none, basic, financial, healthcare, enterprise, or custom |
| `copyInfoWithContext.maskingDenyList` | `[]` | Column names that should ALWAYS be masked (e.g., ["email", "ssn", "BSB"]) |
| `copyInfoWithContext.maskingAllowList` | `[]` | Column names that should NEVER be masked (overrides auto-detection) |
| `copyInfoWithContext.maskingConfidenceThreshold` | `0.7` | **NEW v1.4.1** - Minimum confidence (0.0-1.0) to mask. Higher = fewer false positives. Recommended: 0.7 |
| `copyInfoWithContext.showMaskingIndicator` | `true` | Show visual indicator in status bar when masking is active |
| `copyInfoWithContext.includeMaskingStats` | `false` | Include statistics about masked items in output |
| `copyInfoWithContext.maskingCustomPatterns` | `[]` | Custom regex patterns for company-specific sensitive data |

### Example Configuration

**Basic Configuration:**
```json
{
  "copyInfoWithContext.showLineNumbers": true,
  "copyInfoWithContext.showContextPath": true,
  "copyInfoWithContext.enableColorCoding": false,
  "copyInfoWithContext.maxFileSize": 10000000
}
```

**Data Masking for Financial Services:**

> **Note:** Data masking is disabled by default. Set `enableDataMasking: true` to activate.

```json
{
  "copyInfoWithContext.enableDataMasking": true,  // ⚠️ Required to enable masking
  "copyInfoWithContext.maskingPreset": "financial",
  "copyInfoWithContext.maskingStrategy": "partial",
  "copyInfoWithContext.maskingDenyList": [
    "BSB",
    "Account Number",
    "Client ID",
    "Customer Number"
  ],
  "copyInfoWithContext.maskingCustomPatterns": [
    {
      "name": "Internal Customer ID",
      "pattern": "CUST-\\d{8}",
      "replacement": "CUST-########",
      "enabled": true
    }
  ]
}
```

**Data Masking for Healthcare:**
```json
{
  "copyInfoWithContext.enableDataMasking": true,  // ⚠️ Required to enable masking
  "copyInfoWithContext.maskingPreset": "healthcare",
  "copyInfoWithContext.maskingStrategy": "full",
  "copyInfoWithContext.showMaskingIndicator": true,
  "copyInfoWithContext.includeMaskingStats": true
}
```

## Key Features in Latest Version

### 🎯 NEW in v1.4.3: Context-Aware Masking with Confidence Scoring

**Intelligent masking that understands context!** Eliminates false positives by analyzing surrounding text and detecting test data.

**What's New:**
- ✅ **Confidence Scoring Algorithm**: Calculates 0.0-1.0 confidence for each match before masking
- ✅ **Context Analysis**: Analyzes 100 characters before/after to understand intent
- ✅ **Statistical Anomaly Detection**: Automatically skips test/placeholder data (e.g., `111-11-1111`, `123-45-6789`, `test@example.com`)
- ✅ **Smart Detection**: Distinguishes "Reference: ABC123" (mask) from "Payment Info Reference [10]" (don't mask)
- ✅ **Configurable Threshold**: `maskingConfidenceThreshold` (default: 0.7) - adjust sensitivity
- ✅ **No More False Positives**: Natural language, ticket descriptions, and test data preserved

**Example:**
```
✅ Before: "CIB-5625 - Payment Info R***e [10] not displaying"
✅ After:  "CIB-5625 - Payment Info Reference [10] not displaying"

Still masks: "Reference: ABC123456" → "R***6" ✓
```

**Configuration:**
```json
{
  "copyInfoWithContext.maskingConfidenceThreshold": 0.7  // 0.5=aggressive, 0.7=balanced, 0.9=conservative
}
```

---

### 🎉 v1.4.0: Smart Data Masking (Phase 1)

**Protect sensitive data when sharing code!** Automatically detect and mask 25+ types of PII (Personally Identifiable Information) with industry-specific presets and configurable strategies.

> **⚠️ Important:** This feature is **disabled by default**. Enable it in settings: `"copyInfoWithContext.enableDataMasking": true`

**How to Enable:**
1. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac) to open Settings
2. Search for "masking"
3. Enable `Copy Info With Context: Enable Data Masking`
4. Choose your preset (Basic, Financial, Healthcare, Enterprise)

**What's New:**
- ✅ **25+ PII Types**: Email, phone, DOB, credit cards, bank accounts, passports, driver's licenses, and more
- ✅ **Smart Detection**: Pattern-based + column name recognition + context-aware exclusions
- ✅ **Industry Presets**: Basic, Financial, Healthcare, Enterprise, Custom
- ✅ **4 Masking Strategies**: Partial (readable), Full (maximum privacy), Structural (format-preserving), Hash (future)
- ✅ **Australian Support**: BSB, TFN, ABN, Medicare, Australian passports/licenses
- ✅ **International Banking**: IBAN, SWIFT/BIC, routing numbers
- ✅ **Identity Documents**: Passports, driver's licenses, national IDs (AU/US/UK/EU)
- ✅ **Field Name Protection**: Never masks XML/JSON tag names, only values
- ✅ **Date Intelligence**: Distinguishes birth dates from service/transaction dates using 25 exclusion keywords
- ✅ **Context-Aware Confidence Scoring** (v1.4.1): Eliminates false positives in plain text
- ✅ **100% Local**: No cloud processing, GDPR/CCPA/HIPAA compliant
- ✅ **Opt-In Design**: Disabled by default - you control when to use it

**Example:**
```csv
// Before masking:
Name,Email,Phone,BSB,AccountNo,DateOfBirth,Passport
John Doe,john@example.com,0412 345 678,123-456,987654321,1986-05-28,N1234567

// After masking (partial strategy, financial preset):
Name,Email,Phone,BSB,AccountNo,DateOfBirth,Passport
John Doe,j***@e***.com,0*** *** ***,***-*56,***321,1986-**-**,N*****7
```

**Perfect for:** Bug reports with customer data, documentation with real examples, code reviews with production configs, HIPAA/GDPR compliance

**📖 [Complete Data Masking Guide →](GUIDE-DATA-MASKING.md)**

---

### ✨ v1.3.0: CSV Intelligence with Four Output Modes

Copy CSV/TSV/PSV data exactly the way you need it - from compact to comprehensive. Press `Ctrl+Alt+X` (or `Cmd+Alt+X` on Mac) to cycle through modes, or set your preferred default in settings.

#### 📋 Mode 1: MINIMAL ⚡
**Best for**: Quick data sharing, compact output, single-line selections
**Features**:
- Clean, compact format with just the essentials
- Automatic header detection from line 1
- Smart partial field trimming (if you select mid-field, it auto-trims to the next complete field)
- Column context in header (shows which columns you selected)

**Example:**
```
// users.csv:5 (CSV (Comma-Separated) > Name, Email, Status)
5: John Doe,john@example.com,Active
```

When you select starting from a partial field like `ware,Bob Smith,5bcfd3f9...`, MINIMAL mode automatically trims "ware" and outputs:
```
// data.csv:2 (CSV (Comma-Separated) > Project lead, Project lead id, Summary)
2: Bob Smith,5bc4047479f99f6ec,Statement of Work Development
```

#### 🎯 Mode 2: SMART
**Best for**: Understanding data types, code reviews, API documentation
**Features**:
- Automatic column type detection (String, Integer, Float, Boolean)
- Column headers with types displayed
- Line numbers for each row
- Compact but informative format

**Example:**
```
// products.csv:10-12
// Columns: Product, Price, InStock, Rating
// Types: String, Float, Boolean, Float

10: Laptop, 999.99, true, 4.5
11: Mouse, 29.99, false, 4.2
12: Keyboard, 79.99, true, 4.8
```

#### 📊 Mode 3: TABLE
**Best for**: Presentations, Slack/Teams, documentation, visual clarity
**Features**:
- Beautiful ASCII tables with Unicode box-drawing characters
- Smart column alignment:
  - Numbers: right-aligned
  - Booleans: center-aligned
  - Text: left-aligned
- Automatic truncation with configurable limits
- Type hints and row/column summary

**Example:**
```
// transactions.csv:2-4 | 3 records

┌────────────┬───────────┬─────────┬──────────┐
│ Date       │ Merchant  │  Amount │ Status   │
├────────────┼───────────┼─────────┼──────────┤
│ 10/11/2025 │ PayPal    │   66.53 │ Pending  │
│ 10/11/2025 │ Amazon    │  328.00 │ Complete │
│ 10/11/2025 │ Transport │   10.00 │ Complete │
└────────────┴───────────┴─────────┴──────────┘

// Summary: 3 rows × 4 columns
```

Perfect for pasting into Slack, Teams, or documentation where visual clarity matters!

#### 🚀 Mode 4: DETAILED
**Best for**: Data analysis, debugging, comprehensive reports, understanding data patterns
**Features**:
- Everything from SMART mode, plus:
- **Statistics**: Min/max/avg for numeric columns, most/least common values
- **Insights**: Automatically identifies:
  - Empty/null columns
  - Identifier columns (emails, IDs, unique values)
  - Category columns (status, type, etc.)
  - Date/time columns
- Full data intelligence for informed decision-making

**Example:**
```
// sales.csv:2-5
// Columns: Region, Sales, Growth, Category
// Types: String, Float, Float, String

// Statistics:
//   Sales: min=1250.00, max=8900.50, avg=4523.17
//   Growth: min=2.1, max=15.7, avg=8.3

// Insights:
//   Category columns: Region, Category
//   Identifier columns: Region

// Data:
2: North, 8900.50, 15.7, Electronics
3: South, 3420.75, 8.2, Furniture
4: East, 5678.00, 12.1, Electronics
5: West, 1250.00, 2.1, Clothing

// Summary: 4 rows × 4 columns
```

#### 🎛️ Quick Mode Switching
- **Keyboard**: Press `Ctrl+Alt+X` (or `Cmd+Alt+X` on Mac) while in a CSV file to cycle through modes
- **Settings**: Set your preferred default mode in VS Code settings
- **Smart Detection**: Works with CSV, TSV, PSV, SSV, DSV files
- **Partial Field Handling**: All modes automatically trim incomplete fields at selection boundaries

**📖 [Complete CSV Intelligence Guide →](GUIDE-CSV-INTELLIGENCE.md)**

**Configuration:**
```json
{
  "copyInfoWithContext.csvOutputMode": "minimal",  // or "smart", "table", "detailed"
  "copyInfoWithContext.csvTableMaxRows": 20,       // Max rows in TABLE mode
  "copyInfoWithContext.csvTableMaxColumns": 10,    // Max columns in TABLE mode
  "copyInfoWithContext.csvTableAlignNumbers": "right"  // or "left"
}
```

### ✨ NEW in v1.2.0: Function/Class Context Detection
- **What it does**: Automatically detects and displays the function, class, or method name in the copy header
- **Supported languages**: JavaScript, TypeScript, C#, Python, PowerShell
- **How it works**: Searches backwards from your selection to find the containing function/class
- **Result**: Know exactly where your code came from at a glance

**Example:**
When copying code inside a function:
```typescript
// extension.ts:684-691 (detectDelimiter)
684: for (const delimiter of delimiters) {
685:     const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
686:     if (count > maxCount) {
687:         maxCount = count;
688:         bestDelimiter = delimiter;
689:     }
690: }
```

When copying code inside a class method:
```csharp
// UserService.cs:45-50 (MyApp.Services > UserService > ProcessData)
45: var users = await _repository.GetUsers();
46: foreach (var user in users) {
47:     ProcessUser(user);
48: }
```

### ✨ Smart Dedenting Algorithm
- **What it does**: Automatically removes excessive common indentation while preserving code structure
- **How it works**: Calculates minimum indentation across all lines and strips it from deeply nested code (>2 spaces)
- **Result**: Clean, readable code blocks without excessive leading whitespace but with hierarchy intact
- **Example**: Deeply nested XML at 8 spaces becomes left-aligned while maintaining parent-child relationships

**Before dedenting:**
```xml
        <Parties>
            <Party>
                <Name>John</Name>
            </Party>
        </Parties>
```

**After dedenting:**
```
1: <Parties>
2:     <Party>
3:         <Name>John</Name>
4:     </Party>
5: </Parties>
```

### 🐛 Fixed XML Indexing Issue
- **Problem**: XML sibling elements were being counted globally instead of within their parent container
- **Solution**: Implemented scope-aware sibling counting that only counts elements within the same parent
- **Result**: `Relation[5]` is now correctly shown as `Relation[2]` when it's the 3rd element in its container

### 🐛 Fixed JSON Array Indexing
- **Problem**: JSON array indices were calculated incorrectly for nested structures
- **Solution**: Complete rewrite of JSON path detection with proper context tracking
- **Result**: Accurate paths like `users[2].contacts[1]` instead of incorrect indexing

### 🐛 Fixed JSON vs CSV Detection
- **Problem**: JSON files were being incorrectly identified as CSV files
- **Solution**: Implemented priority-based file type detection with JSON taking precedence
- **Result**: JSON files are now properly detected and processed as JSON, not CSV

### 🐛 Fixed Line Numbering Consistency
- **Problem**: Line numbers not appearing consistently across different copy formats
- **Solution**: Consolidated line numbering logic into a single, reliable function
- **Result**: Line numbers now appear consistently across all copy formats when enabled

## Advanced Features

### Custom Format Selection
1. Select code or place cursor
2. Open Command Palette (`Ctrl+Shift+P`)
3. Type "Copy Info with Context Custom"
4. Choose from multiple formats:
   - Comment Style
   - Markdown Style  
   - HTML with Syntax Highlighting
   - ANSI Colored (Terminal)

### Large File Handling
The extension automatically handles large files:
- **< 5MB**: Full processing with all features
- **> 5MB**: Performance optimizations applied
- **Configurable limit**: Adjust `maxFileSize` setting as needed

### Intelligent Delimiter Detection
Automatically detects and handles:
- **CSV** (Comma-separated)
- **TSV** (Tab-separated)
- **PSV** (Pipe-separated)
- **SSV** (Semicolon-separated)
- **Custom delimiters** (colon, space, etc.)

## Development

### Building from Source
```bash
git clone https://github.com/dwmchan/copy-info-with-context.git
cd copy-info-with-context
npm install
npm run compile
```

### Running Tests
```bash
npm test
```

### Code Quality
```bash
npm run lint
```

### Testing with Node.js Built-in Test Runner
This extension uses Node.js built-in testing capabilities (Node 18+) instead of external frameworks:

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Supported File Types

| Category | Languages/Formats |
|----------|-------------------|
| **Programming** | JavaScript, TypeScript, Python, C#, Java, C/C++, Go, Rust |
| **Data** | JSON, JSONC, XML, HTML, YAML, CSV, TSV, PSV, SSV |
| **Styling** | CSS, SCSS, SASS, LESS |
| **Markup** | HTML, XML, XHTML, Markdown |
| **Configuration** | YAML, JSON, TOML, INI |

## Use Cases

### 🔧 Professional Communication
- **Bug Reports**: Include exact line numbers and file context
- **Code Reviews**: Share snippets with clear location references  
- **Documentation**: Rich formatted code blocks with syntax highlighting

### 💬 Team Collaboration
- **Slack/Teams**: Colored code blocks that stand out
- **Email**: Professional HTML formatting
- **GitHub Issues**: Properly formatted code blocks with context

### 📚 Documentation & Tutorials
- **README files**: Consistent code formatting
- **Wikis**: Context-aware code snippets
- **Blog posts**: Professional syntax highlighting

### 🛠 Debugging & Support
- **Stack Overflow**: Clear context and formatting
- **Support tickets**: Exact file and line references
- **Code sharing**: Always know where code came from

## Performance Optimizations

- **Single-pass parsing**: Efficient text processing algorithms
- **Memory-efficient**: Lightweight data structures and minimal memory footprint
- **Scope-aware processing**: Only processes relevant parts of files
- **Early termination**: Stops processing at target positions
- **Optimized regex usage**: Compiled patterns and efficient matching

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### [1.5.0] - 2025-11-21

#### 🎯 Major Enhancement: Hybrid Date of Birth Detection

**Replaced brittle keyword exclusion with intelligent hybrid validation:**
- ✅ **82% keyword reduction**: 33 exclusion keywords → 6 inclusion keywords
- ✅ **90%+ reduction** in false positives on business dates
- ✅ **Automatic future date exclusion** (age validation: 18-120 years)
- ✅ **Calendar validation** (rejects invalid dates like Feb 30)
- ✅ **Zero maintenance burden** for new business date types

**How it works:**
- Positive keyword matching: `birth`, `dob`, `dateofbirth`, `born`, `bday`, `birthday`
- Age validation: Date must represent 18-120 years old
- **Both conditions must be true** to mask

---

### [1.4.5] - 2025-11-21

#### 🔧 Enhancement: Field-Name-Based Detection for JSON/XML

**Added:**
- ✅ JSON/XML field name detection (same as CSV column detection)
- ✅ Fixed BSB/account number sequential pattern false positives
- ✅ Banking fields now mask in all formats (CSV, JSON, XML)

---

**📜 [View Complete Changelog →](CHANGELOG.md)**

For detailed release notes, bug fixes, and features from all versions, see the [CHANGELOG.md](CHANGELOG.md) file.

## Support

If you encounter any issues or have feature requests, please:

1. Check the [Issues](https://github.com/dwmchan/copy-info-with-context/issues) page
2. Create a new issue with detailed information
3. Include your VS Code version, extension version, and file type

## Credits

Created by Donald Chan (donald@iendeavour.com.au)

Special thanks to the VS Code community for feedback and suggestions that helped identify and fix the indexing and detection issues.