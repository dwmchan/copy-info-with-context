import * as vscode from 'vscode';
import { TagInfo } from '../types';
import { escapeRegexSpecialChars, tagCountCache } from './cache';
import { getAbsoluteCharPosition } from './positionHelpers';
import { safeExecute } from './safeExecution';
import { getXmlIndexingMode } from './config';

// Global sibling counting for XML
export function countGlobalSiblings(xmlText: string, tagName: string, targetPosition: number): number {
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
function findContainerByName(xmlText: string, parentTagName: string, targetPosition: number): {start: number, end: number} | null {
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

function findActualParentContainer(xmlText: string, targetDepth: number, targetPosition: number): {start: number, end: number} | null {
    let currentDepth = 0;
    const targetParentDepth = targetDepth - 1;
    const allTagsRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
    let match: RegExpExecArray | null;

    const elementStack: Array<{name: string, start: number, depth: number}> = [];

    while ((match = allTagsRegex.exec(xmlText)) !== null && match.index < targetPosition) {
        const fullTag = match[0];
        const currentTagName = match[1];

        if (!currentTagName) {continue;}

        if (fullTag.startsWith('</')) {
            for (let i = elementStack.length - 1; i >= 0; i--) {
                if ((elementStack[i] ?? { name: undefined }).name === currentTagName) {
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

export function countSiblingsInCurrentScope(xmlText: string, tagName: string, targetDepth: number, targetPosition: number): number {
    try {
        const escapedTagName = escapeRegexSpecialChars(tagName);

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

                const parentName = commonParents[tagName as keyof typeof commonParents];
                return parentName ? findContainerByName(xmlText, parentName, targetPosition) : null;
            },

            // Strategy 3: Dynamic parent detection
            () => findActualParentContainer(xmlText, targetDepth, targetPosition)
        ];

        // Try strategies until one succeeds
        let parentContainer: {start: number, end: number} | null = null;
        for (const strategy of strategies) {
            parentContainer = strategy();
            if (parentContainer) {break;}
        }

        if (!parentContainer) {return 0;}

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

export function countTotalSiblingsInScope(xmlText: string, tagName: string, targetDepth: number, targetPosition: number): number {
    try {
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;

        let currentDepth = 0;
        let parentStartPos = -1;
        let parentEndPos = xmlText.length;
        const targetParentDepth = targetDepth - 1;
        let foundParentStart = false;

        tagRegex.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = tagRegex.exec(xmlText)) !== null) {
            const fullTag = match[0];
            const currentTagName = match[1];

            if (!currentTagName) {continue;}

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

        if (parentStartPos === -1) {return 1;}

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

export function getTagCountInDocument(text: string, tagName: string): number {
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
export function getXmlPath(document: vscode.TextDocument, position: vscode.Position): string | null {
    return safeExecute(() => {
        const text = document.getText();
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        const indexingMode = getXmlIndexingMode();

        const tagStack: TagInfo[] = [];
        const targetPosition = getAbsoluteCharPosition(text, position.line, position.character);

        tagRegex.lastIndex = 0;

        let match: RegExpExecArray | null;
        let currentDepth = 0;

        while ((match = tagRegex.exec(text)) !== null && match.index <= targetPosition) {
            const fullTag = match[0];
            const tagName = match[1];

            if (!tagName) {continue;}

            if (fullTag.startsWith('</')) {
                if (tagStack.length > 0 && (tagStack[tagStack.length - 1] ?? { name: undefined }).name === tagName) {
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

