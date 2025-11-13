import * as vscode from 'vscode';

/**
 * Register command to cycle through output modes
 */
export async function handleCycleCsvOutputMode(): Promise<void> {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    const currentMode = config.get('csvOutputMode', 'minimal');

    const modes: Array<'minimal' | 'smart' | 'table' | 'detailed'> = [
        'minimal', 'smart', 'table', 'detailed'
    ];

    const currentIndex = modes.indexOf(currentMode as any);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex]!;

    await config.update('csvOutputMode', nextMode, true);

    const icons = {
        minimal: '⚡',
        smart: '🎯',
        table: '📊',
        detailed: '🚀'
    };

    vscode.window.showInformationMessage(
        `CSV Output Mode: ${nextMode.toUpperCase()} ${icons[nextMode]}`
    );
}
