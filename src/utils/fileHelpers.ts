import * as vscode from 'vscode';
import { FileSizeInfo } from '../types';

export function getFileSizeInfo(document: vscode.TextDocument): FileSizeInfo {
    const lineCount = document.lineCount;
    const charCount = document.getText().length;

    // Use user setting instead of hardcoded value
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    const lineThreshold = config.get('largeFileLineThreshold', 2000);
    const LARGE_FILE_CHAR_THRESHOLD = 5000000;  // 5MB - Keep this hardcoded

    const isLarge = lineCount > lineThreshold || charCount > LARGE_FILE_CHAR_THRESHOLD;

    return {lineCount, charCount, isLarge};
}

export function shouldSkipIndexing(document: vscode.TextDocument): boolean {
    return getFileSizeInfo(document).isLarge;
}

export function getBasicDocumentContext(document: vscode.TextDocument): string | null {
    const language = document.languageId;
    const filename = document.fileName.toLowerCase();

    // Return simple file type indicators without expensive parsing
    switch (language) {
        case 'json':
        case 'jsonc':
            return 'JSON (Large File)';
        case 'xml':
        case 'html':
        case 'xhtml':
        case 'htm':
            return 'XML (Large File)';
        case 'csv':
            return 'CSV (Large File)';
        case 'tsv':
            return 'TSV (Large File)';
    }

    // Check by extension for unrecognized files
    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) return 'JSON (Large File)';
    if (filename.endsWith('.xml') || filename.endsWith('.html')) return 'XML (Large File)';
    if (filename.endsWith('.csv')) return 'CSV (Large File)';
    if (filename.endsWith('.tsv')) return 'TSV (Large File)';

    return null;
}
