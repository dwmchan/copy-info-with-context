import * as vscode from 'vscode';

type CsvOutputMode = 'minimal' | 'smart' | 'table' | 'detailed';

/**
 * Register command to cycle through output modes
 */
export async function handleCycleCsvOutputMode(): Promise<void> {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    const currentMode = config.get<CsvOutputMode>('csvOutputMode', 'minimal');

    const modes: CsvOutputMode[] = [
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

    void vscode.window.showInformationMessage(
        `CSV Output Mode: ${nextMode.toUpperCase()} ${icons[nextMode]}`
    );
}

