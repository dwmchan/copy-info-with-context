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
exports.handleCopyWithMarkdown = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const config_1 = require("../utils/config");
const documentContext_1 = require("../utils/documentContext");
const formatting_1 = require("../utils/formatting");
const csvHelpers_1 = require("../utils/csvHelpers");
const copyWithContext_1 = require("./copyWithContext");
async function handleCopyWithMarkdown() {
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
    const config = (0, config_1.getConfig)();
    // CSV trimming: Remove partial fields from multi-line selections
    const filename = document.fileName.toLowerCase();
    const language = document.languageId;
    const isCSVFile = (language === 'csv' || language === 'tsv' || language === 'psv' ||
        filename.endsWith('.csv') || filename.endsWith('.tsv') ||
        filename.endsWith('.psv') || filename.endsWith('.ssv') ||
        filename.endsWith('.dsv'));
    if (isCSVFile && !selection.isEmpty) {
        const delimiter = (0, csvHelpers_1.detectDelimiter)(document.getText());
        const lines = selectedText.split('\n');
        // Align all lines to the leftmost column
        const trimmedLines = (0, copyWithContext_1.alignCsvLinesToLeftmostColumn)(lines, document, selection, startLine, delimiter);
        selectedText = trimmedLines.join('\n');
    }
    let contextInfo = '';
    if (config.showContextPath) {
        let context = (0, documentContext_1.getDocumentContext)(document, selection.start);
        if (!context && !selection.isEmpty) {
            const isExplicitlyDelimited = (language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv'));
            if (isExplicitlyDelimited) {
                context = (0, csvHelpers_1.getDelimitedContextWithSelection)(document, selection);
            }
        }
        if (context) {
            context = (0, documentContext_1.enhancePathWithArrayIndices)(context, document, selection.start, document.languageId);
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
    const markdownOutput = `${header}\n\`\`\`${language}\n${formattedContent}\n\`\`\``;
    await vscode.env.clipboard.writeText(markdownOutput);
    void vscode.window.showInformationMessage('Code copied as Markdown!');
}
exports.handleCopyWithMarkdown = handleCopyWithMarkdown;
//# sourceMappingURL=copyWithMarkdown.js.map