"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHtmlWithSyntaxHighlighting = exports.addBasicSyntaxHighlighting = exports.escapeHtml = exports.formatCodeWithLineNumbers = void 0;
function formatCodeWithLineNumbers(selectedText, startLine, showLineNumbers, useLineNumberPadding) {
    if (!showLineNumbers) {
        return selectedText;
    }
    const lines = selectedText.split('\n');
    const maxLineNumber = startLine + lines.length - 1;
    const padding = useLineNumberPadding ? maxLineNumber.toString().length : 0;
    // Find minimum indentation across all non-empty lines
    const minIndent = lines.reduce((min, line) => {
        if (line.trim().length === 0) {
            return min;
        } // Skip empty lines
        const indent = line.length - line.trimStart().length;
        return Math.min(min, indent);
    }, Infinity);
    // Determine how much to strip: if min > 2, strip enough to bring it down to acceptable level
    // Handle case where all lines are empty (minIndent would be Infinity)
    const stripAmount = (minIndent !== Infinity && minIndent > 2) ? minIndent : 0;
    const numberedLines = lines.map((line, index) => {
        const lineNumber = startLine + index;
        const paddedLineNumber = useLineNumberPadding
            ? lineNumber.toString().padStart(padding, ' ')
            : lineNumber.toString();
        // Strip common indentation while maintaining relative structure
        let processedLine = line;
        if (stripAmount > 0 && line.length > stripAmount) {
            processedLine = line.substring(stripAmount);
        }
        return `${paddedLineNumber}: ${processedLine}`;
    });
    return numberedLines.join('\n');
}
exports.formatCodeWithLineNumbers = formatCodeWithLineNumbers;
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
exports.escapeHtml = escapeHtml;
function addBasicSyntaxHighlighting(code, language) {
    let highlighted = escapeHtml(code);
    switch (language) {
        case 'json':
        case 'jsonc':
            highlighted = highlighted
                .replace(/(".*?")/g, '<span style="color: #CE9178">$1</span>')
                .replace(/\b(\d+\.?\d*)\b/g, '<span style="color: #B5CEA8">$1</span>')
                .replace(/\b(true|false|null)\b/g, '<span style="color: #569CD6">$1</span>');
            break;
        case 'javascript':
        case 'typescript':
            highlighted = highlighted
                .replace(/\b(const|let|var|function|class|if|else|for|while|return|import|export)\b/g, '<span style="color: #569CD6">$1</span>')
                .replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: #CE9178">$1</span>');
            break;
        case 'xml':
        case 'html':
            highlighted = highlighted
                .replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-_]*)/g, '$1<span style="color: #569CD6">$2</span>')
                .replace(/([a-zA-Z-]+)=(".*?")/g, '<span style="color: #9CDCFE">$1</span>=<span style="color: #CE9178">$2</span>');
            break;
    }
    return highlighted;
}
exports.addBasicSyntaxHighlighting = addBasicSyntaxHighlighting;
function createHtmlWithSyntaxHighlighting(code, language, header) {
    const highlightedCode = addBasicSyntaxHighlighting(code, language);
    return `<div style="font-family: 'Consolas', 'Monaco', monospace; background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px;">
<div style="color: #6a9955; margin-bottom: 8px;">${escapeHtml(header)}</div>
<pre style="margin: 0; white-space: pre-wrap;">${highlightedCode}</pre>
</div>`;
}
exports.createHtmlWithSyntaxHighlighting = createHtmlWithSyntaxHighlighting;
//# sourceMappingURL=formatting.js.map