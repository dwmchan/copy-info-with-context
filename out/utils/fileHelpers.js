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
exports.getBasicDocumentContext = exports.shouldSkipIndexing = exports.getFileSizeInfo = void 0;
const vscode = __importStar(require("vscode"));
function getFileSizeInfo(document) {
    const lineCount = document.lineCount;
    const charCount = document.getText().length;
    // Use user setting instead of hardcoded value
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    const lineThreshold = config.get('largeFileLineThreshold', 2000);
    const LARGE_FILE_CHAR_THRESHOLD = 5000000; // 5MB - Keep this hardcoded
    const isLarge = lineCount > lineThreshold || charCount > LARGE_FILE_CHAR_THRESHOLD;
    return { lineCount, charCount, isLarge };
}
exports.getFileSizeInfo = getFileSizeInfo;
function shouldSkipIndexing(document) {
    return getFileSizeInfo(document).isLarge;
}
exports.shouldSkipIndexing = shouldSkipIndexing;
function getBasicDocumentContext(document) {
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
    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) {
        return 'JSON (Large File)';
    }
    if (filename.endsWith('.xml') || filename.endsWith('.html')) {
        return 'XML (Large File)';
    }
    if (filename.endsWith('.csv')) {
        return 'CSV (Large File)';
    }
    if (filename.endsWith('.tsv')) {
        return 'TSV (Large File)';
    }
    return null;
}
exports.getBasicDocumentContext = getBasicDocumentContext;
//# sourceMappingURL=fileHelpers.js.map