"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeContext = void 0;
const safeExecution_1 = require("./safeExecution");
// Function/class context detection for programming languages
function getCodeContext(document, position) {
    return (0, safeExecution_1.safeExecute)(() => {
        const text = document.getText();
        const lines = text.split('\n');
        const targetLine = position.line;
        const language = document.languageId;
        // Search backwards from current position to find function/class/method
        let functionName = null;
        let className = null;
        let namespaceName = null;
        for (let i = targetLine; i >= 0; i--) {
            const line = lines[i];
            if (!line) {
                continue;
            }
            // JavaScript/TypeScript function patterns
            if (language === 'javascript' || language === 'typescript' ||
                language === 'javascriptreact' || language === 'typescriptreact') {
                // function name(...) or const/let name = function(...) or const/let name = (...) =>
                const functionMatch = line.match(/(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function|async\s+function|\([^)]*\)\s*=>))/);
                if (functionMatch && !functionName) {
                    functionName = (functionMatch[1] ?? functionMatch[2]) ?? null;
                }
                // Class declarations
                const classMatch = line.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
                if (classMatch) {
                    className = classMatch[1] ?? null;
                    break;
                }
                // Method declarations (inside classes)
                const methodMatch = line.match(/^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[{:]/);
                if (methodMatch && !functionName) {
                    functionName = methodMatch[1] ?? null;
                }
            }
            // C# patterns
            if (language === 'csharp') {
                // C# method: public/private/protected/internal void/int/string MethodName(...)
                const methodMatch = line.match(/(?:public|private|protected|internal|static|virtual|override|async)?\s*(?:void|int|string|bool|double|float|decimal|object|var|Task(?:<[^>]+>)?|[A-Z][a-zA-Z0-9_]*(?:<[^>]+>)?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
                if (methodMatch && !functionName) {
                    functionName = methodMatch[1] ?? null;
                }
                // C# class
                const classMatch = line.match(/(?:public|private|protected|internal)?\s*(?:static|abstract|sealed)?\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (classMatch) {
                    className = classMatch[1] ?? null;
                    if (functionName) {
                        break;
                    } // Found both
                }
                // C# namespace
                const namespaceMatch = line.match(/namespace\s+([a-zA-Z_][a-zA-Z0-9_.]*)/);
                if (namespaceMatch) {
                    namespaceName = namespaceMatch[1] ?? null;
                    break;
                }
            }
            // Python patterns
            if (language === 'python') {
                // Python function: def function_name(...)
                const functionMatch = line.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
                if (functionMatch && !functionName) {
                    functionName = functionMatch[1] ?? null;
                }
                // Python class: class ClassName
                const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (classMatch) {
                    className = classMatch[1] ?? null;
                    if (functionName) {
                        break;
                    } // Found both
                }
            }
            // PowerShell patterns
            if (language === 'powershell') {
                // PowerShell function: function Verb-Noun or function FunctionName
                const functionMatch = line.match(/^\s*function\s+([a-zA-Z][a-zA-Z0-9-_]*)\s*[{(]/);
                if (functionMatch && !functionName) {
                    functionName = functionMatch[1] ?? null;
                }
                // PowerShell advanced function with CmdletBinding
                const advancedFunctionMatch = line.match(/^\s*function\s+([a-zA-Z][a-zA-Z0-9-_]*)\s*$/);
                if (advancedFunctionMatch && !functionName) {
                    functionName = advancedFunctionMatch[1] ?? null;
                }
                // PowerShell class (PowerShell 5.0+)
                const classMatch = line.match(/^\s*class\s+([a-zA-Z][a-zA-Z0-9_]*)/);
                if (classMatch) {
                    className = classMatch[1] ?? null;
                    if (functionName) {
                        break;
                    } // Found both
                }
            }
        }
        // Build context path based on language
        const parts = [];
        if (namespaceName) {
            parts.push(namespaceName);
        }
        if (className) {
            parts.push(className);
        }
        if (functionName) {
            parts.push(functionName);
        }
        return parts.length > 0 ? parts.join(' > ') : null;
    }, null, 'Code context detection');
}
exports.getCodeContext = getCodeContext;
//# sourceMappingURL=codeContext.js.map