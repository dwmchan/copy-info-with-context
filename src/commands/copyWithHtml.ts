import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig } from '../utils/config';
import { getDocumentContext, enhancePathWithArrayIndices } from '../utils/documentContext';
import { formatCodeWithLineNumbers, createHtmlWithSyntaxHighlighting } from '../utils/formatting';
import { getDelimitedContextWithSelection, detectDelimiter } from '../utils/csvHelpers';
import { alignCsvLinesToLeftmostColumn } from './copyWithContext';

export async function handleCopyWithHtmlHighlighting(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        void vscode.window.showWarningMessage('No active editor found');
        return;
    }
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

    // CSV trimming: Remove partial fields from multi-line selections
    const filename = document.fileName.toLowerCase();
    const language = document.languageId;
    const isCSVFile = (
        language === 'csv' || language === 'tsv' || language === 'psv' ||
        filename.endsWith('.csv') || filename.endsWith('.tsv') ||
        filename.endsWith('.psv') || filename.endsWith('.ssv') ||
        filename.endsWith('.dsv')
    );

    if (isCSVFile && !selection.isEmpty) {
        const delimiter = detectDelimiter(document.getText());
        const lines = selectedText.split('\n');

        // Align all lines to the leftmost column
        const trimmedLines = alignCsvLinesToLeftmostColumn(lines, document, selection, startLine, delimiter);
        selectedText = trimmedLines.join('\n');
    }

    let contextInfo = '';
    if (config.showContextPath) {
        let context = getDocumentContext(document, selection.start);

        if (!context && !selection.isEmpty) {
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

        if (context) {
            context = enhancePathWithArrayIndices(context, document, selection.start, document.languageId);
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
    const htmlOutput = createHtmlWithSyntaxHighlighting(formattedContent, document.languageId, header);

    await vscode.env.clipboard.writeText(htmlOutput);
    void vscode.window.showInformationMessage('Code copied with HTML highlighting!');
}

