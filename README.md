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

- **Context Detection**: JSON/JSONC property paths, XML/HTML hierarchy, CSV/TSV/PSV columns, function/class context, CSS selectors.
- **Multiple Output Formats**: Plain text, HTML, Markdown, ANSI colored, custom formats.
- **Syntax Highlighting**: 10+ languages, smart color coding, auto-detects delimited files.
- **Smart Data Masking**: Detects and masks 40+ types of PII (email, phone, address, credit cards, SSN, IBAN, BSB, TFN, ABN, passports, IDs, etc.)  
  - **Industry Presets**: Basic, Financial, Healthcare, Enterprise, Custom
  - **Masking Strategies**: Partial, Full, Structural, Hash, Redact
  - **Disabled by default** – [Enable in settings](#configuration)
- **CSV Intelligence**: Delimiter detection, quote-aware parsing, column type detection, ASCII table rendering.
- **Performance Optimizations**: Fast parsing, memory-efficient, O(1) lookups, lazy RegExp compilation.
- **VS Code Integration**: Keyboard shortcuts, right-click menu, command palette, status bar indicator.

## Quick Start

1. Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=donald-chan.copy-info-with-context)
2. Copy code/data with context using:
   - `Ctrl+Alt+C` / `Cmd+Alt+C` – Copy with context
   - `Ctrl+Alt+H` / `Cmd+Alt+H` – Copy with HTML highlighting
3. Configure features in VS Code settings (`Ctrl+,` → search "copy info with context")

## Configuration

See [Configuration Guide](./GUIDE-DATA-MASKING.md#configuration-options) for all settings.

**Example: Enable Data Masking**
```json
{
  "copyInfoWithContext.enableDataMasking": true,
  "copyInfoWithContext.maskingPreset": "financial"
}
```

## Usage Examples

- **JSON**: Shows property path and array indices
- **XML**: Shows element hierarchy and sibling indices
- **CSV**: Shows column context and supports 4 output modes
- **Functions/Classes**: Shows containing function/class name
- **HTML/Markdown/ANSI**: Rich formatted output for documentation, Slack, email

See [Usage Examples](./GUIDE-DATA-MASKING.md#usage-examples) for details.

## Key Features in Latest Version

### 🏗️ v1.6.0: Modular Architecture & Performance Optimization

- Monolithic masking engine split into 8 focused modules for maintainability, speed, and testability.
- 66% code reduction (1,739 → ~590 lines).
- 97% faster module load time, 50-70% fewer false positives, O(1) lookups.
- Enhanced maintainability and testability.
- [See full details in CHANGELOG.md](./CHANGELOG.md#160---2025-12-01)

## Documentation & Guides

- [🔒 Data Masking Guide](./GUIDE-DATA-MASKING.md)
- [📊 CSV Intelligence Guide](./GUIDE-CSV-INTELLIGENCE.md)
- [🎯 Confidence Scoring Example](./Confidence-Scoring-Example.md)
- [🧠 Context-Aware Masking](./context-aware-masking.md)
- [📜 Full Changelog](./CHANGELOG.md)

## Supported File Types

| Category      | Formats/Languages                |
|---------------|----------------------------------|
| Programming   | JS, TS, Python, C#, Java, Go, Rust |
| Data          | JSON, XML, HTML, YAML, CSV, TSV, PSV, SSV |
| Styling       | CSS, SCSS, SASS, LESS            |
| Markup        | HTML, XML, Markdown              |
| Configuration | YAML, JSON, TOML, INI            |

## Development

```bash
git clone https://github.com/dwmchan/copy-info-with-context.git
cd copy-info-with-context
npm install
npm run compile
npm test
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License – see [LICENSE](./LICENSE).

## Support

- [Issues](https://github.com/dwmchan/copy-info-with-context/issues)
- [CHANGELOG](./CHANGELOG.md)
- [Feature Guides](#documentation--guides)

## Credits

Created by Donald Chan (donald@iendeavour.com.au)

Special thanks to the VS Code community for feedback and suggestions.