"use strict";
// ui.ts - User interface functions for data masking feedback
// Phase 1 (v1.6.0): Extracted from monolithic maskingEngine.ts
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
exports.showMaskingNotification = exports.updateMaskingStatusBar = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Status bar item for showing masking status
 * Singleton instance managed by updateMaskingStatusBar()
 */
let maskingStatusBarItem;
/**
 * Update the VS Code status bar with masking results
 * Shows number of items masked and auto-hides after 5 seconds
 *
 * @param result - The masking result containing detections
 * @param config - The masking configuration
 */
function updateMaskingStatusBar(result, config) {
    if (!config.showIndicator) {
        return;
    }
    if (!maskingStatusBarItem) {
        maskingStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }
    if (config.enabled) {
        if (result.detections.length > 0) {
            maskingStatusBarItem.text = `$(shield) ${result.detections.length} masked`;
            maskingStatusBarItem.tooltip = `Data masking active: ${result.detections.length} items masked`;
            maskingStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else {
            maskingStatusBarItem.text = '$(shield) Masking Active';
            maskingStatusBarItem.tooltip = 'Data masking enabled (no sensitive data detected)';
            maskingStatusBarItem.backgroundColor = undefined;
        }
        maskingStatusBarItem.show();
        // Auto-hide after 5 seconds
        setTimeout(() => maskingStatusBarItem?.hide(), 5000);
    }
}
exports.updateMaskingStatusBar = updateMaskingStatusBar;
/**
 * Show a notification message with masking statistics
 * Includes a Settings button to open masking configuration
 *
 * @param result - The masking result containing detections
 * @param config - The masking configuration
 */
function showMaskingNotification(result, _config) {
    if (result.detections.length === 0) {
        return;
    }
    const byType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] ?? 0) + 1;
        return acc;
    }, {});
    const details = Object.entries(byType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
    void vscode.window.showInformationMessage(`Copied with ${result.detections.length} item${result.detections.length > 1 ? 's' : ''} masked: ${details}`, 'Settings').then(selection => {
        if (selection === 'Settings') {
            void vscode.commands.executeCommand('workbench.action.openSettings', 'copyInfoWithContext.masking');
        }
    });
}
exports.showMaskingNotification = showMaskingNotification;
//# sourceMappingURL=ui.js.map