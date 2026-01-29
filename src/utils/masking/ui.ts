// ui.ts - User interface functions for data masking feedback
// Phase 1 (v1.6.0): Extracted from monolithic maskingEngine.ts

import * as vscode from 'vscode';
import { MaskedResult, MaskingConfig, PiiType } from './config';

/**
 * Status bar item for showing masking status
 * Singleton instance managed by updateMaskingStatusBar()
 */
let maskingStatusBarItem: vscode.StatusBarItem | undefined;

/**
 * Update the VS Code status bar with masking results
 * Shows number of items masked and auto-hides after 5 seconds
 *
 * @param result - The masking result containing detections
 * @param config - The masking configuration
 */
export function updateMaskingStatusBar(result: MaskedResult, config: MaskingConfig): void {
    if (!config.showIndicator) {return;}

    if (!maskingStatusBarItem) {
        maskingStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
    }

    if (config.enabled) {
        if (result.detections.length > 0) {
            maskingStatusBarItem.text = `$(shield) ${result.detections.length} masked`;
            maskingStatusBarItem.tooltip = `Data masking active: ${result.detections.length} items masked`;
            maskingStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            maskingStatusBarItem.text = '$(shield) Masking Active';
            maskingStatusBarItem.tooltip = 'Data masking enabled (no sensitive data detected)';
            maskingStatusBarItem.backgroundColor = undefined;
        }
        maskingStatusBarItem.show();

        // Auto-hide after 5 seconds
        setTimeout(() => maskingStatusBarItem?.hide(), 5000);
    }
}

/**
 * Show a notification message with masking statistics
 * Includes a Settings button to open masking configuration
 *
 * @param result - The masking result containing detections
 * @param config - The masking configuration
 */
export function showMaskingNotification(result: MaskedResult, _config: MaskingConfig): void {
    if (result.detections.length === 0) {return;}

    const byType = result.detections.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] ?? 0) + 1;
        return acc;
    }, {} as Record<PiiType, number>);

    const details = Object.entries(byType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

    void vscode.window.showInformationMessage(
        `Copied with ${result.detections.length} item${result.detections.length > 1 ? 's' : ''} masked: ${details}`,
        'Settings'
    ).then(selection => {
        if (selection === 'Settings') {
            void vscode.commands.executeCommand('workbench.action.openSettings', 'copyInfoWithContext.masking');
        }
    });
}
