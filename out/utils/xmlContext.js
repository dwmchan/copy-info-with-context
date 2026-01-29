"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getXmlPath = exports.getTagCountInDocument = exports.countTotalSiblingsInScope = exports.countSiblingsInCurrentScope = exports.countGlobalSiblings = void 0;
const cache_1 = require("./cache");
const positionHelpers_1 = require("./positionHelpers");
const safeExecution_1 = require("./safeExecution");
const config_1 = require("./config");
// Global sibling counting for XML
function countGlobalSiblings(xmlText, tagName, targetPosition) {
    try {
        const escapedTagName = (0, cache_1.escapeRegexSpecialChars)(tagName);
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
exports.countGlobalSiblings = countGlobalSiblings;
// Enhanced local sibling counting for XML
function findContainerByName(xmlText, parentTagName, targetPosition) {
    const parentRegex = new RegExp(`<\\b${(0, cache_1.escapeRegexSpecialChars)(parentTagName)}\\b[^>]*>`, 'g');
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
function findActualParentContainer(xmlText, targetDepth, targetPosition) {
    let currentDepth = 0;
    const targetParentDepth = targetDepth - 1;
    const allTagsRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
    let match;
    const elementStack = [];
    while ((match = allTagsRegex.exec(xmlText)) !== null && match.index < targetPosition) {
        const fullTag = match[0];
        const currentTagName = match[1];
        if (!currentTagName) {
            continue;
        }
        if (fullTag.startsWith('</')) {
            for (let i = elementStack.length - 1; i >= 0; i--) {
                if ((elementStack[i] ?? { name: undefined }).name === currentTagName) {
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
function countSiblingsInCurrentScope(xmlText, tagName, targetDepth, targetPosition) {
    try {
        const escapedTagName = (0, cache_1.escapeRegexSpecialChars)(tagName);
        // Find parent container using multiple strategies
        const strategies = [
            // Strategy 1: Simple pluralization
            () => findContainerByName(xmlText, `${tagName}s`, targetPosition),
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
                return parentName ? findContainerByName(xmlText, parentName, targetPosition) : null;
            },
            // Strategy 3: Dynamic parent detection
            () => findActualParentContainer(xmlText, targetDepth, targetPosition)
        ];
        // Try strategies until one succeeds
        let parentContainer = null;
        for (const strategy of strategies) {
            parentContainer = strategy();
            if (parentContainer) {
                break;
            }
        }
        if (!parentContainer) {
            return 0;
        }
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
exports.countSiblingsInCurrentScope = countSiblingsInCurrentScope;
function countTotalSiblingsInScope(xmlText, tagName, targetDepth, targetPosition) {
    try {
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        let currentDepth = 0;
        let parentStartPos = -1;
        let parentEndPos = xmlText.length;
        const targetParentDepth = targetDepth - 1;
        let foundParentStart = false;
        tagRegex.lastIndex = 0;
        let match;
        while ((match = tagRegex.exec(xmlText)) !== null) {
            const fullTag = match[0];
            const currentTagName = match[1];
            if (!currentTagName) {
                continue;
            }
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
        if (parentStartPos === -1) {
            return 1;
        }
        const parentText = xmlText.substring(parentStartPos, parentEndPos);
        const escapedTagName = (0, cache_1.escapeRegexSpecialChars)(tagName);
        const siblingRegex = new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g');
        const matches = parentText.match(siblingRegex);
        return matches ? matches.length : 1;
    }
    catch (error) {
        console.error('Error in countTotalSiblingsInScope:', error);
        return 1;
    }
}
exports.countTotalSiblingsInScope = countTotalSiblingsInScope;
function getTagCountInDocument(text, tagName) {
    const cacheKey = `${text.length}-${tagName}`;
    if (cache_1.tagCountCache.has(cacheKey)) {
        return cache_1.tagCountCache.get(cacheKey);
    }
    const escapedTagName = (0, cache_1.escapeRegexSpecialChars)(tagName);
    const matches = text.match(new RegExp(`<\\b${escapedTagName}\\b[^>]*>`, 'g'));
    const count = matches ? matches.length : 0;
    if (cache_1.tagCountCache.size < 50) {
        cache_1.tagCountCache.set(cacheKey, count);
    }
    return count;
}
exports.getTagCountInDocument = getTagCountInDocument;
// Memory-efficient XML path detection with configurable sibling indexing
function getXmlPath(document, position) {
    return (0, safeExecution_1.safeExecute)(() => {
        const text = document.getText();
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        const indexingMode = (0, config_1.getXmlIndexingMode)();
        const tagStack = [];
        const targetPosition = (0, positionHelpers_1.getAbsoluteCharPosition)(text, position.line, position.character);
        tagRegex.lastIndex = 0;
        let match;
        let currentDepth = 0;
        while ((match = tagRegex.exec(text)) !== null && match.index <= targetPosition) {
            const fullTag = match[0];
            const tagName = match[1];
            if (!tagName) {
                continue;
            }
            if (fullTag.startsWith('</')) {
                if (tagStack.length > 0 && (tagStack[tagStack.length - 1] ?? { name: undefined }).name === tagName) {
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
                    siblingIndex,
                    globalIndex,
                    totalSiblings
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
exports.getXmlPath = getXmlPath;
//# sourceMappingURL=xmlContext.js.map