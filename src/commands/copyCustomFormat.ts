import * as vscode from 'vscode';
import { handleCopyWithContext } from './copyWithContext';
import { handleCopyWithHtmlHighlighting } from './copyWithHtml';
import { handleCopyWithMarkdown } from './copyWithMarkdown';
import { handleCopyWithAnsiColors } from './copyWithAnsi';

export async function handleCopyWithCustomFormat(): Promise<void> {
    const formats = [
        'Plain Text with Context',
        'HTML with Syntax Highlighting',
        'Markdown Code Block',
        'ANSI Colored Text'
    ];

    const selected = await vscode.window.showQuickPick(formats, {
        placeHolder: 'Choose output format'
    });

    if (!selected) return;

    switch (selected) {
        case 'Plain Text with Context':
            await handleCopyWithContext();
            break;
        case 'HTML with Syntax Highlighting':
            await handleCopyWithHtmlHighlighting();
            break;
        case 'Markdown Code Block':
            await handleCopyWithMarkdown();
            break;
        case 'ANSI Colored Text':
            await handleCopyWithAnsiColors();
            break;
    }
}
