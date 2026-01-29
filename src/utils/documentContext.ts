import * as vscode from 'vscode';
import { getJsonPath, findJsonPathByPosition } from './jsonContext';
import { getXmlPath } from './xmlContext';
import { getCodeContext } from './codeContext';
import { shouldSkipIndexing, getBasicDocumentContext } from './fileHelpers';

export function getDocumentContext(document: vscode.TextDocument, position: vscode.Position): string | null {
    // Performance check: skip complex indexing for large files
    if (shouldSkipIndexing(document)) {
        console.log(`Large file detected (${document.lineCount} lines) - using performance mode`);
        return getBasicDocumentContext(document);
    }

    // Regular logic for smaller files
    const language = document.languageId;
    const filename = document.fileName.toLowerCase();

    switch (language) {
        case 'json':
        case 'jsonc':
            return getJsonPath(document, position);
        case 'xml':
        case 'html':
        case 'xhtml':
        case 'htm':
            return getXmlPath(document, position);
        case 'csv':
        case 'tsv':
        case 'psv':
            return null;
        case 'javascript':
        case 'typescript':
        case 'javascriptreact':
        case 'typescriptreact':
        case 'csharp':
        case 'python':
        case 'powershell':
            return getCodeContext(document, position);
    }

    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) {
        return getJsonPath(document, position);
    }

    if (filename.endsWith('.xml') || filename.endsWith('.html') ||
        filename.endsWith('.htm') || filename.endsWith('.xhtml')) {
        return getXmlPath(document, position);
    }

    if (filename.endsWith('.csv') || filename.endsWith('.tsv') ||
        filename.endsWith('.psv') || filename.endsWith('.ssv') ||
        filename.endsWith('.dsv')) {
        return null;
    }

    if (filename.endsWith('.js') || filename.endsWith('.ts') ||
        filename.endsWith('.jsx') || filename.endsWith('.tsx') ||
        filename.endsWith('.cs') || filename.endsWith('.py') ||
        filename.endsWith('.ps1') || filename.endsWith('.psm1') || filename.endsWith('.psd1')) {
        return getCodeContext(document, position);
    }

    return null;
}

// Path enhancement with array indices
export function enhancePathWithArrayIndices(baseContext: string, document: vscode.TextDocument, position: vscode.Position, language: string): string {
    if (!baseContext) {return baseContext;}

    try {
        switch (language) {
            case 'json':
            case 'jsonc':
                return enhanceJsonPathWithIndices(document.getText(), position, baseContext.split('.'));
            case 'xml':
            case 'html':
            case 'xhtml':
            case 'htm':
                return enhanceXmlPathWithIndices(document.getText(), position, baseContext.split(' > '));
            default:
                return baseContext;
        }
    } catch (error) {
        console.error('Error enhancing path with indices:', error);
        return baseContext;
    }
}

function enhanceJsonPathWithIndices(jsonText: string, position: vscode.Position, pathParts: string[]): string {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join('.');
        }

        const accuratePath = findJsonPathByPosition(jsonText, position);
        return accuratePath ?? pathParts.join('.');

    } catch (error) {
        console.error('Error in enhanceJsonPathWithIndices:', error);
        return pathParts.join('.');
    }
}

function enhanceXmlPathWithIndices(xmlText: string, position: vscode.Position, pathParts: string[]): string {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join(' > ');
        }

        const document = {
            getText: () => xmlText,
            languageId: 'xml'
        } as vscode.TextDocument;

        const accuratePath = getXmlPath(document, position);
        return accuratePath ?? pathParts.join(' > ');

    } catch (error) {
        console.error('Error in enhanceXmlPathWithIndices:', error);
        return pathParts.join(' > ');
    }
}
