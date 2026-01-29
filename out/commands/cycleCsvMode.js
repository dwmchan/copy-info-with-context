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
exports.handleCycleCsvOutputMode = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Register command to cycle through output modes
 */
async function handleCycleCsvOutputMode() {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    const currentMode = config.get('csvOutputMode', 'minimal');
    const modes = [
        'minimal', 'smart', 'table', 'detailed'
    ];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    if (!nextMode) {
        void vscode.window.showErrorMessage('Unable to determine next CSV mode');
        return;
    }
    await config.update('csvOutputMode', nextMode, true);
    const icons = {
        minimal: 'âš¡',
        smart: 'ðŸŽ¯',
        table: 'ðŸ“Š',
        detailed: 'ðŸš€'
    };
    void vscode.window.showInformationMessage(`CSV Output Mode: ${nextMode.toUpperCase()} ${icons[nextMode]}`);
}
exports.handleCycleCsvOutputMode = handleCycleCsvOutputMode;
//# sourceMappingURL=cycleCsvMode.js.map