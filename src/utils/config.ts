import * as vscode from 'vscode';
import { CopyConfig } from '../types';

// Configuration helpers
export function getConfig(): CopyConfig {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    return {
        showLineNumbers: config.get('showLineNumbers', true),
        lineNumberPadding: config.get('lineNumberPadding', false),
        showContextPath: config.get('showContextPath', true),
        enableColorCoding: config.get('enableColorCoding', false),
        colorTheme: config.get('colorTheme', 'dark'),
        showArrayIndices: config.get('showArrayIndices', true),
        maxFileSize: config.get('maxFileSize', 5000000),
        csvOutputMode: config.get('csvOutputMode', 'minimal'),
        csvTableShowTypes: config.get('csvTableShowTypes', true),
        csvTableMaxRows: config.get('csvTableMaxRows', 20),
        csvTableMaxColumns: config.get('csvTableMaxColumns', 10),
        csvTableAlignNumbers: config.get('csvTableAlignNumbers', 'right')
    };
}

export function getXmlIndexingMode(): 'local' | 'global' {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    return config.get('xmlIndexingMode', 'local') as 'local' | 'global';
}
