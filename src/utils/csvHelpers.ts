import * as vscode from 'vscode';
import { CopyConfig, ColumnRange, ColumnAlignment } from '../types';
import { safeExecute } from './safeExecution';

// Delimited file helper functions
export function detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0] || '';
    const delimiters = [',', '\t', '|', ';', ':'];

    let maxCount = 0;
    let bestDelimiter = ',';

    for (const delimiter of delimiters) {
        const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delimiter;
        }
    }

    return bestDelimiter;
}

export function parseDelimitedLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current.trim());
    return fields;
}

export function getDelimiterName(delimiter: string): string {
    const delimiterNames: { [key: string]: string } = {
        ',': 'CSV (Comma-Separated)',
        '\t': 'TSV (Tab-Separated)',
        '|': 'PSV (Pipe-Separated)',
        ';': 'SSV (Semicolon-Separated)',
        ':': 'CSV (Colon-Separated)',
        ' ': 'SSV (Space-Separated)'
    };
    return delimiterNames[delimiter] || 'Delimited';
}

export function detectHeaders(text: string): boolean {
    try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return false;

        const delimiter = detectDelimiter(text);
        const firstRowFields = parseDelimitedLine(lines[0]!, delimiter);
        const secondRowFields = parseDelimitedLine(lines[1]!, delimiter);

        if (firstRowFields.length !== secondRowFields.length) {
            return true;
        }

        const headerIndicators = ['id', 'name', 'email', 'address', 'phone', 'date', 'time', 'status', 'type', 'code', 'number', 'description', 'title', 'category', 'group'];
        const headerWords = firstRowFields.some(field => {
            const cleaned = field.toLowerCase().trim().replace(/^["']|["']$/g, '');
            return headerIndicators.some(indicator => cleaned.includes(indicator));
        });

        if (headerWords) {
            return true;
        }

        return true;

    } catch (error) {
        return true;
    }
}

export function getColumnRangeFromSelection(
    line: string,
    selection: vscode.Selection,
    delimiter: string,
    fields: string[]
): ColumnRange | null {
    try {
        const selectionStart = selection.start.character;
        const selectionEnd = selection.end.character;

        let charPosition = 0;
        let startColumn = -1;
        let endColumn = -1;

        // Process each field with TypeScript safety
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];

            // TypeScript safety: Handle undefined/null fields
            if (field == null || field === undefined) {
                // Skip undefined fields but advance position properly
                if (i < fields.length - 1) {
                    charPosition += delimiter.length;
                }
                continue;
            }

            const fieldStart = charPosition;
            const fieldEnd = charPosition + field.length; // Now field.length is safe

            // MODIFIED: Only include complete fields - skip partial field at start
            if (startColumn === -1) {
                // Check if selection starts mid-field (after field start but before field end)
                if (selectionStart > fieldStart && selectionStart < fieldEnd) {
                    // Skip this partial field - move to next complete field
                    // Don't set startColumn yet - wait for next field
                } else if (selectionStart <= fieldStart) {
                    // Selection starts at or before this field - include it
                    startColumn = i;
                }
            }

            // Check if selection ends within or after this field
            if (selectionEnd > fieldStart && selectionEnd <= fieldEnd) {
                endColumn = i;
            }

            // SPECIAL CASE: If selection starts exactly on delimiter, start from next field
            if (startColumn === -1 && i < fields.length - 1) {
                const delimiterStart = fieldEnd;
                const delimiterEnd = fieldEnd + delimiter.length;
                if (selectionStart >= delimiterStart && selectionStart < delimiterEnd) {
                    startColumn = i + 1;
                }
            }

            // Early termination optimization
            if (startColumn !== -1 && endColumn !== -1) {
                break;
            }

            // Advance character position properly
            charPosition = fieldEnd;
            if (i < fields.length - 1) {
                charPosition += delimiter.length;
            }
        }

        // Handle edge cases
        if (startColumn === -1 && endColumn !== -1) {
            startColumn = 0;
        }
        if (startColumn !== -1 && endColumn === -1) {
            endColumn = fields.length - 1;
        }

        // Final validation
        if (startColumn === -1 || endColumn === -1 || startColumn > endColumn) {
            return null;
        }

        return { startColumn, endColumn };

    } catch (error) {
        return null;
    }
}

export function getDelimitedContextWithSelection(document: vscode.TextDocument, selection: vscode.Selection): string | null {
    return safeExecute(() => {
        const text = document.getText();
        const delimiter = detectDelimiter(text);
        const delimiterName = getDelimiterName(delimiter);
        const lines = text.split('\n');

        if (lines.length === 0) return delimiterName;

        // Get column information if possible
        const firstLine = lines[0];
        if (!firstLine) return delimiterName;

        // Parse headers properly, considering quoted fields
        const headers = parseDelimitedLine(firstLine, delimiter);

        // Check if first row looks like headers - use YOUR function signature (text: string)
        const hasHeaders = detectHeaders(text);

        // For multi-line selections, we need to find the column range across ALL selected lines
        let minStartColumn: number | null = null;
        let maxEndColumn: number | null = null;

        // Get the selected text to find where it appears in each line
        const selectedText = document.getText(selection);
        const selectedLines = selectedText.split('\n');

        for (let i = 0; i <= selection.end.line - selection.start.line; i++) {
            const lineNum = selection.start.line + i;
            const currentLine = lines[lineNum];
            if (!currentLine) continue;

            // Find where the selected text actually starts in this line
            const selectedLineText = selectedLines[i];
            if (!selectedLineText) continue;

            let actualSelectionStart: number;
            if (i === 0) {
                actualSelectionStart = selection.start.character;
            } else {
                // Find where the selected text appears in the full line
                const indexInLine = currentLine.indexOf(selectedLineText);
                actualSelectionStart = indexInLine >= 0 ? indexInLine : 0;
            }

            const actualSelectionEnd = actualSelectionStart + selectedLineText.length;

            // Create a virtual selection object for this line
            const lineSelection = new vscode.Selection(
                new vscode.Position(lineNum, actualSelectionStart),
                new vscode.Position(lineNum, actualSelectionEnd)
            );

            // Parse the current line to find which columns are selected
            const fields = parseDelimitedLine(currentLine, delimiter);

            // Find which columns are covered by the selection on this line
            const columnRange = getColumnRangeFromSelection(currentLine, lineSelection, delimiter, fields);

            if (columnRange) {
                const { startColumn, endColumn } = columnRange;

                if (minStartColumn === null || startColumn < minStartColumn) {
                    minStartColumn = startColumn;
                }
                if (maxEndColumn === null || endColumn > maxEndColumn) {
                    maxEndColumn = endColumn;
                }
            }
        }

        // Use the min/max range across all selected lines
        if (minStartColumn !== null && maxEndColumn !== null) {
            if (minStartColumn === maxEndColumn) {
                // Single column - TypeScript safe
                let columnName: string;
                const header = headers[minStartColumn];
                if (hasHeaders && minStartColumn < headers.length && header != null && header !== undefined) {
                    columnName = header.trim().replace(/^["']|["']$/g, '');
                } else {
                    columnName = `Column ${minStartColumn + 1}`;
                }
                return `${delimiterName} > ${columnName}`;
            } else {
                // Multiple columns - TypeScript safe
                const columnNames: string[] = [];

                for (let i = minStartColumn; i <= maxEndColumn; i++) {
                    const header = headers[i];
                    if (hasHeaders && i < headers.length && header != null && header !== undefined) {
                        const headerName = header.trim().replace(/^["']|["']$/g, '');
                        columnNames.push(headerName);
                    } else {
                        columnNames.push(`Column ${i + 1}`);
                    }
                }

                return `${delimiterName} > ${columnNames.join(', ')}`;
            }
        }

        return delimiterName;
    }, null, 'Delimited file context detection');
}

/**
 * Build ASCII table with Unicode box-drawing characters
 */
export function buildAsciiTable(
    rows: string[][],
    headers: string[],
    config: CopyConfig
): string {
    if (rows.length === 0 || headers.length === 0) {
        return '';
    }

    // Handle column truncation
    const maxColumns = config.csvTableMaxColumns;
    let displayHeaders = headers;
    let displayRows = rows;

    if (headers.length > maxColumns) {
        const truncatedColumns = headers.length - (maxColumns - 1);
        displayHeaders = [...headers.slice(0, maxColumns - 1), `(${truncatedColumns} more)`];
        displayRows = rows.map(row => [...row.slice(0, maxColumns - 1), '...']);
    }

    // Handle row truncation
    const maxRows = config.csvTableMaxRows;
    let truncatedRows = 0;

    if (displayRows.length > maxRows) {
        truncatedRows = displayRows.length - maxRows;
        displayRows = displayRows.slice(0, maxRows);
    }

    // Calculate column widths
    const widths = displayHeaders.map((header, i) => {
        const maxDataWidth = Math.max(
            ...displayRows.map(row => (row[i] || '').length)
        );
        return Math.max(header.length, maxDataWidth, 5);
    });

    // Detect column alignments
    const alignments = detectColumnAlignments(displayRows, config);

    // Build table parts
    const topBorder = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
    const headerRow = '│' + displayHeaders.map((h, i) => ` ${h.padEnd(widths[i]!)} `).join('│') + '│';
    const headerDivider = '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';

    const dataRows = displayRows.map(row => {
        const cells = row.map((value, i) => {
            const width = widths[i]!;
            const alignment = alignments[i] || 'left';
            let paddedValue: string;

            if (alignment === 'right') {
                paddedValue = value.padStart(width);
            } else if (alignment === 'center') {
                const totalPadding = width - value.length;
                const leftPadding = Math.floor(totalPadding / 2);
                const rightPadding = totalPadding - leftPadding;
                paddedValue = ' '.repeat(leftPadding) + value + ' '.repeat(rightPadding);
            } else {
                paddedValue = value.padEnd(width);
            }

            return ` ${paddedValue} `;
        });
        return '│' + cells.join('│') + '│';
    });

    const bottomBorder = '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

    const table = [topBorder, headerRow, headerDivider, ...dataRows, bottomBorder];

    // Add truncation notice if needed
    if (truncatedRows > 0) {
        table.push(`... ${truncatedRows} more row${truncatedRows !== 1 ? 's' : ''} (increase maxRows to see all)`);
    }

    return table.join('\n');
}

/**
 * Detect column alignments based on content
 */
export function detectColumnAlignments(
    data: string[][],
    config: CopyConfig
): ColumnAlignment[] {
    const columnCount = data[0]?.length || 0;
    const alignments: ColumnAlignment[] = [];

    for (let i = 0; i < columnCount; i++) {
        const columnValues = data.map(row => row[i] || '');

        // Check if mostly numeric
        const numericCount = columnValues.filter(v =>
            !isNaN(Number(v)) && v.trim() !== ''
        ).length;
        const isNumeric = numericCount > columnValues.length * 0.7;

        // Check if boolean
        const booleanValues = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'];
        const booleanCount = columnValues.filter(v =>
            booleanValues.includes(v.toLowerCase())
        ).length;
        const isBoolean = booleanCount > columnValues.length * 0.7;

        if (isBoolean) {
            alignments.push('center');
        } else if (isNumeric) {
            alignments.push(config.csvTableAlignNumbers);
        } else {
            alignments.push('left');
        }
    }

    return alignments;
}
