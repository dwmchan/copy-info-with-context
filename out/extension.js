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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const safeExecution_1 = require("./utils/safeExecution");
// Extension activation
function activate(context) {
    console.log('Copy Info with Context extension is now active!');
    // Register copy with context command
    const copyCommand = vscode.commands.registerCommand('copyInfoWithContext.copySelection', async () => {
        if (vscode.window.activeTextEditor) {
            await (0, safeExecution_1.safeExecuteCommand)(commands_1.handleCopyWithContext);
        }
    });
    // Register copy with HTML highlighting command
    const copyHtmlCommand = vscode.commands.registerCommand('copyInfoWithContext.copySelectionHTML', async () => {
        if (vscode.window.activeTextEditor) {
            await (0, safeExecution_1.safeExecuteCommand)(commands_1.handleCopyWithHtmlHighlighting);
        }
    });
    // Register copy with custom format command
    const copyCustomCommand = vscode.commands.registerCommand('copyInfoWithContext.copySelectionCustom', async () => {
        if (vscode.window.activeTextEditor) {
            await (0, safeExecution_1.safeExecuteCommand)(commands_1.handleCopyWithCustomFormat);
        }
    });
    // Register CSV Intelligence cycle mode command
    const cycleCsvModeCommand = vscode.commands.registerCommand('copyInfoWithContext.cycleCsvOutputMode', async () => {
        await (0, safeExecution_1.safeExecuteCommand)(commands_1.handleCycleCsvOutputMode);
    });
    // Add all commands to subscriptions
    context.subscriptions.push(copyCommand, copyHtmlCommand, copyCustomCommand, cycleCsvModeCommand);
}
exports.activate = activate;
// Extension deactivation
function deactivate() {
    // No cleanup needed
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map