import * as vscode from 'vscode';
import * as path from 'path';

// Configuration interface
interface CopyConfig {
    showLineNumbers: boolean;
    lineNumberPadding: boolean;
    showContextPath: boolean;
    enableColorCoding: boolean;
    colorTheme: string;
    showArrayIndices: boolean;
    maxFileSize: number;
}

// Module-level caches
const regexEscapeCache = new Map<string, string>();
const tagCountCache = new Map<string, number>();

// Safe execution wrapper to prevent extension crashes
function safeExecute<T>(fn: () => T, fallback: T, context?: string): T {
    try {
        return fn();
    } catch (error) {
        if (context) {
            console.error(`Error in ${context}:`, error);
        }
        return fallback;
    }
}

// Add these helper functions near the top of your file

function getFileSizeInfo(document: vscode.TextDocument): {lineCount: number, charCount: number, isLarge: boolean} {
    const lineCount = document.lineCount;
    const charCount = document.getText().length;
    
    // Use user setting instead of hardcoded value
    const config = vscode.workspace.getConfiguration('copyWithContext');
    const lineThreshold = config.get('largeFileLineThreshold', 2000);
    const LARGE_FILE_CHAR_THRESHOLD = 5000000;  // 5MB    // Keep this hardcoded
    
    const isLarge = lineCount > lineThreshold || charCount > LARGE_FILE_CHAR_THRESHOLD;
    
    return {lineCount, charCount, isLarge};
}

function shouldSkipIndexing(document: vscode.TextDocument): boolean {
    return getFileSizeInfo(document).isLarge;
}

function getBasicDocumentContext(document: vscode.TextDocument): string | null {
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
    if (filename.endsWith('.json') || filename.endsWith('.jsonc')) return 'JSON (Large File)';
    if (filename.endsWith('.xml') || filename.endsWith('.html')) return 'XML (Large File)';
    if (filename.endsWith('.csv')) return 'CSV (Large File)';
    if (filename.endsWith('.tsv')) return 'TSV (Large File)';
    
    return null;
}

// Command execution wrapper with user-friendly error handling
async function safeExecuteCommand(fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (error) {
        console.error('Command execution error:', error);
        vscode.window.showErrorMessage(`Copy with Context: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
}

// Configuration helpers
function getConfig(): CopyConfig {
    const config = vscode.workspace.getConfiguration('copyWithContext');
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

function getXmlIndexingMode(): 'local' | 'global' {
    const config = vscode.workspace.getConfiguration('copyWithContext');
    return config.get('xmlIndexingMode', 'local') as 'local' | 'global';
}

// Helper function to escape regex special characters
function escapeRegexSpecialChars(str: string): string {
    if (regexEscapeCache.has(str)) {
        return regexEscapeCache.get(str)!;
    }
    
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    if (regexEscapeCache.size < 100) {
        regexEscapeCache.set(str, escaped);
    }
    
    return escaped;
}

// Performance helper: convert line/char position to absolute character position
function getAbsoluteCharPosition(text: string, lineIndex: number, charIndex: number): number {
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
function countGlobalSiblings(xmlText: string, tagName: string, targetPosition: number): number {
    try {
        const escapedTagName = escapeRegexSpecialChars(tagName);
        const exactTagRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        
        let globalCount = 0;
        let match: RegExpExecArray | null;
        
        exactTagRegex.lastIndex = 0;
        
        while ((match = exactTagRegex.exec(xmlText)) !== null) {
            if (match.index >= targetPosition) {
                break;
            }
            globalCount++;
        }
        
        return globalCount;
        
    } catch (error) {
        console.error('Error in countGlobalSiblings:', error);
        return 0;
    }
}

// Enhanced local sibling counting for XML
function countSiblingsInCurrentScope(xmlText: string, tagName: string, targetDepth: number, targetPosition: number): number {
    try {
        const escapedTagName = escapeRegexSpecialChars(tagName);
        
        function findContainerByName(parentTagName: string): {start: number, end: number} | null {
            const parentRegex = new RegExp(`<\\b${escapeRegexSpecialChars(parentTagName)}\\b[^>]*>`, 'g');
            let parentMatch: RegExpExecArray | null;
            
            while ((parentMatch = parentRegex.exec(xmlText)) !== null) {
                const parentStart = parentMatch.index;
                const parentEnd = xmlText.indexOf(`</${parentTagName}>`, parentStart);
                
                if (parentStart <= targetPosition && (parentEnd === -1 || parentEnd >= targetPosition)) {
                    return {start: parentStart, end: parentEnd === -1 ? xmlText.length : parentEnd};
                }
            }
            
            return null;
        }
        
        function findActualParentContainer(): {start: number, end: number} | null {
            let currentDepth = 0;
            let targetParentDepth = targetDepth - 1;
            const allTagsRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
            let match: RegExpExecArray | null;
            
            const elementStack: Array<{name: string, start: number, depth: number}> = [];
            
            while ((match = allTagsRegex.exec(xmlText)) !== null && match.index < targetPosition) {
                const fullTag = match[0];
                const currentTagName = match[1];
                
                if (!currentTagName) continue;
                
                if (fullTag.startsWith('</')) {
                    for (let i = elementStack.length - 1; i >= 0; i--) {
                        if (elementStack[i]!.name === currentTagName) {
                            elementStack.splice(i, 1);
                            break;
                        }
                    }
                    currentDepth--;
                } else if (!fullTag.endsWith('/>')) {
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
                return {start: parent.start, end: parentEnd === -1 ? xmlText.length : parentEnd};
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
                
                const parentName = commonParents[tagName as keyof typeof commonParents];
                return parentName ? findContainerByName(parentName) : null;
            },
            
            // Strategy 3: Dynamic parent detection
            () => findActualParentContainer()
        ];
        
        // Try strategies until one succeeds
        let parentContainer: {start: number, end: number} | null = null;
        for (const strategy of strategies) {
            parentContainer = strategy();
            if (parentContainer) break;
        }
        
        if (!parentContainer) return 0;
        
        // Count siblings within the parent container
        const containerText = xmlText.substring(parentContainer.start, parentContainer.end);
        const childRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        
        let childCount = 0;
        let childMatch: RegExpExecArray | null;
        
        while ((childMatch = childRegex.exec(containerText)) !== null) {
            const absolutePos = parentContainer.start + childMatch.index;
            
            if (absolutePos >= targetPosition) {
                break;
            }
            
            childCount++;
        }
        
        return childCount;
        
    } catch (error) {
        return 0;
    }
}

function countTotalSiblingsInScope(xmlText: string, tagName: string, targetDepth: number, targetPosition: number): number {
    try {
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        
        let currentDepth = 0;
        let parentStartPos = -1;
        let parentEndPos = xmlText.length;
        let targetParentDepth = targetDepth - 1;
        let foundParentStart = false;
        
        tagRegex.lastIndex = 0;
        
        let match: RegExpExecArray | null;
        while ((match = tagRegex.exec(xmlText)) !== null) {
            const fullTag = match[0];
            const currentTagName = match[1];
            
            if (!currentTagName) continue;
            
            if (fullTag.startsWith('</')) {
                if (foundParentStart && currentDepth === targetParentDepth + 1) {
                    parentEndPos = match.index;
                    break;
                }
                currentDepth--;
            } else if (!fullTag.endsWith('/>')) {
                if (currentDepth === targetParentDepth && match.index < targetPosition) {
                    parentStartPos = match.index;
                    foundParentStart = true;
                }
                currentDepth++;
            }
        }
        
        if (parentStartPos === -1) return 1;
        
        const parentText = xmlText.substring(parentStartPos, parentEndPos);
        const escapedTagName = escapeRegexSpecialChars(tagName);
        const siblingRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        const matches = parentText.match(siblingRegex);
        
        return matches ? matches.length : 1;
        
    } catch (error) {
        console.error('Error in countTotalSiblingsInScope:', error);
        return 1;
    }
}

function getTagCountInDocument(text: string, tagName: string): number {
    const cacheKey = `${text.length}-${tagName}`;
    
    if (tagCountCache.has(cacheKey)) {
        return tagCountCache.get(cacheKey)!;
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
function getXmlPath(document: vscode.TextDocument, position: vscode.Position): string | null {
    return safeExecute(() => {
        const text = document.getText();
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        const indexingMode = getXmlIndexingMode();
        
        interface TagInfo {
            name: string;
            depth: number;
            siblingIndex: number;
            globalIndex: number;
            totalSiblings: number;
        }
        
        const tagStack: TagInfo[] = [];
        const targetPosition = getAbsoluteCharPosition(text, position.line, position.character);
        
        tagRegex.lastIndex = 0;
        
        let match: RegExpExecArray | null;
        let currentDepth = 0;
        
        while ((match = tagRegex.exec(text)) !== null && match.index <= targetPosition) {
            const fullTag = match[0];
            const tagName = match[1];
            
            if (!tagName) continue;
            
            if (fullTag.startsWith('</')) {
                if (tagStack.length > 0 && tagStack[tagStack.length - 1]!.name === tagName) {
                    tagStack.pop();
                }
                currentDepth--;
            } else if (!fullTag.endsWith('/>')) {
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
function findJsonPathByPosition(jsonText: string, position: vscode.Position): string | null {
    try {
        const targetPosition = getAbsoluteCharPosition(jsonText, position.line, position.character);
        
        interface JsonContext {
            type: 'object' | 'array';
            key?: string;
            arrayIndex?: number;
            depth: number;
        }
        
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
                    if (contextStack.length > 0 && contextStack[contextStack.length - 1]!.type === 'object') {
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
                    if (contextStack.length > 0 && contextStack[contextStack.length - 1]!.type === 'array') {
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
                            currentContext.arrayIndex = (currentContext.arrayIndex || 0) + 1;
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

function getJsonPath(document: vscode.TextDocument, position: vscode.Position): string | null {
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

// Enhanced XSD path detection
function getXsdPath(document: vscode.TextDocument, position: vscode.Position): string | null {
    return safeExecute(() => {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        
        const tagStack: Array<{name: string, xsdName?: string, index: number}> = [];
        
        // Parse from beginning through current position to build XSD path
        for (let i = 0; i <= currentLine; i++) {
            const line = lines[i];
            if (!line) continue;
            
            const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_:]*)[^>]*>/g;
            let match;
            
            while ((match = tagRegex.exec(line)) !== null) {
                // For current line, stop processing tags that start after cursor position
                if (i === currentLine && match.index > position.character) {
                    break;
                }
                
                const fullTag = match[0];
                const tagName = match[1];
                
                // Ensure tagName is defined
                if (!tagName) continue;
                
                if (fullTag.startsWith('</')) {
                    // Closing tag
                    tagStack.pop();
                } else if (!fullTag.endsWith('/>')) {
                    // Opening tag (not self-closing)
                    const siblingIndex = countXsdSiblingsBeforePosition(text, tagName, tagStack.length, i, match.index);
                    
                    // Create tag entry - only include xsdName if it exists
                    const tagEntry: {name: string, xsdName?: string, index: number} = {
                        name: tagName,
                        index: siblingIndex
                    };
                    
                    // Extract name attribute if this is an XSD element
                    if (isXsdElement(tagName)) {
                        const xsdName = extractNameAttribute(fullTag);
                        if (xsdName) {
                            tagEntry.xsdName = xsdName;
                        }
                    }
                    
                    tagStack.push(tagEntry);
                }
            }
        }
        
        // Special case: check if there's an XSD element starting on the current line at or after cursor position
        // This handles cases where cursor is at the beginning of an element tag
        const currentLineText = lines[currentLine];
        if (currentLineText) {
            const afterCursorText = currentLineText.substring(position.character);
            const elementMatch = afterCursorText.match(/^[^<]*<(xs:element|element)\s+name\s*=\s*["']([^"']+)["']/);
            
            if (elementMatch) {
                const tagName = elementMatch[1];
                const xsdName = elementMatch[2];
                
                // Add this element to the path
                const displayName = `${tagName}(${xsdName})`;
                
                // Build complete path
                const pathParts: string[] = [];
                
                // Add parent elements
                for (const tag of tagStack) {
                    let parentDisplayName = tag.name;
                    if (tag.xsdName) {
                        parentDisplayName = `${tag.name}(${tag.xsdName})`;
                    }
                    if (tag.index > 0) {
                        pathParts.push(`${parentDisplayName}[${tag.index}]`);
                    } else {
                        pathParts.push(parentDisplayName);
                    }
                }
                
                // Add current element
                pathParts.push(displayName);
                return pathParts.join(' > ');
            }
            
            // Also check if cursor is anywhere within an element tag on current line
            const beforeAndAtCursorText = currentLineText.substring(0, position.character + 1);
            const reverseElementMatch = beforeAndAtCursorText.match(/<(xs:element|element)\s+name\s*=\s*["']([^"']+)["'][^>]*$/);
            
            if (reverseElementMatch) {
                const tagName = reverseElementMatch[1];
                const xsdName = reverseElementMatch[2];
                
                // Add this element to the path
                const displayName = `${tagName}(${xsdName})`;
                
                // Build complete path
                const pathParts: string[] = [];
                
                // Add parent elements
                for (const tag of tagStack) {
                    let parentDisplayName = tag.name;
                    if (tag.xsdName) {
                        parentDisplayName = `${tag.name}(${tag.xsdName})`;
                    }
                    if (tag.index > 0) {
                        pathParts.push(`${parentDisplayName}[${tag.index}]`);
                    } else {
                        pathParts.push(parentDisplayName);
                    }
                }
                
                // Add current element
                pathParts.push(displayName);
                return pathParts.join(' > ');
            }
        }
        
        // Fallback: return parent path
        if (tagStack.length === 0) {
            return null;
        }
        
        const pathParts: string[] = [];
        for (const tag of tagStack) {
            let displayName = tag.name;
            if (tag.xsdName) {
                displayName = `${tag.name}(${tag.xsdName})`;
            }
            if (tag.index > 0) {
                pathParts.push(`${displayName}[${tag.index}]`);
            } else {
                pathParts.push(displayName);
            }
        }
        
        return pathParts.join(' > ');
    }, null, 'XSD path detection');
}

function isXsdElement(tagName: string): boolean {
    // Check if this is an XSD element that commonly has name attributes
    const xsdElements = new Set([
        'xs:element', 'xs:attribute', 'xs:type', 'xs:complexType', 'xs:simpleType',
        'xs:group', 'xs:attributeGroup', 'element', 'attribute', 'type',
        'complexType', 'simpleType', 'group', 'attributeGroup'
    ]);
    
    return xsdElements.has(tagName);
}

function extractNameAttribute(tagContent: string): string | undefined {
    // Performance optimized regex to extract name attribute
    // Uses a more specific pattern to avoid backtracking issues
    const nameMatch = tagContent.match(/\bname\s*=\s*["']([^"']+)["']/);
    return nameMatch ? nameMatch[1] : undefined;
}

function countXsdSiblingsBeforePosition(xmlText: string, tagName: string, targetDepth: number, lineIndex: number, charIndex: number): number {
    try {
        const lines = xmlText.split('\n');
        let siblingCount = 0;
        let currentDepth = 0;
        
        // Parse from beginning up to the current position
        for (let i = 0; i < lineIndex || (i === lineIndex && charIndex >= 0); i++) {
            const line = lines[i];
            if (!line) continue;
            
            const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_:]*)[^>]*>/g;
            let match;
            
            const endIndex = i === lineIndex ? charIndex : line.length;
            
            while ((match = tagRegex.exec(line)) !== null) {
                if (match.index >= endIndex) break;
                
                const fullTag = match[0];
                const currentTagName = match[1];
                
                // Ensure currentTagName is defined
                if (!currentTagName) continue;
                
                if (fullTag.startsWith('</')) {
                    currentDepth--;
                } else if (!fullTag.endsWith('/>')) {
                    if (currentDepth === targetDepth && currentTagName === tagName) {
                        siblingCount++;
                    }
                    currentDepth++;
                }
            }
            
            // Reset regex for next iteration
            tagRegex.lastIndex = 0;
        }
        
        return Math.max(0, siblingCount - 1);
        
    } catch (error) {
        console.error('Error counting XSD siblings:', error);
        return 0;
    }
}



// Document Context
function getDocumentContext(document: vscode.TextDocument, position: vscode.Position): string | null {
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
            // Check if this is an XSD file specifically
            if (filename.endsWith('.xsd')) {
                return getXsdPath(document, position);
            }
            return getXmlPath(document, position);
        default:
            // Check by file extension for files VS Code might not recognize
            if (filename.endsWith('.xsd')) {
                return getXsdPath(document, position);
            }
            if (filename.endsWith('.csv') || filename.endsWith('.tsv') || 
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv') || filename.endsWith('.txt')) {
                return null;
            }
            return null;
    }
}


// Delimited file helper functions
function detectDelimiter(text: string): string {
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

function parseDelimitedLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    fields.push(current.trim());
    return fields;
}

function getDelimiterName(delimiter: string): string {
    const delimiterNames: { [key: string]: string } = {
        ',': 'CSV (Comma-Separated)',
        '\t': 'TSV (Tab-Separated)',
        '|': 'PSV (Pipe-Separated)',
        ';': 'SSV (Semicolon-Separated)',
        ':': 'CSV (Colon-Separated)',
        ' ': 'SSV (Space-Separated)'
    };
    return delimiterNames[delimiter] || 'Delimited';
}

function detectHeaders(text: string): boolean {
    try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return false;
        
        const delimiter = detectDelimiter(text);
        const firstRowFields = parseDelimitedLine(lines[0]!, delimiter);
        const secondRowFields = parseDelimitedLine(lines[1]!, delimiter);
        
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
        
    } catch (error) {
        return true;
    }
}

function getColumnRange(document: vscode.TextDocument, selection: vscode.Selection): { startColumn: number; endColumn: number; columnNames: string[] } {
    try {
        const text = document.getText();
        const delimiter = detectDelimiter(text);
        const lines = text.split('\n');
        
        if (lines.length === 0) {
            return { startColumn: 0, endColumn: 0, columnNames: [] };
        }
        
        const firstLine = lines[0]!;
        const headers = parseDelimitedLine(firstLine, delimiter);
        const hasHeaders = detectHeaders(text);
        
        const currentLine = lines[selection.start.line];
        if (!currentLine) {
            return { startColumn: 0, endColumn: 0, columnNames: [] };
        }
        
        const currentFields = parseDelimitedLine(currentLine, delimiter);
        
        const startChar = selection.start.character;
        const endChar = selection.end.character;
        
        let selectedColumns: string[] = [];
        let currentPos = 0;
        let startColumn = 0;
        let endColumn = 0;
        let foundStart = false;
        
        for (let i = 0; i < currentFields.length; i++) {
            const fieldLength = currentFields[i]!.length;
            const fieldEnd = currentPos + fieldLength;
            
            if (!foundStart && currentPos <= startChar && startChar <= fieldEnd) {
                startColumn = i;
                foundStart = true;
            }
            
            if (foundStart && currentPos <= endChar && endChar <= fieldEnd) {
                endColumn = i;
                break;
            }
            
            if (currentPos <= startChar || (foundStart && currentPos <= endChar)) {
                if (i < headers.length && hasHeaders) {
                    selectedColumns.push(headers[i]!.replace(/^["']|["']$/g, ''));
                } else {
                    selectedColumns.push(`Column ${i + 1}`);
                }
            }
            
            currentPos += fieldLength + 1;
        }
        
        return {
            startColumn,
            endColumn,
            columnNames: selectedColumns.filter((col, index, arr) => arr.indexOf(col) === index)
        };
    } catch (error) {
        return { startColumn: 0, endColumn: 0, columnNames: [] };
    }
}

function getDelimitedContextWithSelection(document: vscode.TextDocument, selection: vscode.Selection): string | null {
    return safeExecute(() => {
        const text = document.getText();
        const delimiter = detectDelimiter(text);
        const delimiterName = getDelimiterName(delimiter);
        
        if (selection.isEmpty) {
            return delimiterName;
        }
        
        const columnInfo = getColumnRange(document, selection);
        
        if (columnInfo.columnNames.length > 0) {
            return `${delimiterName} > ${columnInfo.columnNames.join(', ')}`;
        }
        
        return delimiterName;
        
    }, null, 'Delimited file context detection');
}

// Path enhancement with array indices
function enhancePathWithArrayIndices(contextPath: string, document: vscode.TextDocument, position: vscode.Position, language: string): string {
    const filename = document.fileName.toLowerCase();
    
    // Skip enhancement if this is an XSD file (already handled by getXsdPath)
    if (filename.endsWith('.xsd')) {
        return contextPath;
    }
    
    // Continue with existing logic for other file types
    const config = vscode.workspace.getConfiguration('copyWithContext');
    const showArrayIndices = config.get<boolean>('showArrayIndices', true);
    
    if (!showArrayIndices) {
        return contextPath;
    }
    
    try {
        const text = document.getText();
        const pathParts = contextPath.split(/[\s>]+/).filter(part => part.trim());
        
        switch (language) {
            case 'json':
            case 'jsonc':
                return enhanceJsonPathWithIndices(text, position, pathParts);
            case 'xml':
            case 'html':
            case 'xhtml':
            case 'htm':
                return enhanceXmlPathWithIndices(text, position, pathParts);
            default:
                return contextPath;
        }
    } catch (error) {
        console.error('Error enhancing path with array indices:', error);
        return contextPath;
    }
}

function enhanceJsonPathWithIndices(jsonText: string, position: vscode.Position, pathParts: string[]): string {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join('.');
        }
        
        const accuratePath = findJsonPathByPosition(jsonText, position);
        return accuratePath || pathParts.join('.');
        
    } catch (error) {
        console.error('Error in enhanceJsonPathWithIndices:', error);
        return pathParts.join('.');
    }
}

function enhanceXmlPathWithIndices(xmlText: string, position: vscode.Position, pathParts: string[]): string {
    try {
        if (pathParts.some(part => part.includes('['))) {
            return pathParts.join(' > ');
        }
        
        const document = {
            getText: () => xmlText,
            languageId: 'xml'
        } as vscode.TextDocument;
        
        const accuratePath = getXmlPath(document, position);
        return accuratePath || pathParts.join(' > ');
        
    } catch (error) {
        console.error('Error in enhanceXmlPathWithIndices:', error);
        return pathParts.join(' > ');
    }
}

function formatCodeWithLineNumbers(
    selectedText: string, 
    startLine: number, 
    showLineNumbers: boolean, 
    useLineNumberPadding: boolean
): string {
    if (!showLineNumbers) {
        return selectedText;
    }
    
    const lines = selectedText.split('\n');
    const maxLineNumber = startLine + lines.length - 1;
    const padding = useLineNumberPadding ? maxLineNumber.toString().length : 0;
    
    const numberedLines = lines.map((line: string, index: number) => {
        const lineNumber = startLine + index;
        const paddedLineNumber = useLineNumberPadding 
            ? lineNumber.toString().padStart(padding, ' ')
            : lineNumber.toString();
        return `${paddedLineNumber}: ${line}`;
    });
    
    return numberedLines.join('\n');
}

function addBasicSyntaxHighlighting(code: string, language: string): string {
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

function createHtmlWithSyntaxHighlighting(code: string, language: string, header: string): string {
    const highlightedCode = addBasicSyntaxHighlighting(code, language);
    return `<div style="font-family: 'Consolas', 'Monaco', monospace; background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px;">
<div style="color: #6a9955; margin-bottom: 8px;">${escapeHtml(header)}</div>
<pre style="margin: 0; white-space: pre-wrap;">${highlightedCode}</pre>
</div>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Main copy handler
async function handleCopyWithContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document;
    const selection = editor.selection;
    
    const fileName = document.fileName;
    const displayName = document.isUntitled 
        ? 'Untitled' 
        : path.basename(fileName);
    
    let selectedText: string;
    let startLine: number;
    let endLine: number;
    
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    } else {
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
            
            const isExplicitlyDelimited = (
                language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') || 
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv')
            );
            
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
    } else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    
    const formattedContent = formatCodeWithLineNumbers(
        selectedText, 
        startLine, 
        config.showLineNumbers, 
        config.lineNumberPadding
    );
    
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const output = `${header}\n${formattedContent}`;
    
    await vscode.env.clipboard.writeText(output);
    
    // Show different message for performance mode
    if (sizeInfo.isLarge) {
        vscode.window.showInformationMessage(`Code copied! (Performance mode: ${sizeInfo.lineCount} lines)`);
    } else {
        vscode.window.showInformationMessage('Code copied with context!');
    }
}

async function handleCopyWithHtmlHighlighting(): Promise<void> {
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document;
    const selection = editor.selection;
    
    const fileName = document.fileName;
    const displayName = document.isUntitled 
        ? 'Untitled' 
        : path.basename(fileName);
    
    let selectedText: string;
    let startLine: number;
    let endLine: number;
    
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    } else {
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
            
            const isExplicitlyDelimited = (
                language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') || 
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv')
            );
            
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
    } else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    
    const formattedContent = formatCodeWithLineNumbers(
        selectedText, 
        startLine, 
        config.showLineNumbers, 
        config.lineNumberPadding
    );
    
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const htmlOutput = createHtmlWithSyntaxHighlighting(formattedContent, document.languageId, header);
    
    await vscode.env.clipboard.writeText(htmlOutput);
    vscode.window.showInformationMessage('Code copied with HTML highlighting!');
}

async function handleCopyWithMarkdown(): Promise<void> {
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document;
    const selection = editor.selection;
    
    const fileName = document.fileName;
    const displayName = document.isUntitled 
        ? 'Untitled' 
        : path.basename(fileName);
    
    let selectedText: string;
    let startLine: number;
    let endLine: number;
    
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    } else {
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
            
            const isExplicitlyDelimited = (
                language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') || 
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv')
            );
            
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
    } else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    
    const formattedContent = formatCodeWithLineNumbers(
        selectedText, 
        startLine, 
        config.showLineNumbers, 
        config.lineNumberPadding
    );
    
    const language = document.languageId;
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const markdownOutput = `${header}\n\`\`\`${language}\n${formattedContent}\n\`\`\``;
    
    await vscode.env.clipboard.writeText(markdownOutput);
    vscode.window.showInformationMessage('Code copied as Markdown!');
}

async function handleCopyWithCustomFormat(): Promise<void> {
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

async function handleCopyWithAnsiColors(): Promise<void> {
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document;
    const selection = editor.selection;
    
    const fileName = document.fileName;
    const displayName = document.isUntitled 
        ? 'Untitled' 
        : path.basename(fileName);
    
    let selectedText: string;
    let startLine: number;
    let endLine: number;
    
    if (selection.isEmpty) {
        const line = document.lineAt(selection.active.line);
        selectedText = line.text;
        startLine = line.lineNumber + 1;
        endLine = startLine;
    } else {
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
            
            const isExplicitlyDelimited = (
                language === 'csv' || language === 'tsv' || language === 'psv' ||
                filename.endsWith('.csv') || filename.endsWith('.tsv') || 
                filename.endsWith('.psv') || filename.endsWith('.ssv') ||
                filename.endsWith('.dsv')
            );
            
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
    } else {
        lineNumberInfo = `:${startLine}-${endLine}`;
    }
    
    const formattedContent = formatCodeWithLineNumbers(
        selectedText, 
        startLine, 
        config.showLineNumbers, 
        config.lineNumberPadding
    );
    
    const header = `// ${displayName}${lineNumberInfo}${contextInfo}`;
    const ansiOutput = `\x1b[32m${header}\x1b[0m\n${formattedContent}`;
    
    await vscode.env.clipboard.writeText(ansiOutput);
    vscode.window.showInformationMessage('Code copied with ANSI colors!');
}

// Extension activation
export function activate(context: vscode.ExtensionContext): void {
    console.log('Copy with Context extension is now active!');

    const copyCommand = vscode.commands.registerCommand('copyWithContext.copySelection', async () => {
        if (vscode.window.activeTextEditor) {
            await safeExecuteCommand(handleCopyWithContext);
        }
    });

    const copyHtmlCommand = vscode.commands.registerCommand('copyWithContext.copySelectionHTML', async () => {
        if (vscode.window.activeTextEditor) {
            await safeExecuteCommand(handleCopyWithHtmlHighlighting);
        }
    });

    const copyCustomCommand = vscode.commands.registerCommand('copyWithContext.copySelectionCustom', async () => {
        if (vscode.window.activeTextEditor) {
            await safeExecuteCommand(handleCopyWithCustomFormat);
        }
    });

    context.subscriptions.push(copyCommand, copyHtmlCommand, copyCustomCommand);
}

export function deactivate(): void {}