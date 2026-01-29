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
exports.safeExecuteCommand = exports.safeExecute = void 0;
const vscode = __importStar(require("vscode"));
// Safe execution wrapper to prevent extension crashes
function safeExecute(fn, fallback, context) {
    try {
        return fn();
    }
    catch (error) {
        if (context) {
            console.error(`Error in ${context}:`, error);
        }
        return fallback;
    }
}
exports.safeExecute = safeExecute;
// Command execution wrapper with user-friendly error handling
async function safeExecuteCommand(fn) {
    try {
        await fn();
    }
    catch (error) {
        console.error('Command execution error:', error);
        void vscode.window.showErrorMessage(`Copy Info with Context: ${error instanceof Error ?
            error.message : 'Unknown error occurred'}`);
    }
}
exports.safeExecuteCommand = safeExecuteCommand;
//# sourceMappingURL=safeExecution.js.map