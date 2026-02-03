"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCopyWithContext = exports.alignCsvLinesToLeftmostColumn = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const config_1 = require("../utils/config");
const documentContext_1 = require("../utils/documentContext");
const formatting_1 = require("../utils/formatting");
const csvHelpers_1 = require("../utils/csvHelpers");
const fileHelpers_1 = require("../utils/fileHelpers");
const maskingEngine_1 = require("../utils/maskingEngine");
// Helper function to align CSV lines to the leftmost common column
function alignCsvLinesToLeftmostColumn(lines, document, selection, startLine, delimiter) {
    if (startLine <= 1 || lines.length === 0) {
        return lines;
    }
    // For each line, determine which column it starts at
    const lineColumnStarts = [];
    for (let i = 0; i < lines.length; i++) {
        try {
            const lineNumber = startLine - 1 + i;
            const fullLine = document.lineAt(lineNumber).text;
            // For multi-line selections, each line might start at a different character position
            // First line uses selection.start.character, subsequent lines use selection.start.character if rectangular selection
            // But typically for normal selections, we need to find where the selected text starts in the full line
            let selectionStartChar;
            if (i === 0) {
                selectionStartChar = selection.start.character;
            }
            else {
                // For subsequent lines, find where the selected text appears in the full line
                const selectedLineText = lines[i] ?? '';
                const indexInLine = fullLine.indexOf(selectedLineText);
                selectionStartChar = indexInLine >= 0 ? indexInLine : 0;
            }
            // Count delimiters before selection
            const beforeSelection = fullLine.substring(0, selectionStartChar);
            const delimiterCount = (beforeSelection.match(new RegExp(`\\${delimiter}`, 'g')) ?? []).length;
            // Check if starts mid-field
            const firstChar = (lines[i] ?? '').charAt(0);
            const startsWithPartialField = firstChar !== delimiter && firstChar !== '"' && firstChar !== "'";
            lineColumnStarts.push(startsWithPartialField ? delimiterCount + 1 : delimiterCount);
        }
        catch {
            lineColumnStarts.push(0);
        }
    }
    // Find minimum (leftmost) column
    const minColumn = Math.min(...lineColumnStarts);
    // Trim each line back to minColumn
    const trimmedLines = [];
    for (let i = 0; i < lines.length; i++) {
        try {
            const lineNumber = startLine - 1 + i;
            const fullLine = document.lineAt(lineNumber).text;
            const currentColumn = lineColumnStarts[i] ?? 0;
            if (currentColumn > minColumn) {
                // Find position of minColumn-th delimiter
                let delimitersSeen = 0;
                let trimPosition = 0;
                for (let pos = 0; pos < fullLine.length; pos++) {
                    if (fullLine[pos] === delimiter) {
                        delimitersSeen++;
                        if (delimitersSeen === minColumn) {
                            trimPosition = pos + 1;
                            break;
                        }
                    }
                }
                if (minColumn === 0) {
                    trimmedLines.push(fullLine);
                }
                else if (trimPosition > 0) {
                    trimmedLines.push(fullLine.substring(trimPosition));
                }
                else {
                    trimmedLines.push(lines[i] ?? '');
                }
            }
            else {
                trimmedLines.push(lines[i] ?? '');
            }
        }
        catch {
            trimmedLines.push(lines[i] ?? '');
        }
    }
    return trimmedLines;
}
exports.alignCsvLinesToLeftmostColumn = alignCsvLinesToLeftmostColumn;
// Main copy handler
async function handleCopyWithContext() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        void vscode.window.showInformationMessage('No active editor');
        return;
    }
    const document = editor.document;
    const selection = editor.selection;
    const fileName = document.fileName;
    const displayName = document.isUntitled
        ? 'Untitled'
        : path.basename(fileName);
    let selectedText;
    let startLine;
    let endLine;
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    }
    else {
        selectedText = document.getText(selection);
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;
    }
    // File type detection (used for masking and CSV processing)
    const language = document.languageId;
    const filename = document.fileName.toLowerCase();
    // ========== DATA MASKING ==========
    const maskingConfig = (0, maskingEngine_1.getMaskingConfig)();
    let maskedResult;
    if (maskingConfig.enabled) {
        // Check if CSV file for column-aware masking
        const isCsvFile = (language === 'csv' || language === 'tsv' || language === 'psv' ||
            filename.endsWith('.csv') || filename.endsWith('.tsv') ||
            filename.endsWith('.psv') || filename.endsWith('.ssv') ||
            filename.endsWith('.dsv'));
        if (isCsvFile) {
            // For CSV, we need to provide headers if user selected data rows without header
            let headersLine;
            // If selection starts after line 1, get the header from line 1
            if (startLine > 1) {
                try {
                    headersLine = document.lineAt(0).text;
                }
                catch {
                    // If we can't get line 1, fall back to treating first selected line as header
                    headersLine = undefined;
                }
            }
            maskedResult = (0, maskingEngine_1.maskCsvText)(selectedText, maskingConfig, headersLine);
        }
        else {
            maskedResult = (0, maskingEngine_1.maskText)(selectedText, maskingConfig);
        }
        // Use masked text for further processing
        selectedText = maskedResult.maskedText;
        // Show user feedback
        (0, maskingEngine_1.updateMaskingStatusBar)(maskedResult, maskingConfig);
        if (maskedResult.detections.length > 0) {
            (0, maskingEngine_1.showMaskingNotification)(maskedResult, maskingConfig);
        }
    }
    else {
        maskedResult = {
            maskedText: selectedText,
            detections: [],
            maskingApplied: false
        };
    }
    // ======================================
    const config = (0, config_1.getConfig)();
    const sizeInfo = (0, fileHelpers_1.getFileSizeInfo)(document);
    // Check if this is a CSV file and TABLE mode is enabled
    // (filename and language already declared in masking section above)
    const isCSVFile = (language === 'csv' || language === 'tsv' || language === 'psv' ||
        filename.endsWith('.csv') || filename.endsWith('.tsv') ||
        filename.endsWith('.psv') || filename.endsWith('.ssv') ||
        filename.endsWith('.dsv'));
    // If TABLE, SMART, or DETAILED mode and CSV file, use enhanced format
    if ((config.csvOutputMode === 'table' || config.csvOutputMode === 'smart' || config.csvOutputMode === 'detailed') && isCSVFile && !selection.isEmpty) {
        const delimiter = (0, csvHelpers_1.detectDelimiter)(document.getText());
        const lines = selectedText.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
            // Align all lines to the leftmost column
            const adjustedLines = alignCsvLinesToLeftmostColumn(lines, document, selection, startLine, delimiter);
            // Calculate column offset (which column we start from after alignment)
            let columnOffset = 0;
            if (startLine > 1 && adjustedLines.length > 0) {
                try {
                    const fullLine = document.lineAt(startLine - 1).text;
                    const selectionStart = selection.start.character;
                    const firstChar = (lines[0] ?? '').charAt(0);
                    const startsWithPartialField = firstChar !== delimiter && firstChar !== '"' && firstChar !== "'";
                    // Count delimiters before selection
                    const beforeSelection = fullLine.substring(0, selectionStart);
                    const delimiterCount = (beforeSelection.match(new RegExp(`\\${delimiter}`, 'g')) ?? []).length;
                    // If started with partial field, we're now at the next column
                    columnOffset = startsWithPartialField ? delimiterCount + 1 : delimiterCount;
                    // But we trimmed back to the minimum, so recalculate
                    // Find the minimum column from all lines
                    const lineColumnStarts = [];
                    for (let i = 0; i < lines.length; i++) {
                        const lineNumber = startLine - 1 + i;
                        const lineFullText = document.lineAt(lineNumber).text;
                        // For multi-line selections, find where the selected text actually starts in the full line
                        let lineSelStart;
                        if (i === 0) {
                            lineSelStart = selection.start.character;
                        }
                        else {
                            // Find where the selected text appears in the full line
                            const selectedLineText = lines[i] ?? '';
                            const indexInLine = lineFullText.indexOf(selectedLineText);
                            lineSelStart = indexInLine >= 0 ? indexInLine : 0;
                        }
                        const lineBeforeSelection = lineFullText.substring(0, lineSelStart);
                        const lineDelimiterCount = (lineBeforeSelection.match(new RegExp(`\\${delimiter}`, 'g')) ?? []).length;
                        const lineFirstChar = (lines[i] ?? '').charAt(0);
                        const lineStartsPartial = lineFirstChar !== delimiter && lineFirstChar !== '"' && lineFirstChar !== "'";
                        lineColumnStarts.push(lineStartsPartial ? lineDelimiterCount + 1 : lineDelimiterCount);
                    }
                    columnOffset = Math.min(...lineColumnStarts);
                }
                catch {
                    columnOffset = 0;
                }
            }
            // Parse rows
            const rows = adjustedLines.map(line => {
                // Simple CSV parsing (handles basic cases)
                return line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
            });
            // Try to get header from line 1 if available
            let headers;
            let dataRows = rows;
            // Check if first line of file looks like headers (not in selection)
            if (startLine > 1) {
                // Selection starts after line 1, try to get actual headers from line 1
                try {
                    const headerLine = document.lineAt(0).text;
                    if (headerLine.includes(delimiter)) {
                        const allHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
                        const selectedColumnCount = rows[0]?.length ?? 0;
                        // Take headers starting from columnOffset
                        if (allHeaders.length >= columnOffset + selectedColumnCount) {
                            headers = allHeaders.slice(columnOffset, columnOffset + selectedColumnCount);
                        }
                        else {
                            // Fallback to generic names if something is wrong
                            headers = (rows[0] ?? []).map((_, idx) => `Column_${idx + 1}`);
                        }
                    }
                    else {
                        headers = (rows[0] ?? []).map((_, idx) => `Column_${idx + 1}`);
                    }
                }
                catch {
                    headers = (rows[0] ?? []).map((_, idx) => `Column_${idx + 1}`);
                }
            }
            else if (startLine === 1) {
                // Selection includes line 1 - use first row as header, rest as data
                headers = rows[0] ?? [];
                dataRows = rows.slice(1);
            }
            else {
                headers = (rows[0] ?? []).map((_, idx) => `Column_${idx + 1}`);
            }
            if (dataRows.length === 0) {
                dataRows = rows; // Fallback if no data rows
            }
            if (config.csvOutputMode === 'table') {
                // Build table
                const table = (0, csvHelpers_1.buildAsciiTable)(dataRows, headers, config);
                const lineRange = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
                const header = `// ${displayName}:${lineRange}`;
                const summary = ` | ${dataRows.length} record${dataRows.length !== 1 ? 's' : ''}`;
                const output = `${header}${summary}\n\n${table}\n\n// Summary: ${dataRows.length} row${dataRows.length !== 1 ? 's' : ''} Ã— ${headers.length} column${headers.length !== 1 ? 's' : ''}`;
                await vscode.env.clipboard.writeText(output);
                void vscode.window.showInformationMessage('CSV data copied as table!');
                return;
            }
            else if (config.csvOutputMode === 'smart') {
                // SMART mode - compact with types
                const lineRange = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
                const header = `// ${displayName}:${lineRange}`;
                // Format data rows with line numbers
                const formattedRows = dataRows.map((row, idx) => {
                    const lineNum = startLine + (startLine === 1 ? idx + 1 : idx);
                    const rowData = row.join(', ');
                    return `${lineNum}: ${rowData}`;
                }).join('\n');
                // Detect column types
                const types = headers.map((_h, i) => {
                    const colValues = dataRows.map(r => r[i] ?? '');
                    const numCount = colValues.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
                    const boolCount = colValues.filter(v => ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase())).length;
                    if (boolCount > colValues.length * 0.7) {
                        return 'Boolean';
                    }
                    if (numCount > colValues.length * 0.7) {
                        const hasDecimals = colValues.some(v => v.includes('.'));
                        return hasDecimals ? 'Float' : 'Integer';
                    }
                    return 'String';
                });
                const output = `${header}\n// Columns: ${headers.join(', ')}\n// Types: ${types.join(', ')}\n\n${formattedRows}`;
                await vscode.env.clipboard.writeText(output);
                void vscode.window.showInformationMessage('CSV data copied in SMART mode!');
                return;
            }
            else if (config.csvOutputMode === 'detailed') {
                // DETAILED mode - Full intelligence with analytics and insights
                const lineRange = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
                const header = `// ${displayName}:${lineRange}`;
                // Format data rows with line numbers
                const formattedRows = dataRows.map((row, idx) => {
                    const lineNum = startLine + (startLine === 1 ? idx + 1 : idx);
                    const rowData = row.join(', ');
                    return `${lineNum}: ${rowData}`;
                }).join('\n');
                // Detect column types
                const types = headers.map((_h, i) => {
                    const colValues = dataRows.map(r => r[i] ?? '');
                    const numCount = colValues.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
                    const boolCount = colValues.filter(v => ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase())).length;
                    if (boolCount > colValues.length * 0.7) {
                        return 'Boolean';
                    }
                    if (numCount > colValues.length * 0.7) {
                        const hasDecimals = colValues.some(v => v.includes('.'));
                        return hasDecimals ? 'Float' : 'Integer';
                    }
                    return 'String';
                });
                // Calculate statistics for numeric columns
                const statistics = [];
                headers.forEach((h, i) => {
                    const colValues = dataRows.map(r => r[i] ?? '');
                    const numericValues = colValues.filter(v => !isNaN(Number(v)) && v.trim() !== '').map(v => Number(v));
                    if (numericValues.length > colValues.length * 0.7) {
                        const min = Math.min(...numericValues);
                        const max = Math.max(...numericValues);
                        const sum = numericValues.reduce((a, b) => a + b, 0);
                        const avg = sum / numericValues.length;
                        statistics.push(`  ${h}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, avg=${avg.toFixed(2)}`);
                    }
                });
                // Detect patterns and insights
                const insights = [];
                // Check for ID columns
                const idColumns = headers.filter(h => h.toLowerCase().includes('id') ||
                    h.toLowerCase().includes('key') ||
                    h.toLowerCase().includes('number'));
                if (idColumns.length > 0) {
                    insights.push(`Identifier columns: ${idColumns.join(', ')}`);
                }
                // Check for status/category columns
                const categoryColumns = headers.filter((_h, i) => {
                    const colValues = dataRows.map(r => r[i] ?? '');
                    const uniqueValues = new Set(colValues);
                    return uniqueValues.size < colValues.length * 0.5 && uniqueValues.size > 1;
                });
                if (categoryColumns.length > 0) {
                    insights.push(`Category columns: ${categoryColumns.join(', ')}`);
                }
                // Check for date columns
                const dateColumns = headers.filter(h => h.toLowerCase().includes('date') ||
                    h.toLowerCase().includes('time') ||
                    h.toLowerCase().includes('timestamp'));
                if (dateColumns.length > 0) {
                    insights.push(`Date/Time columns: ${dateColumns.join(', ')}`);
                }
                // Build detailed output
                const parts = [
                    header,
                    `// Columns: ${headers.join(', ')}`,
                    `// Types: ${types.join(', ')}`,
                    ''
                ];
                if (statistics.length > 0) {
                    parts.push('// Statistics:');
                    parts.push(...statistics);
                    parts.push('');
                }
                if (insights.length > 0) {
                    parts.push('// Insights:');
                    insights.forEach(insight => parts.push(`//   ${insight}`));
                    parts.push('');
                }
                parts.push('// Data:');
                parts.push(formattedRows);
                parts.push('');
                parts.push(`// Summary: ${dataRows.length} row${dataRows.length !== 1 ? 's' : ''} Ã— ${headers.length} column${headers.length !== 1 ? 's' : ''}`);
                const output = parts.join('\n');
                await vscode.env.clipboard.writeText(output);
                void vscode.window.showInformationMessage('CSV data copied in DETAILED mode!');
                return;
            }
        }
    }
    // MINIMAL mode: Trim partial fields for CSV files
    if (config.csvOutputMode === 'minimal' && !selection.isEmpty) {
        const isCSVFile = (language === 'csv' || language === 'tsv' || language === 'psv' ||
            filename.endsWith('.csv') || filename.endsWith('.tsv') ||
            filename.endsWith('.psv') || filename.endsWith('.ssv') ||
            filename.endsWith('.dsv'));
        if (isCSVFile) {
            const delimiter = (0, csvHelpers_1.detectDelimiter)(document.getText());
            const lines = selectedText.split('\n');
            // Align all lines to the leftmost column
            const trimmedLines = alignCsvLinesToLeftmostColumn(lines, document, selection, startLine, delimiter);
            selectedText = trimmedLines.join('\n');
        }
    }
    let contextInfo = '';
    if (config.showContextPath) {
        let context = (0, documentContext_1.getDocumentContext)(document, selection.start);
        // Only try delimited detection if not in performance mode
        if (!context && !selection.isEmpty && !sizeInfo.isLarge) {
            const isExplicitlyDelimited = (language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv'));
            if (isExplicitlyDelimited) {
                context = (0, csvHelpers_1.getDelimitedContextWithSelection)(document, selection);
            }
        }
        // Skip path enhancement for large files (performance optimization)
        if (context && !sizeInfo.isLarge) {
            context = (0, documentContext_1.enhancePathWithArrayIndices)(context, document, selection.start, document.languageId);
        }
        if (context) {
            contextInfo = ` (${context})`;
        }
    }
    let lineNumberInfo = '';
    if (startLine === endLine) {
        lineNumberInfo = `:${startLine}`;
    }
    else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    const formattedContent = (0, formatting_1.formatCodeWithLineNumbers)(selectedText, startLine, config.showLineNumbers, config.lineNumberPadding);
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const output = `${header}\n${formattedContent}`;
    await vscode.env.clipboard.writeText(output);
    // Show different message for performance mode
    if (sizeInfo.isLarge) {
        void vscode.window.showInformationMessage(`Code copied! (Performance mode: ${sizeInfo.lineCount} lines)`);
    }
    else {
        void vscode.window.showInformationMessage('Code copied with context!');
    }
}
exports.handleCopyWithContext = handleCopyWithContext;
//# sourceMappingURL=copyWithContext.js.map