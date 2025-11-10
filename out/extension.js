"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
// Module-level caches
const regexEscapeCache = new Map();
const tagCountCache = new Map();
// Safe execution wrapper to prevent extension crashes
function safeExecute(fn, fallback, context) {
    try {
        return fn();
    }
    catch (error) {
        if (context) {
            console.error(`Error in ${context}:`, error);
        }
        return fallback;
    }
}
// Add these helper functions near the top of your file
function getFileSizeInfo(document) {
    const lineCount = document.lineCount;
    const charCount = document.getText().length;
    // Use user setting instead of hardcoded value
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    const lineThreshold = config.get('largeFileLineThreshold', 2000);
    const LARGE_FILE_CHAR_THRESHOLD = 5000000; // 5MB    // Keep this hardcoded
    const isLarge = lineCount > lineThreshold || charCount > LARGE_FILE_CHAR_THRESHOLD;
    return { lineCount, charCount, isLarge };
}
function shouldSkipIndexing(document) {
    return getFileSizeInfo(document).isLarge;
}
function getBasicDocumentContext(document) {
    const language = document.languageId;
    const filename = document.fileName.toLowerCase();
    // Return simple file type indicators without expensive parsing
    switch (language) {
        case 'json':
        case 'jsonc':
            return 'JSON (Large File)';
        case 'xml':
        case 'html':
        case 'xhtml':
        case 'htm':
            return 'XML (Large File)';
        case 'csv':
            return 'CSV (Large File)';
        case 'tsv':
            return 'TSV (Large File)';
    }
    // Check by extension for unrecognized files
    if (filename.endsWith('.json') || filename.endsWith('.jsonc'))
        return 'JSON (Large File)';
    if (filename.endsWith('.xml') || filename.endsWith('.html'))
        return 'XML (Large File)';
    if (filename.endsWith('.csv'))
        return 'CSV (Large File)';
    if (filename.endsWith('.tsv'))
        return 'TSV (Large File)';
    return null;
}
// Command execution wrapper with user-friendly error handling
async function safeExecuteCommand(fn) {
    try {
        await fn();
    }
    catch (error) {
        console.error('Command execution error:', error);
        vscode.window.showErrorMessage(`Copy Info with Context: ${error instanceof Error ?
            error.message : 'Unknown error occurred'}`);
    }
}
// Configuration helpers
function getConfig() {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    return {
        showLineNumbers: config.get('showLineNumbers', true),
        lineNumberPadding: config.get('lineNumberPadding', false),
        showContextPath: config.get('showContextPath', true),
        enableColorCoding: config.get('enableColorCoding', false),
        colorTheme: config.get('colorTheme', 'dark'),
        showArrayIndices: config.get('showArrayIndices', true),
        maxFileSize: config.get('maxFileSize', 5000000)
    };
}
function getXmlIndexingMode() {
    const config = vscode.workspace.getConfiguration('copyInfoWithContext');
    return config.get('xmlIndexingMode', 'local');
}
// Helper function to escape regex special characters
function escapeRegexSpecialChars(str) {
    if (regexEscapeCache.has(str)) {
        return regexEscapeCache.get(str);
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (regexEscapeCache.size < 100) {
        regexEscapeCache.set(str, escaped);
    }
    return escaped;
}
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
// Global sibling counting for XML
function countGlobalSiblings(xmlText, tagName, targetPosition) {
    try {
        const escapedTagName = escapeRegexSpecialChars(tagName);
        const exactTagRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        let globalCount = 0;
        let match;
        exactTagRegex.lastIndex = 0;
        while ((match = exactTagRegex.exec(xmlText)) !== null) {
            if (match.index >= targetPosition) {
                break;
            }
            globalCount++;
        }
        return globalCount;
    }
    catch (error) {
        console.error('Error in countGlobalSiblings:', error);
        return 0;
    }
}
// Enhanced local sibling counting for XML
function countSiblingsInCurrentScope(xmlText, tagName, targetDepth, targetPosition) {
    try {
        const escapedTagName = escapeRegexSpecialChars(tagName);
        function findContainerByName(parentTagName) {
            const parentRegex = new RegExp(`<\\b${escapeRegexSpecialChars(parentTagName)}\\b[^>]*>`, 'g');
            let parentMatch;
            while ((parentMatch = parentRegex.exec(xmlText)) !== null) {
                const parentStart = parentMatch.index;
                const parentEnd = xmlText.indexOf(`</${parentTagName}>`, parentStart);
                if (parentStart <= targetPosition && (parentEnd === -1 || parentEnd >= targetPosition)) {
                    return { start: parentStart, end: parentEnd === -1 ? xmlText.length : parentEnd };
                }
            }
            return null;
        }
        function findActualParentContainer() {
            let currentDepth = 0;
            let targetParentDepth = targetDepth - 1;
            const allTagsRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
            let match;
            const elementStack = [];
            while ((match = allTagsRegex.exec(xmlText)) !== null && match.index < targetPosition) {
                const fullTag = match[0];
                const currentTagName = match[1];
                if (!currentTagName)
                    continue;
                if (fullTag.startsWith('</')) {
                    for (let i = elementStack.length - 1; i >= 0; i--) {
                        if (elementStack[i].name === currentTagName) {
                            elementStack.splice(i, 1);
                            break;
                        }
                    }
                    currentDepth--;
                }
                else if (!fullTag.endsWith('/>')) {
                    elementStack.push({
                        name: currentTagName,
                        start: match.index,
                        depth: currentDepth
                    });
                    currentDepth++;
                }
            }
            const parent = elementStack.find(el => el.depth === targetParentDepth);
            if (parent) {
                const parentEnd = xmlText.indexOf(`</${parent.name}>`, parent.start);
                return { start: parent.start, end: parentEnd === -1 ? xmlText.length : parentEnd };
            }
            return null;
        }
        // Find parent container using multiple strategies
        const strategies = [
            // Strategy 1: Simple pluralization
            () => findContainerByName(tagName + 's'),
            // Strategy 2: Common XML patterns
            () => {
                const commonParents = {
                    'FormResponse': 'FormInstance',
                    'Response': 'FormInstance',
                    'Question': 'FormInstance',
                    'Item': 'Items',
                    'Element': 'Elements',
                    'Entry': 'Entries'
                };
                const parentName = commonParents[tagName];
                return parentName ? findContainerByName(parentName) : null;
            },
            // Strategy 3: Dynamic parent detection
            () => findActualParentContainer()
        ];
        // Try strategies until one succeeds
        let parentContainer = null;
        for (const strategy of strategies) {
            parentContainer = strategy();
            if (parentContainer)
                break;
        }
        if (!parentContainer)
            return 0;
        // Count siblings within the parent container
        const containerText = xmlText.substring(parentContainer.start, parentContainer.end);
        const childRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        let childCount = 0;
        let childMatch;
        while ((childMatch = childRegex.exec(containerText)) !== null) {
            const absolutePos = parentContainer.start + childMatch.index;
            if (absolutePos >= targetPosition) {
                break;
            }
            childCount++;
        }
        return childCount;
    }
    catch (error) {
        return 0;
    }
}
function countTotalSiblingsInScope(xmlText, tagName, targetDepth, targetPosition) {
    try {
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        let currentDepth = 0;
        let parentStartPos = -1;
        let parentEndPos = xmlText.length;
        let targetParentDepth = targetDepth - 1;
        let foundParentStart = false;
        tagRegex.lastIndex = 0;
        let match;
        while ((match = tagRegex.exec(xmlText)) !== null) {
            const fullTag = match[0];
            const currentTagName = match[1];
            if (!currentTagName)
                continue;
            if (fullTag.startsWith('</')) {
                if (foundParentStart && currentDepth === targetParentDepth + 1) {
                    parentEndPos = match.index;
                    break;
                }
                currentDepth--;
            }
            else if (!fullTag.endsWith('/>')) {
                if (currentDepth === targetParentDepth && match.index < targetPosition) {
                    parentStartPos = match.index;
                    foundParentStart = true;
                }
                currentDepth++;
            }
        }
        if (parentStartPos === -1)
            return 1;
        const parentText = xmlText.substring(parentStartPos, parentEndPos);
        const escapedTagName = escapeRegexSpecialChars(tagName);
        const siblingRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        const matches = parentText.match(siblingRegex);
        return matches ? matches.length : 1;
    }
    catch (error) {
        console.error('Error in countTotalSiblingsInScope:', error);
        return 1;
    }
}
function getTagCountInDocument(text, tagName) {
    const cacheKey = `${text.length}-${tagName}`;
    if (tagCountCache.has(cacheKey)) {
        return tagCountCache.get(cacheKey);
    }
    const escapedTagName = escapeRegexSpecialChars(tagName);
    const matches = text.match(new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g'));
    const count = matches ? matches.length : 0;
    if (tagCountCache.size < 50) {
        tagCountCache.set(cacheKey, count);
    }
    return count;
}
// Memory-efficient XML path detection with configurable sibling indexing
function getXmlPath(document, position) {
    return safeExecute(() => {
        const text = document.getText();
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        const indexingMode = getXmlIndexingMode();
        const tagStack = [];
        const targetPosition = getAbsoluteCharPosition(text, position.line, position.character);
        tagRegex.lastIndex = 0;
        let match;
        let currentDepth = 0;
        while ((match = tagRegex.exec(text)) !== null && match.index <= targetPosition) {
            const fullTag = match[0];
            const tagName = match[1];
            if (!tagName)
                continue;
            if (fullTag.startsWith('</')) {
                if (tagStack.length > 0 && tagStack[tagStack.length - 1].name === tagName) {
                    tagStack.pop();
                }
                currentDepth--;
            }
            else if (!fullTag.endsWith('/>')) {
                const siblingIndex = countSiblingsInCurrentScope(text, tagName, currentDepth, match.index);
                const globalIndex = countGlobalSiblings(text, tagName, match.index);
                const totalSiblings = countTotalSiblingsInScope(text, tagName, currentDepth, match.index);
                tagStack.push({
                    name: tagName,
                    depth: currentDepth,
                    siblingIndex: siblingIndex,
                    globalIndex: globalIndex,
                    totalSiblings: totalSiblings
                });
                currentDepth++;
            }
        }
        if (tagStack.length === 0) {
            return null;
        }
        // Use configured indexing mode
        const pathParts = tagStack.map(tag => {
            const indexToUse = indexingMode === 'global' ? tag.globalIndex : tag.siblingIndex;
            if (indexToUse >= 0) {
                const tagCount = getTagCountInDocument(text, tag.name);
                if (tagCount > 1 || indexToUse > 0) {
                    return `${tag.name}[${indexToUse}]`;
                }
            }
            return tag.name;
        });
        return pathParts.join(' > ');
    }, null, 'XML path detection');
}
// Enhanced JSON path detection
function findJsonPathByPosition(jsonText, position) {
    try {
        const targetPosition = getAbsoluteCharPosition(jsonText, position.line, position.character);
        const contextStack = [];
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
                        }
                        else if (stringChar === '"') {
                            inString = false;
                            break;
                        }
                        else {
                            currentKey += stringChar;
                        }
                        i++;
                    }
                }
                else {
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
                    if (contextStack.length > 0 && contextStack[contextStack.length - 1].type === 'object') {
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
                    if (contextStack.length > 0 && contextStack[contextStack.length - 1].type === 'array') {
                        contextStack.pop();
                    }
                    expectingValue = false;
                    break;
                case ':':
                    if (currentKey && contextStack.length > 0) {
                        const currentContext = contextStack[contextStack.length - 1];
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
                        const currentContext = contextStack[contextStack.length - 1];
                        if (currentContext.type === 'array') {
                            currentContext.arrayIndex = (currentContext.arrayIndex || 0) + 1;
                        }
                        else if (currentContext.type === 'object') {
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
                                const currentContext = contextStack[contextStack.length - 1];
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
        const pathParts = [];
        for (const context of contextStack) {
            if (context.type === 'object' && context.key) {
                pathParts.push(context.key);
            }
            else if (context.type === 'array' && typeof context.arrayIndex === 'number') {
                if (pathParts.length > 0) {
                    const lastIndex = pathParts.length - 1;
                    pathParts[lastIndex] += `[${context.arrayIndex}]`;
                }
            }
        }
        return pathParts.length > 0 ? pathParts.join('.') : null;
    }
    catch (error) {
        console.error('Error in findJsonPathByPosition:', error);
        return null;
    }
}
function getJsonPath(document, position) {
    return safeExecute(() => {
        const text = document.getText();
        let isValidJson = false;
        try {
            JSON.parse(text);
            isValidJson = true;
        }
        catch (parseError) {
            // Continue with partial detection
        }
        const path = findJsonPathByPosition(text, position);
        if (!path && isValidJson) {
            return 'JSON';
        }
        return path;
    }, null, 'JSON path detection');
}
// Function/class context detection for programming languages
function getCodeContext(document, position) {
    return safeExecute(() => {
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
            if (!line)
                continue;
            // JavaScript/TypeScript function patterns
            if (language === 'javascript' || language === 'typescript' ||
                language === 'javascriptreact' || language === 'typescriptreact') {
                // function name(...) or const/let name = function(...) or const/let name = (...) =>
                const functionMatch = line.match(/(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function|async\s+function|\([^)]*\)\s*=>))/);
                if (functionMatch && !functionName) {
                    functionName = (functionMatch[1] || functionMatch[2]) ?? null;
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
                    if (functionName)
                        break; // Found both
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
                    if (functionName)
                        break; // Found both
                }
            }
            // PowerShell patterns
            if (language === 'powershell') {
                // PowerShell function: function Verb-Noun or function FunctionName
                const functionMatch = line.match(/^\s*function\s+([a-zA-Z][a-zA-Z0-9-_]*)\s*[{\(]/);
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
                    if (functionName)
                        break; // Found both
                }
            }
        }
        // Build context path based on language
        const parts = [];
        if (namespaceName)
            parts.push(namespaceName);
        if (className)
            parts.push(className);
        if (functionName)
            parts.push(functionName);
        return parts.length > 0 ? parts.join(' > ') : null;
    }, null, 'Code context detection');
}
function getDocumentContext(document, position) {
    // Performance check: skip complex indexing for large files
    if (shouldSkipIndexing(document)) {
        console.log(`Large file detected (${document.lineCount} lines) - using performance mode`);
        return getBasicDocumentContext(document);
    }
    // Regular logic for smaller files
    const language = document.languageId;
    const filename = document.fileName.toLowerCase();
    switch (language) {
        case 'json':
        case 'jsonc':
            return getJsonPath(document, position);
        case 'xml':
        case 'html':
        case 'xhtml':
        case 'htm':
            return getXmlPath(document, position);
        case 'csv':
        case 'tsv':
        case 'psv':
            return null;
        case 'javascript':
        case 'typescript':
        case 'javascriptreact':
        case 'typescriptreact':
        case 'csharp':
        case 'python':
        case 'powershell':
            return getCodeContext(document, position);
    }
    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) {
        return getJsonPath(document, position);
    }
    if (filename.endsWith('.xml') || filename.endsWith('.html') ||
        filename.endsWith('.htm') || filename.endsWith('.xhtml')) {
        return getXmlPath(document, position);
    }
    if (filename.endsWith('.csv') || filename.endsWith('.tsv') ||
        filename.endsWith('.psv') || filename.endsWith('.ssv') ||
        filename.endsWith('.dsv')) {
        return null;
    }
    if (filename.endsWith('.js') || filename.endsWith('.ts') ||
        filename.endsWith('.jsx') || filename.endsWith('.tsx') ||
        filename.endsWith('.cs') || filename.endsWith('.py') ||
        filename.endsWith('.ps1') || filename.endsWith('.psm1') || filename.endsWith('.psd1')) {
        return getCodeContext(document, position);
    }
    return null;
}
// Delimited file helper functions
function detectDelimiter(text) {
    const firstLine = text.split('\n')[0] || '';
    const delimiters = [',', '\t', '|', ';', ':'];
    let maxCount = 0;
    let bestDelimiter = ',';
    for (const delimiter of delimiters) {
        const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delimiter;
        }
    }
    return bestDelimiter;
}
function parseDelimitedLine(line, delimiter) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === delimiter && !inQuotes) {
            fields.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    fields.push(current.trim());
    return fields;
}
function getDelimiterName(delimiter) {
    const delimiterNames = {
        ',': 'CSV (Comma-Separated)',
        '\t': 'TSV (Tab-Separated)',
        '|': 'PSV (Pipe-Separated)',
        ';': 'SSV (Semicolon-Separated)',
        ':': 'CSV (Colon-Separated)',
        ' ': 'SSV (Space-Separated)'
    };
    return delimiterNames[delimiter] || 'Delimited';
}
function detectHeaders(text) {
    try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2)
            return false;
        const delimiter = detectDelimiter(text);
        const firstRowFields = parseDelimitedLine(lines[0], delimiter);
        const secondRowFields = parseDelimitedLine(lines[1], delimiter);
        if (firstRowFields.length !== secondRowFields.length) {
            return true;
        }
        const headerIndicators = ['id', 'name', 'email', 'address', 'phone', 'date', 'time', 'status', 'type', 'code', 'number', 'description', 'title', 'category', 'group'];
        const headerWords = firstRowFields.some(field => {
            const cleaned = field.toLowerCase().trim().replace(/^["']|["']$/g, '');
            return headerIndicators.some(indicator => cleaned.includes(indicator));
        });
        if (headerWords) {
            return true;
        }
        return true;
    }
    catch (error) {
        return true;
    }
}
function getColumnRangeFromSelection(line, selection, delimiter, fields) {
    try {
        const selectionStart = selection.start.character;
        const selectionEnd = selection.end.character;
        let charPosition = 0;
        let startColumn = -1;
        let endColumn = -1;
        // Process each field with TypeScript safety
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            // TypeScript safety: Handle undefined/null fields
            if (field == null || field === undefined) {
                // Skip undefined fields but advance position properly
                if (i < fields.length - 1) {
                    charPosition += delimiter.length;
                }
                continue;
            }
            const fieldStart = charPosition;
            const fieldEnd = charPosition + field.length; // Now field.length is safe
            // Check if selection starts within this field (not on preceding delimiter)
            if (startColumn === -1 && selectionStart >= fieldStart && selectionStart < fieldEnd) {
                startColumn = i;
            }
            // Check if selection ends within this field (not on following delimiter)  
            if (selectionEnd > fieldStart && selectionEnd <= fieldEnd) {
                endColumn = i;
            }
            // SPECIAL CASE: If selection starts exactly on delimiter, start from next field
            if (startColumn === -1 && i < fields.length - 1) {
                const delimiterStart = fieldEnd;
                const delimiterEnd = fieldEnd + delimiter.length;
                if (selectionStart >= delimiterStart && selectionStart < delimiterEnd) {
                    startColumn = i + 1;
                }
            }
            // Early termination optimization
            if (startColumn !== -1 && endColumn !== -1) {
                break;
            }
            // Advance character position properly
            charPosition = fieldEnd;
            if (i < fields.length - 1) {
                charPosition += delimiter.length;
            }
        }
        // Handle edge cases
        if (startColumn === -1 && endColumn !== -1) {
            startColumn = 0;
        }
        if (startColumn !== -1 && endColumn === -1) {
            endColumn = fields.length - 1;
        }
        // Final validation
        if (startColumn === -1 || endColumn === -1 || startColumn > endColumn) {
            return null;
        }
        return { startColumn, endColumn };
    }
    catch (error) {
        return null;
    }
}
function getDelimitedContextWithSelection(document, selection) {
    return safeExecute(() => {
        const text = document.getText();
        const delimiter = detectDelimiter(text);
        const delimiterName = getDelimiterName(delimiter);
        const lines = text.split('\n');
        if (lines.length === 0)
            return delimiterName;
        // Get column information if possible
        const firstLine = lines[0];
        if (!firstLine)
            return delimiterName;
        // Parse headers properly, considering quoted fields
        const headers = parseDelimitedLine(firstLine, delimiter);
        const currentLine = lines[selection.start.line];
        if (!currentLine)
            return delimiterName;
        // Parse the current line to find which columns are selected
        const fields = parseDelimitedLine(currentLine, delimiter);
        // Check if first row looks like headers - use YOUR function signature (text: string)
        const hasHeaders = detectHeaders(text);
        // Find which columns are covered by the selection
        const columnRange = getColumnRangeFromSelection(currentLine, selection, delimiter, fields);
        if (columnRange) {
            const { startColumn, endColumn } = columnRange;
            if (startColumn === endColumn) {
                // Single column - TypeScript safe
                let columnName;
                const header = headers[startColumn];
                if (hasHeaders && startColumn < headers.length && header != null && header !== undefined) {
                    columnName = header.trim().replace(/^["']|["']$/g, '');
                }
                else {
                    columnName = `Column ${startColumn + 1}`;
                }
                return `${delimiterName} > ${columnName}`;
            }
            else {
                // Multiple columns - TypeScript safe
                const columnNames = [];
                for (let i = startColumn; i <= endColumn; i++) {
                    const header = headers[i];
                    if (hasHeaders && i < headers.length && header != null && header !== undefined) {
                        const headerName = header.trim().replace(/^["']|["']$/g, '');
                        columnNames.push(headerName);
                    }
                    else {
                        columnNames.push(`Column ${i + 1}`);
                    }
                }
                return `${delimiterName} > ${columnNames.join(', ')}`;
            }
        }
        return delimiterName;
    }, null, 'Delimited file context detection');
}
// Path enhancement with array indices
function enhancePathWithArrayIndices(baseContext, document, position, language) {
    if (!baseContext)
        return baseContext;
    try {
        switch (language) {
            case 'json':
            case 'jsonc':
                return enhanceJsonPathWithIndices(document.getText(), position, baseContext.split('.'));
            case 'xml':
            case 'html':
            case 'xhtml':
            case 'htm':
                return enhanceXmlPathWithIndices(document.getText(), position, baseContext.split(' > '));
            default:
                return baseContext;
        }
    }
    catch (error) {
        console.error('Error enhancing path with indices:', error);
        return baseContext;
    }
}
function enhanceJsonPathWithIndices(jsonText, position, pathParts) {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join('.');
        }
        const accuratePath = findJsonPathByPosition(jsonText, position);
        return accuratePath || pathParts.join('.');
    }
    catch (error) {
        console.error('Error in enhanceJsonPathWithIndices:', error);
        return pathParts.join('.');
    }
}
function enhanceXmlPathWithIndices(xmlText, position, pathParts) {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join(' > ');
        }
        const document = {
            getText: () => xmlText,
            languageId: 'xml'
        };
        const accuratePath = getXmlPath(document, position);
        return accuratePath || pathParts.join(' > ');
    }
    catch (error) {
        console.error('Error in enhanceXmlPathWithIndices:', error);
        return pathParts.join(' > ');
    }
}
function formatCodeWithLineNumbers(selectedText, startLine, showLineNumbers, useLineNumberPadding) {
    if (!showLineNumbers) {
        return selectedText;
    }
    const lines = selectedText.split('\n');
    const maxLineNumber = startLine + lines.length - 1;
    const padding = useLineNumberPadding ? maxLineNumber.toString().length : 0;
    // Find minimum indentation across all non-empty lines
    const minIndent = lines.reduce((min, line) => {
        if (line.trim().length === 0)
            return min; // Skip empty lines
        const indent = line.length - line.trimStart().length;
        return Math.min(min, indent);
    }, Infinity);
    // Determine how much to strip: if min > 2, strip enough to bring it down to acceptable level
    const stripAmount = minIndent > 2 ? minIndent : 0;
    const numberedLines = lines.map((line, index) => {
        const lineNumber = startLine + index;
        const paddedLineNumber = useLineNumberPadding
            ? lineNumber.toString().padStart(padding, ' ')
            : lineNumber.toString();
        // Strip common indentation while maintaining relative structure
        let processedLine = line;
        if (stripAmount > 0 && line.length > stripAmount) {
            processedLine = line.substring(stripAmount);
        }
        return `${paddedLineNumber}: ${processedLine}`;
    });
    return numberedLines.join('\n');
}
function addBasicSyntaxHighlighting(code, language) {
    let highlighted = escapeHtml(code);
    switch (language) {
        case 'json':
        case 'jsonc':
            highlighted = highlighted
                .replace(/(".*?")/g, '<span style="color: #CE9178">$1</span>')
                .replace(/\b(\d+\.?\d*)\b/g, '<span style="color: #B5CEA8">$1</span>')
                .replace(/\b(true|false|null)\b/g, '<span style="color: #569CD6">$1</span>');
            break;
        case 'javascript':
        case 'typescript':
            highlighted = highlighted
                .replace(/\b(const|let|var|function|class|if|else|for|while|return|import|export)\b/g, '<span style="color: #569CD6">$1</span>')
                .replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: #CE9178">$1</span>');
            break;
        case 'xml':
        case 'html':
            highlighted = highlighted
                .replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-_]*)/g, '$1<span style="color: #569CD6">$2</span>')
                .replace(/([a-zA-Z-]+)=(".*?")/g, '<span style="color: #9CDCFE">$1</span>=<span style="color: #CE9178">$2</span>');
            break;
    }
    return highlighted;
}
function createHtmlWithSyntaxHighlighting(code, language, header) {
    const highlightedCode = addBasicSyntaxHighlighting(code, language);
    return `<div style="font-family: 'Consolas', 'Monaco', monospace; background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px;">
<div style="color: #6a9955; margin-bottom: 8px;">${escapeHtml(header)}</div>
<pre style="margin: 0; white-space: pre-wrap;">${highlightedCode}</pre>
</div>`;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Main copy handler
async function handleCopyWithContext() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    const selection = editor.selection;
    const fileName = document.fileName;
    const displayName = document.isUntitled
        ? 'Untitled'
        : path.basename(fileName);
    let selectedText;
    let startLine;
    let endLine;
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    }
    else {
        selectedText = document.getText(selection);
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;
    }
    const config = getConfig();
    const sizeInfo = getFileSizeInfo(document); // ADD THIS LINE
    let contextInfo = '';
    if (config.showContextPath) {
        let context = getDocumentContext(document, selection.start);
        // Only try delimited detection if not in performance mode
        if (!context && !selection.isEmpty && !sizeInfo.isLarge) { // ADD SIZE CHECK
            const filename = document.fileName.toLowerCase();
            const language = document.languageId;
            const isExplicitlyDelimited = (language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv'));
            if (isExplicitlyDelimited) {
                context = getDelimitedContextWithSelection(document, selection);
            }
        }
        // Skip path enhancement for large files (performance optimization)
        if (context && !sizeInfo.isLarge) { // ADD SIZE CHECK
            context = enhancePathWithArrayIndices(context, document, selection.start, document.languageId);
        }
        if (context) {
            contextInfo = ` (${context})`;
        }
    }
    let lineNumberInfo = '';
    if (startLine === endLine) {
        lineNumberInfo = `:${startLine}`;
    }
    else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    const formattedContent = formatCodeWithLineNumbers(selectedText, startLine, config.showLineNumbers, config.lineNumberPadding);
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const output = `${header}\n${formattedContent}`;
    await vscode.env.clipboard.writeText(output);
    // Show different message for performance mode
    if (sizeInfo.isLarge) {
        vscode.window.showInformationMessage(`Code copied! (Performance mode: ${sizeInfo.lineCount} lines)`);
    }
    else {
        vscode.window.showInformationMessage('Code copied with context!');
    }
}
async function handleCopyWithHtmlHighlighting() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    const selection = editor.selection;
    const fileName = document.fileName;
    const displayName = document.isUntitled
        ? 'Untitled'
        : path.basename(fileName);
    let selectedText;
    let startLine;
    let endLine;
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    }
    else {
        selectedText = document.getText(selection);
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;
    }
    const config = getConfig();
    let contextInfo = '';
    if (config.showContextPath) {
        let context = getDocumentContext(document, selection.start);
        if (!context && !selection.isEmpty) {
            const filename = document.fileName.toLowerCase();
            const language = document.languageId;
            const isExplicitlyDelimited = (language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv'));
            if (isExplicitlyDelimited) {
                context = getDelimitedContextWithSelection(document, selection);
            }
        }
        if (context) {
            context = enhancePathWithArrayIndices(context, document, selection.start, document.languageId);
            contextInfo = ` (${context})`;
        }
    }
    let lineNumberInfo = '';
    if (startLine === endLine) {
        lineNumberInfo = `:${startLine}`;
    }
    else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    const formattedContent = formatCodeWithLineNumbers(selectedText, startLine, config.showLineNumbers, config.lineNumberPadding);
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const htmlOutput = createHtmlWithSyntaxHighlighting(formattedContent, document.languageId, header);
    await vscode.env.clipboard.writeText(htmlOutput);
    vscode.window.showInformationMessage('Code copied with HTML highlighting!');
}
async function handleCopyWithMarkdown() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    const selection = editor.selection;
    const fileName = document.fileName;
    const displayName = document.isUntitled
        ? 'Untitled'
        : path.basename(fileName);
    let selectedText;
    let startLine;
    let endLine;
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    }
    else {
        selectedText = document.getText(selection);
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;
    }
    const config = getConfig();
    let contextInfo = '';
    if (config.showContextPath) {
        let context = getDocumentContext(document, selection.start);
        if (!context && !selection.isEmpty) {
            const filename = document.fileName.toLowerCase();
            const language = document.languageId;
            const isExplicitlyDelimited = (language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv'));
            if (isExplicitlyDelimited) {
                context = getDelimitedContextWithSelection(document, selection);
            }
        }
        if (context) {
            context = enhancePathWithArrayIndices(context, document, selection.start, document.languageId);
            contextInfo = ` (${context})`;
        }
    }
    let lineNumberInfo = '';
    if (startLine === endLine) {
        lineNumberInfo = `:${startLine}`;
    }
    else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    const formattedContent = formatCodeWithLineNumbers(selectedText, startLine, config.showLineNumbers, config.lineNumberPadding);
    const language = document.languageId;
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const markdownOutput = `${header}\n\`\`\`${language}\n${formattedContent}\n\`\`\``;
    await vscode.env.clipboard.writeText(markdownOutput);
    vscode.window.showInformationMessage('Code copied as Markdown!');
}
async function handleCopyWithCustomFormat() {
    const formats = [
        'Plain Text with Context',
        'HTML with Syntax Highlighting',
        'Markdown Code Block',
        'ANSI Colored Text'
    ];
    const selected = await vscode.window.showQuickPick(formats, {
        placeHolder: 'Choose output format'
    });
    if (!selected)
        return;
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
async function handleCopyWithAnsiColors() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    const selection = editor.selection;
    const fileName = document.fileName;
    const displayName = document.isUntitled
        ? 'Untitled'
        : path.basename(fileName);
    let selectedText;
    let startLine;
    let endLine;
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    }
    else {
        selectedText = document.getText(selection);
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;
    }
    const config = getConfig();
    let contextInfo = '';
    if (config.showContextPath) {
        let context = getDocumentContext(document, selection.start);
        if (!context && !selection.isEmpty) {
            const filename = document.fileName.toLowerCase();
            const language = document.languageId;
            const isExplicitlyDelimited = (language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') ||
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv'));
            if (isExplicitlyDelimited) {
                context = getDelimitedContextWithSelection(document, selection);
            }
        }
        if (context) {
            context = enhancePathWithArrayIndices(context, document, selection.start, document.languageId);
            contextInfo = ` (${context})`;
        }
    }
    let lineNumberInfo = '';
    if (startLine === endLine) {
        lineNumberInfo = `:${startLine}`;
    }
    else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    const formattedContent = formatCodeWithLineNumbers(selectedText, startLine, config.showLineNumbers, config.lineNumberPadding);
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const ansiOutput = `\x1b[32m${header}\x1b[0m\n${formattedContent}`;
    await vscode.env.clipboard.writeText(ansiOutput);
    vscode.window.showInformationMessage('Code copied with ANSI colors!');
}
// Extension activation
function activate(context) {
    console.log('Copy Info with Context extension is now active!');
    const copyCommand = vscode.commands.registerCommand('copyInfoWithContext.copySelection', async () => {
        if (vscode.window.activeTextEditor) {
            await safeExecuteCommand(handleCopyWithContext);
        }
    });
    const copyHtmlCommand = vscode.commands.registerCommand('copyInfoWithContext.copySelectionHTML', async () => {
        if (vscode.window.activeTextEditor) {
            await safeExecuteCommand(handleCopyWithHtmlHighlighting);
        }
    });
    const copyCustomCommand = vscode.commands.registerCommand('copyInfoWithContext.copySelectionCustom', async () => {
        if (vscode.window.activeTextEditor) {
            await safeExecuteCommand(handleCopyWithCustomFormat);
        }
    });
    context.subscriptions.push(copyCommand, copyHtmlCommand, copyCustomCommand);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map