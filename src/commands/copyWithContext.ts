import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig } from '../utils/config';
import { getDocumentContext, enhancePathWithArrayIndices } from '../utils/documentContext';
import { formatCodeWithLineNumbers } from '../utils/formatting';
import { detectDelimiter, parseDelimitedLine, buildAsciiTable, getDelimitedContextWithSelection } from '../utils/csvHelpers';
import { getFileSizeInfo } from '../utils/fileHelpers';

// Main copy handler
export async function handleCopyWithContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document;
    const selection = editor.selection;

    const fileName = document.fileName;
    const displayName = document.isUntitled
        ? 'Untitled'
        : path.basename(fileName);

    let selectedText: string;
    let startLine: number;
    let endLine: number;

    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    } else {
        selectedText = document.getText(selection);
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;
    }

    const config = getConfig();
    const sizeInfo = getFileSizeInfo(document);

    // Check if this is a CSV file and TABLE mode is enabled
    const filename = document.fileName.toLowerCase();
    const language = document.languageId;
    const isCSVFile = (
        language === 'csv' || language === 'tsv' || language === 'psv' ||
        filename.endsWith('.csv') || filename.endsWith('.tsv') ||
        filename.endsWith('.psv') || filename.endsWith('.ssv') ||
        filename.endsWith('.dsv')
    );

    // If TABLE, SMART, or DETAILED mode and CSV file, use enhanced format
    if ((config.csvOutputMode === 'table' || config.csvOutputMode === 'smart' || config.csvOutputMode === 'detailed') && isCSVFile && !selection.isEmpty) {
        const delimiter = detectDelimiter(document.getText());
        const lines = selectedText.split('\n').filter(line => line.trim().length > 0);

        if (lines.length > 0) {
            // Detect if selection starts mid-field by checking if first character is a delimiter
            let adjustedLines = lines;
            let columnOffset = 0; // Track which column index we start from

            // If selection starts after line 1, check if we need to trim partial columns
            if (startLine > 1) {
                // Check if the first line starts with a partial field (doesn't start with delimiter or quote)
                const firstLine = lines[0]!;
                const firstChar = firstLine.charAt(0);

                // If first character is not a delimiter and not a quote, we likely have a partial field
                if (firstChar !== delimiter && firstChar !== '"' && firstChar !== "'") {
                    // Find the first delimiter to skip the partial field
                    const firstDelimiterIndex = firstLine.indexOf(delimiter);
                    if (firstDelimiterIndex > 0) {
                        // Adjust all lines to start from the first complete field
                        adjustedLines = lines.map(line => {
                            const delimiterIndex = line.indexOf(delimiter);
                            return delimiterIndex > 0 ? line.substring(delimiterIndex + 1) : line;
                        });

                        // Calculate column offset by counting delimiters before selection in the full line
                        try {
                            const fullLine = document.lineAt(startLine - 1).text; // Get full data row
                            const selectionStart = selection.start.character;
                            const beforeSelection = fullLine.substring(0, selectionStart);
                            // Count complete fields before selection (delimiters + 1)
                            columnOffset = (beforeSelection.match(new RegExp(`\\${delimiter}`, 'g')) || []).length + 1;
                        } catch {
                            columnOffset = 0;
                        }
                    }
                }
            }

            // Parse rows
            const rows = adjustedLines.map(line => {
                // Simple CSV parsing (handles basic cases)
                return line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
            });

            // Try to get header from line 1 if available
            let headers: string[];
            let dataRows = rows;

            // Check if first line of file looks like headers (not in selection)
            if (startLine > 1) {
                // Selection starts after line 1, try to get actual headers from line 1
                try {
                    const headerLine = document.lineAt(0).text;
                    if (headerLine.includes(delimiter)) {
                        const allHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
                        const selectedColumnCount = rows[0]?.length || 0;

                        // Take headers starting from columnOffset
                        if (allHeaders.length >= columnOffset + selectedColumnCount) {
                            headers = allHeaders.slice(columnOffset, columnOffset + selectedColumnCount);
                        } else {
                            // Fallback to generic names if something is wrong
                            headers = rows[0]!.map((_, idx) => `Column_${idx + 1}`);
                        }
                    } else {
                        headers = rows[0]!.map((_, idx) => `Column_${idx + 1}`);
                    }
                } catch {
                    headers = rows[0]!.map((_, idx) => `Column_${idx + 1}`);
                }
            } else if (startLine === 1) {
                // Selection includes line 1 - use first row as header, rest as data
                headers = rows[0]!;
                dataRows = rows.slice(1);
            } else {
                headers = rows[0]!.map((_, idx) => `Column_${idx + 1}`);
            }

            if (dataRows.length === 0) {
                dataRows = rows; // Fallback if no data rows
            }

            if (config.csvOutputMode === 'table') {
                // Build table
                const table = buildAsciiTable(dataRows, headers, config);

                const lineRange = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
                const header = `// ${displayName}:${lineRange}`;
                const summary = ` | ${dataRows.length} record${dataRows.length !== 1 ? 's' : ''}`;

                const output = `${header}${summary}\n\n${table}\n\n// Summary: ${dataRows.length} row${dataRows.length !== 1 ? 's' : ''} × ${headers.length} column${headers.length !== 1 ? 's' : ''}`;

                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage('CSV data copied as table!');
                return;
            } else if (config.csvOutputMode === 'smart') {
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
                const types = headers.map((h, i) => {
                    const colValues = dataRows.map(r => r[i] || '');
                    const numCount = colValues.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
                    const boolCount = colValues.filter(v => ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase())).length;

                    if (boolCount > colValues.length * 0.7) return 'Boolean';
                    if (numCount > colValues.length * 0.7) {
                        const hasDecimals = colValues.some(v => v.includes('.'));
                        return hasDecimals ? 'Float' : 'Integer';
                    }
                    return 'String';
                });

                const output = `${header}\n// Columns: ${headers.join(', ')}\n// Types: ${types.join(', ')}\n\n${formattedRows}`;

                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage('CSV data copied in SMART mode!');
                return;
            } else if (config.csvOutputMode === 'detailed') {
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
                const types = headers.map((h, i) => {
                    const colValues = dataRows.map(r => r[i] || '');
                    const numCount = colValues.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
                    const boolCount = colValues.filter(v => ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase())).length;

                    if (boolCount > colValues.length * 0.7) return 'Boolean';
                    if (numCount > colValues.length * 0.7) {
                        const hasDecimals = colValues.some(v => v.includes('.'));
                        return hasDecimals ? 'Float' : 'Integer';
                    }
                    return 'String';
                });

                // Calculate statistics for numeric columns
                const statistics: string[] = [];
                headers.forEach((h, i) => {
                    const colValues = dataRows.map(r => r[i] || '');
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
                const insights: string[] = [];

                // Check for ID columns
                const idColumns = headers.filter(h =>
                    h.toLowerCase().includes('id') ||
                    h.toLowerCase().includes('key') ||
                    h.toLowerCase().includes('number')
                );
                if (idColumns.length > 0) {
                    insights.push(`Identifier columns: ${idColumns.join(', ')}`);
                }

                // Check for status/category columns
                const categoryColumns = headers.filter((h, i) => {
                    const colValues = dataRows.map(r => r[i] || '');
                    const uniqueValues = new Set(colValues);
                    return uniqueValues.size < colValues.length * 0.5 && uniqueValues.size > 1;
                });
                if (categoryColumns.length > 0) {
                    insights.push(`Category columns: ${categoryColumns.join(', ')}`);
                }

                // Check for date columns
                const dateColumns = headers.filter(h =>
                    h.toLowerCase().includes('date') ||
                    h.toLowerCase().includes('time') ||
                    h.toLowerCase().includes('timestamp')
                );
                if (dateColumns.length > 0) {
                    insights.push(`Date/Time columns: ${dateColumns.join(', ')}`);
                }

                // Build detailed output
                const parts: string[] = [
                    header,
                    '// Columns: ' + headers.join(', '),
                    '// Types: ' + types.join(', '),
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
                parts.push(`// Summary: ${dataRows.length} row${dataRows.length !== 1 ? 's' : ''} × ${headers.length} column${headers.length !== 1 ? 's' : ''}`);

                const output = parts.join('\n');

                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage('CSV data copied in DETAILED mode!');
                return;
            }
        }
    }

    // MINIMAL mode: Trim partial fields for CSV files
    if (config.csvOutputMode === 'minimal' && !selection.isEmpty) {
        const isCSVFile = (
            language === 'csv' || language === 'tsv' || language === 'psv' ||
            filename.endsWith('.csv') || filename.endsWith('.tsv') ||
            filename.endsWith('.psv') || filename.endsWith('.ssv') ||
            filename.endsWith('.dsv')
        );

        if (isCSVFile) {
            const delimiter = detectDelimiter(document.getText());
            const lines = selectedText.split('\n');

            if (lines.length > 0) {
                const firstLine = lines[0]!;
                const firstChar = firstLine.charAt(0);

                // If first character is not a delimiter and not a quote, we likely have a partial field
                if (firstChar !== delimiter && firstChar !== '"' && firstChar !== "'") {
                    // Find the first delimiter to skip the partial field
                    const firstDelimiterIndex = firstLine.indexOf(delimiter);
                    if (firstDelimiterIndex > 0) {
                        // Trim all lines to start from the first complete field
                        const trimmedLines = lines.map(line => {
                            const delimiterIndex = line.indexOf(delimiter);
                            return delimiterIndex > 0 ? line.substring(delimiterIndex + 1) : line;
                        });
                        selectedText = trimmedLines.join('\n');
                    }
                }
            }
        }
    }

    let contextInfo = '';
    if (config.showContextPath) {
        let context = getDocumentContext(document, selection.start);

        // Only try delimited detection if not in performance mode
        if (!context && !selection.isEmpty && !sizeInfo.isLarge) {

            const isExplicitlyDelimited = (
                language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv')
            );

            if (isExplicitlyDelimited) {
                context = getDelimitedContextWithSelection(document, selection);
            }
        }

        // Skip path enhancement for large files (performance optimization)
        if (context && !sizeInfo.isLarge) {
            context = enhancePathWithArrayIndices(context, document, selection.start, document.languageId);
        }

        if (context) {
            contextInfo = ` (${context})`;
        }
    }

    let lineNumberInfo = '';
    if (startLine === endLine) {
        lineNumberInfo = `:${startLine}`;
    } else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }

    const formattedContent = formatCodeWithLineNumbers(
        selectedText,
        startLine,
        config.showLineNumbers,
        config.lineNumberPadding
    );

    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const output = `${header}\n${formattedContent}`;

    await vscode.env.clipboard.writeText(output);

    // Show different message for performance mode
    if (sizeInfo.isLarge) {
        vscode.window.showInformationMessage(`Code copied! (Performance mode: ${sizeInfo.lineCount} lines)`);
    } else {
        vscode.window.showInformationMessage('Code copied with context!');
    }
}
