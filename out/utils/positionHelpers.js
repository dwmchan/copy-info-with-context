"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbsoluteCharPosition = void 0;
// Performance helper: convert line/char position to absolute character position
function getAbsoluteCharPosition(text, lineIndex, charIndex) {
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
exports.getAbsoluteCharPosition = getAbsoluteCharPosition;
//# sourceMappingURL=positionHelpers.js.map