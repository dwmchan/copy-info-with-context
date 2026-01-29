import * as vscode from 'vscode';
import { JsonContext } from '../types';
import { getAbsoluteCharPosition } from './positionHelpers';
import { safeExecute } from './safeExecution';

// Enhanced JSON path detection
export function findJsonPathByPosition(jsonText: string, position: vscode.Position): string | null {
    try {
        const targetPosition = getAbsoluteCharPosition(jsonText, position.line, position.character);

        const contextStack: JsonContext[] = [];
        let inString = false;
        let escapeNext = false;
        let currentKey = '';
        let expectingValue = false;
        let keyStartPosition = -1;
        let i = 0;

        while (i <= targetPosition && i < jsonText.length) {
            const char = jsonText[i];

            if (escapeNext) {
                escapeNext = false;
                i++;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                i++;
                continue;
            }

            if (char === '"') {
                if (!inString) {
                    inString = true;
                    currentKey = '';
                    keyStartPosition = i;
                    i++;

                    while (i < jsonText.length) {
                        const stringChar = jsonText[i];
                        if (stringChar === '\\') {
                            i++;
                            if (i < jsonText.length) {
                                currentKey += jsonText[i];
                            }
                        } else if (stringChar === '"') {
                            inString = false;
                            break;
                        } else {
                            currentKey += stringChar;
                        }
                        i++;
                    }
                } else {
                    inString = false;
                }
                i++;
                continue;
            }

            if (inString) {
                i++;
                continue;
            }

            switch (char) {
                case '{':
                    contextStack.push({
                        type: 'object',
                        depth: contextStack.length
                    });
                    expectingValue = false;
                    currentKey = '';
                    break;

                case '}':
                    if (contextStack.length > 0 && (contextStack[contextStack.length - 1] ?? { type: undefined }).type === 'object') {
                        contextStack.pop();
                    }
                    expectingValue = false;
                    currentKey = '';
                    break;

                case '[':
                    contextStack.push({
                        type: 'array',
                        arrayIndex: 0,
                        depth: contextStack.length
                    });
                    expectingValue = false;
                    break;

                case ']':
                    if (contextStack.length > 0 && (contextStack[contextStack.length - 1] ?? { type: undefined }).type === 'array') {
                        contextStack.pop();
                    }
                    expectingValue = false;
                    break;

                case ':':
                    if (currentKey && contextStack.length > 0) {
                        const currentContext = contextStack[contextStack.length - 1]!;
                        if (currentContext.type === 'object') {
                            if (i < targetPosition) {
                                currentContext.key = currentKey;
                            }
                            expectingValue = true;
                        }
                    }
                    break;

                case ',':
                    expectingValue = false;

                    if (contextStack.length > 0) {
                        const currentContext = contextStack[contextStack.length - 1]!;

                        if (currentContext.type === 'array') {
                            currentContext.arrayIndex = (currentContext.arrayIndex ?? 0) + 1;
                        } else if (currentContext.type === 'object') {
                            if (i < targetPosition) {
                                delete currentContext.key;
                            }
                        }
                    }
                    currentKey = '';
                    break;

                case ' ':
                case '\t':
                case '\n':
                case '\r':
                    break;

                default:
                    if (!expectingValue && currentKey && keyStartPosition >= 0) {
                        if (targetPosition >= keyStartPosition && targetPosition <= i) {
                            if (contextStack.length > 0) {
                                const currentContext = contextStack[contextStack.length - 1]!;
                                if (currentContext.type === 'object') {
                                    currentContext.key = currentKey;
                                }
                            }
                        }
                    }
                    break;
            }

            i++;
        }

        if (contextStack.length === 0) {
            return null;
        }

        const pathParts: string[] = [];

        for (const context of contextStack) {
            if (context.type === 'object' && context.key) {
                pathParts.push(context.key);
            } else if (context.type === 'array' && typeof context.arrayIndex === 'number') {
                if (pathParts.length > 0) {
                    const lastIndex = pathParts.length - 1;
                    pathParts[lastIndex] += `[${context.arrayIndex}]`;
                }
            }
        }

        return pathParts.length > 0 ? pathParts.join('.') : null;

    } catch (error) {
        console.error('Error in findJsonPathByPosition:', error);
        return null;
    }
}

export function getJsonPath(document: vscode.TextDocument, position: vscode.Position): string | null {
    return safeExecute(() => {
        const text = document.getText();

        let isValidJson = false;
        try {
            JSON.parse(text);
            isValidJson = true;
        } catch (parseError) {
            // Continue with partial detection
        }

        const path = findJsonPathByPosition(text, position);

        if (!path && isValidJson) {
            return 'JSON';
        }

        return path;
    }, null, 'JSON path detection');
}

