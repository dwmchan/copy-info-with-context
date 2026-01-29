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
exports.handleCopyWithCustomFormat = void 0;
const vscode = __importStar(require("vscode"));
const copyWithContext_1 = require("./copyWithContext");
const copyWithHtml_1 = require("./copyWithHtml");
const copyWithMarkdown_1 = require("./copyWithMarkdown");
const copyWithAnsi_1 = require("./copyWithAnsi");
async function handleCopyWithCustomFormat() {
    const formats = [
        'Plain Text with Context',
        'HTML with Syntax Highlighting',
        'Markdown Code Block',
        'ANSI Colored Text'
    ];
    const selected = await vscode.window.showQuickPick(formats, {
        placeHolder: 'Choose output format'
    });
    if (!selected) {
        return;
    }
    switch (selected) {
        case 'Plain Text with Context':
            await (0, copyWithContext_1.handleCopyWithContext)();
            break;
        case 'HTML with Syntax Highlighting':
            await (0, copyWithHtml_1.handleCopyWithHtmlHighlighting)();
            break;
        case 'Markdown Code Block':
            await (0, copyWithMarkdown_1.handleCopyWithMarkdown)();
            break;
        case 'ANSI Colored Text':
            await (0, copyWithAnsi_1.handleCopyWithAnsiColors)();
            break;
    }
}
exports.handleCopyWithCustomFormat = handleCopyWithCustomFormat;
//# sourceMappingURL=copyCustomFormat.js.map