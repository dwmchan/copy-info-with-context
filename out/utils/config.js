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
exports.getXmlIndexingMode = exports.getConfig = void 0;
const vscode = __importStar(require("vscode"));
// Configuration helpers
function getConfig() {
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
exports.getConfig = getConfig;
function getXmlIndexingMode() {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    return config.get('xmlIndexingMode', 'local');
}
exports.getXmlIndexingMode = getXmlIndexingMode;
//# sourceMappingURL=config.js.map