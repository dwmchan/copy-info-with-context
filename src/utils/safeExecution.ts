import * as vscode from 'vscode';

// Safe execution wrapper to prevent extension crashes
export function safeExecute<T>(fn: () => T, fallback: T, context?: string): T {
    try {
        return fn();
    } catch (error) {
        if (context) {
            console.error(`Error in ${context}:`, error);
        }
        return fallback;
    }
}

// Command execution wrapper with user-friendly error handling
export async function safeExecuteCommand(fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (error) {
        console.error('Command execution error:', error);
        vscode.window.showErrorMessage(`Copy Info with Context: ${error instanceof Error ?
            error.message : 'Unknown error occurred'}`);
    }
}
