"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancePathWithArrayIndices = exports.getDocumentContext = void 0;
const jsonContext_1 = require("./jsonContext");
const xmlContext_1 = require("./xmlContext");
const codeContext_1 = require("./codeContext");
const fileHelpers_1 = require("./fileHelpers");
function getDocumentContext(document, position) {
    // Performance check: skip complex indexing for large files
    if ((0, fileHelpers_1.shouldSkipIndexing)(document)) {
        console.log(`Large file detected (${document.lineCount} lines) - using performance mode`);
        return (0, fileHelpers_1.getBasicDocumentContext)(document);
    }
    // Regular logic for smaller files
    const language = document.languageId;
    const filename = document.fileName.toLowerCase();
    switch (language) {
        case 'json':
        case 'jsonc':
            return (0, jsonContext_1.getJsonPath)(document, position);
        case 'xml':
        case 'html':
        case 'xhtml':
        case 'htm':
            return (0, xmlContext_1.getXmlPath)(document, position);
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
            return (0, codeContext_1.getCodeContext)(document, position);
    }
    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) {
        return (0, jsonContext_1.getJsonPath)(document, position);
    }
    if (filename.endsWith('.xml') || filename.endsWith('.html') ||
        filename.endsWith('.htm') || filename.endsWith('.xhtml')) {
        return (0, xmlContext_1.getXmlPath)(document, position);
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
        return (0, codeContext_1.getCodeContext)(document, position);
    }
    return null;
}
exports.getDocumentContext = getDocumentContext;
// Path enhancement with array indices
function enhancePathWithArrayIndices(baseContext, document, position, language) {
    if (!baseContext) {
        return baseContext;
    }
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
    }
    catch (error) {
        console.error('Error enhancing path with indices:', error);
        return baseContext;
    }
}
exports.enhancePathWithArrayIndices = enhancePathWithArrayIndices;
function enhanceJsonPathWithIndices(jsonText, position, pathParts) {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join('.');
        }
        const accuratePath = (0, jsonContext_1.findJsonPathByPosition)(jsonText, position);
        return accuratePath ?? pathParts.join('.');
    }
    catch (error) {
        console.error('Error in enhanceJsonPathWithIndices:', error);
        return pathParts.join('.');
    }
}
function enhanceXmlPathWithIndices(xmlText, position, pathParts) {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join(' > ');
        }
        const document = {
            getText: () => xmlText,
            languageId: 'xml'
        };
        const accuratePath = (0, xmlContext_1.getXmlPath)(document, position);
        return accuratePath ?? pathParts.join(' > ');
    }
    catch (error) {
        console.error('Error in enhanceXmlPathWithIndices:', error);
        return pathParts.join(' > ');
    }
}
//# sourceMappingURL=documentContext.js.map