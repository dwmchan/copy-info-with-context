# Copy with Context - VS Code Extension

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
- **Programming Languages**: Function and class context for JavaScript, TypeScript, Python, C#, and more
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

### ⚡ Performance & Reliability
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
3. Type `ext install copy-with-context`
4. Press Enter and reload VS Code

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=donald-chan.copy-with-context).

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
| `copyWithContext.showLineNumbers` | `true` | Show line numbers on each copied line |
| `copyWithContext.lineNumberPadding` | `false` | Add padding for consistent line number alignment |
| `copyWithContext.showContextPath` | `true` | Show contextual path information |
| `copyWithContext.enableColorCoding` | `false` | Enable syntax highlighting in default copy |
| `copyWithContext.colorTheme` | `"dark"` | Color theme for syntax highlighting |
| `copyWithContext.showArrayIndices` | `true` | Show array indices in context paths |
| `copyWithContext.maxFileSize` | `5000000` | Maximum file size to process (bytes) |

### Example Configuration
```json
{
  "copyWithContext.showLineNumbers": true,
  "copyWithContext.showContextPath": true,
  "copyWithContext.enableColorCoding": false,
  "copyWithContext.maxFileSize": 10000000
}
```

## Key Fixes in Latest Version

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
3. Type "Copy with Context Custom"
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
git clone https://github.com/dwmchan/copy-with-context.git
cd copy-with-context
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

### 🐛 Debugging & Support
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

### v1.0.0
- ✅ Fixed XML sibling indexing issue (Relation[5] → Relation[2])
- ✅ Fixed JSON array indexing for nested structures
- ✅ Fixed JSON vs CSV file type detection priority
- ✅ Fixed line numbering consistency across all formats
- ✅ Implemented memory-efficient processing algorithms
- ✅ Added comprehensive test suite using Node.js built-in testing
- ✅ Enhanced error handling and fallback mechanisms
- ✅ Improved performance for large files

## Support

If you encounter any issues or have feature requests, please:

1. Check the [Issues](https://github.com/dwmchan/copy-with-context/issues) page
2. Create a new issue with detailed information
3. Include your VS Code version, extension version, and file type

## Credits

Created by Donald Chan (donald@iendeavour.com.au)

Special thanks to the VS Code community for feedback and suggestions that helped identify and fix the indexing and detection issues.