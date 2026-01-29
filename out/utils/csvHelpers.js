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
exports.detectColumnAlignments = exports.buildAsciiTable = exports.getDelimitedContextWithSelection = exports.getColumnRangeFromSelection = exports.detectHeaders = exports.getDelimiterName = exports.parseDelimitedLine = exports.detectDelimiter = void 0;
const vscode = __importStar(require("vscode"));
const safeExecution_1 = require("./safeExecution");
// Delimited file helper functions
function detectDelimiter(text) {
    const firstLine = text.split('\n')[0] ?? '';
    const delimiters = [',', '\t', '|', ';', ':'];
    let maxCount = 0;
    let bestDelimiter = ',';
    for (const delimiter of delimiters) {
        const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) ?? []).length;
        if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delimiter;
        }
    }
    return bestDelimiter;
}
exports.detectDelimiter = detectDelimiter;
function parseDelimitedLine(line, delimiter) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === delimiter && !inQuotes) {
            fields.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    fields.push(current.trim());
    return fields;
}
exports.parseDelimitedLine = parseDelimitedLine;
function getDelimiterName(delimiter) {
    const delimiterNames = {
        ',': 'CSV (Comma-Separated)',
        '\t': 'TSV (Tab-Separated)',
        '|': 'PSV (Pipe-Separated)',
        ';': 'SSV (Semicolon-Separated)',
        ':': 'CSV (Colon-Separated)',
        ' ': 'SSV (Space-Separated)'
    };
    return delimiterNames[delimiter] ?? 'Delimited';
}
exports.getDelimiterName = getDelimiterName;
function detectHeaders(text) {
    try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return false;
        }
        const delimiter = detectDelimiter(text);
        const firstRowFields = parseDelimitedLine(lines[0] ?? '', delimiter);
        const secondRowFields = parseDelimitedLine(lines[1] ?? '', delimiter);
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
    }
    catch (error) {
        return true;
    }
}
exports.detectHeaders = detectHeaders;
function getColumnRangeFromSelection(line, selection, delimiter, fields) {
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
            if (field === null || field === undefined) {
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
                }
                else if (selectionStart <= fieldStart) {
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
    }
    catch (error) {
        return null;
    }
}
exports.getColumnRangeFromSelection = getColumnRangeFromSelection;
function getDelimitedContextWithSelection(document, selection) {
    return (0, safeExecution_1.safeExecute)(() => {
        const text = document.getText();
        const delimiter = detectDelimiter(text);
        const delimiterName = getDelimiterName(delimiter);
        const lines = text.split('\n');
        if (lines.length === 0) {
            return delimiterName;
        }
        // Get column information if possible
        const firstLine = lines[0];
        if (!firstLine) {
            return delimiterName;
        }
        // Parse headers properly, considering quoted fields
        const headers = parseDelimitedLine(firstLine, delimiter);
        // Check if first row looks like headers - use YOUR function signature (text: string)
        const hasHeaders = detectHeaders(text);
        // For multi-line selections, we need to find the column range across ALL selected lines
        let minStartColumn = null;
        let maxEndColumn = null;
        // Get the selected text to find where it appears in each line
        const selectedText = document.getText(selection);
        const selectedLines = selectedText.split('\n');
        for (let i = 0; i <= selection.end.line - selection.start.line; i++) {
            const lineNum = selection.start.line + i;
            const currentLine = lines[lineNum];
            if (!currentLine) {
                continue;
            }
            // Find where the selected text actually starts in this line
            const selectedLineText = selectedLines[i];
            if (!selectedLineText) {
                continue;
            }
            let actualSelectionStart;
            if (i === 0) {
                actualSelectionStart = selection.start.character;
            }
            else {
                // Find where the selected text appears in the full line
                const indexInLine = currentLine.indexOf(selectedLineText);
                actualSelectionStart = indexInLine >= 0 ? indexInLine : 0;
            }
            const actualSelectionEnd = actualSelectionStart + selectedLineText.length;
            // Create a virtual selection object for this line
            const lineSelection = new vscode.Selection(new vscode.Position(lineNum, actualSelectionStart), new vscode.Position(lineNum, actualSelectionEnd));
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
                let columnName;
                const header = headers[minStartColumn];
                if (hasHeaders && minStartColumn < headers.length && header !== null && header !== undefined) {
                    columnName = header.trim().replace(/^["']|["']$/g, '');
                }
                else {
                    columnName = `Column ${minStartColumn + 1}`;
                }
                return `${delimiterName} > ${columnName}`;
            }
            else {
                // Multiple columns - TypeScript safe
                const columnNames = [];
                for (let i = minStartColumn; i <= maxEndColumn; i++) {
                    const header = headers[i];
                    if (hasHeaders && i < headers.length && header !== null && header !== undefined) {
                        const headerName = header.trim().replace(/^["']|["']$/g, '');
                        columnNames.push(headerName);
                    }
                    else {
                        columnNames.push(`Column ${i + 1}`);
                    }
                }
                return `${delimiterName} > ${columnNames.join(', ')}`;
            }
        }
        return delimiterName;
    }, null, 'Delimited file context detection');
}
exports.getDelimitedContextWithSelection = getDelimitedContextWithSelection;
/**
 * Build ASCII table with Unicode box-drawing characters
 */
function buildAsciiTable(rows, headers, config) {
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
        const maxDataWidth = Math.max(...displayRows.map(row => (row[i] ?? '').length));
        return Math.max(header.length, maxDataWidth, 5);
    });
    // Detect column alignments
    const alignments = detectColumnAlignments(displayRows, config);
    // Build table parts
    const topBorder = `â”Œ${widths.map(w => 'â”€'.repeat(w + 2)).join('â”¬')}â”`;
    const headerRow = `â”‚${displayHeaders.map((h, i) => ` ${h.padEnd(widths[i] ?? 5)} `).join('â”‚')}â”‚`;
    const headerDivider = `â”œ${widths.map(w => 'â”€'.repeat(w + 2)).join('â”¼')}â”¤`;
    const dataRows = displayRows.map(row => {
        const cells = row.map((value, i) => {
            const width = widths[i] ?? 5;
            const alignment = alignments[i] ?? 'left';
            let paddedValue;
            if (alignment === 'right') {
                paddedValue = value.padStart(width);
            }
            else if (alignment === 'center') {
                const totalPadding = width - value.length;
                const leftPadding = Math.floor(totalPadding / 2);
                const rightPadding = totalPadding - leftPadding;
                paddedValue = ' '.repeat(leftPadding) + value + ' '.repeat(rightPadding);
            }
            else {
                paddedValue = value.padEnd(width);
            }
            return ` ${paddedValue} `;
        });
        return `â”‚${cells.join('â”‚')}â”‚`;
    });
    const bottomBorder = `â””${widths.map(w => 'â”€'.repeat(w + 2)).join('â”´')}â”˜`;
    const table = [topBorder, headerRow, headerDivider, ...dataRows, bottomBorder];
    // Add truncation notice if needed
    if (truncatedRows > 0) {
        table.push(`... ${truncatedRows} more row${truncatedRows !== 1 ? 's' : ''} (increase maxRows to see all)`);
    }
    return table.join('\n');
}
exports.buildAsciiTable = buildAsciiTable;
/**
 * Detect column alignments based on content
 */
function detectColumnAlignments(data, config) {
    const columnCount = data[0]?.length ?? 0;
    const alignments = [];
    for (let i = 0; i < columnCount; i++) {
        const columnValues = data.map(row => row[i] ?? '');
        // Check if mostly numeric
        const numericCount = columnValues.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
        const isNumeric = numericCount > columnValues.length * 0.7;
        // Check if boolean
        const booleanValues = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'];
        const booleanCount = columnValues.filter(v => booleanValues.includes(v.toLowerCase())).length;
        const isBoolean = booleanCount > columnValues.length * 0.7;
        if (isBoolean) {
            alignments.push('center');
        }
        else if (isNumeric) {
            alignments.push(config.csvTableAlignNumbers);
        }
        else {
            alignments.push('left');
        }
    }
    return alignments;
}
exports.detectColumnAlignments = detectColumnAlignments;
//# sourceMappingURL=csvHelpers.js.map