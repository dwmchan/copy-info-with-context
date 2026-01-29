import * as vscode from 'vscode';
import {
    handleCopyWithContext,
    handleCopyWithHtmlHighlighting,
    handleCopyWithCustomFormat,
    handleCycleCsvOutputMode
} from './commands';
import { safeExecuteCommand } from './utils/safeExecution';

// Extension activation
export function activate(context: vscode.ExtensionContext): void {
    console.log('Copy Info with Context extension is now active!');

    // Register copy with context command
    const copyCommand = vscode.commands.registerCommand(
        'copyInfoWithContext.copySelection',
        async () => {
            if (vscode.window.activeTextEditor) {
                await safeExecuteCommand(handleCopyWithContext);
            }
        }
    );

    // Register copy with HTML highlighting command
    const copyHtmlCommand = vscode.commands.registerCommand(
        'copyInfoWithContext.copySelectionHTML',
        async () => {
            if (vscode.window.activeTextEditor) {
                await safeExecuteCommand(handleCopyWithHtmlHighlighting);
            }
        }
    );

    // Register copy with custom format command
    const copyCustomCommand = vscode.commands.registerCommand(
        'copyInfoWithContext.copySelectionCustom',
        async () => {
            if (vscode.window.activeTextEditor) {
                await safeExecuteCommand(handleCopyWithCustomFormat);
            }
        }
    );

    // Register CSV Intelligence cycle mode command
    const cycleCsvModeCommand = vscode.commands.registerCommand(
        'copyInfoWithContext.cycleCsvOutputMode',
        async () => {
            await safeExecuteCommand(handleCycleCsvOutputMode);
        }
    );

    // Add all commands to subscriptions
    context.subscriptions.push(
        copyCommand,
        copyHtmlCommand,
        copyCustomCommand,
        cycleCsvModeCommand
    );
}

// Extension deactivation
export function deactivate(): void {
    // No cleanup needed
}
