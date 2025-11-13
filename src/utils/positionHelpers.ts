// Performance helper: convert line/char position to absolute character position
export function getAbsoluteCharPosition(text: string, lineIndex: number, charIndex: number): number {
    if (lineIndex === 0) {
        return charIndex;
    }

    let position = 0;
    let currentLine = 0;

    for (let i = 0; i < text.length && currentLine < lineIndex; i++) {
        if (text[i] === '\n') {
            currentLine++;
            position = i + 1;
        }
    }

    return position + charIndex;
}
