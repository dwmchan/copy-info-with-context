// Configuration interface
export interface CopyConfig {
    showLineNumbers: boolean;
    lineNumberPadding: boolean;
    showContextPath: boolean;
    enableColorCoding: boolean;
    colorTheme: string;
    showArrayIndices: boolean;
    maxFileSize: number;
    csvOutputMode: 'minimal' | 'smart' | 'table' | 'detailed';
    csvTableShowTypes: boolean;
    csvTableMaxRows: number;
    csvTableMaxColumns: number;
    csvTableAlignNumbers: 'left' | 'right';
}

// JSON context tracking interface
export interface JsonContext {
    type: 'object' | 'array';
    key?: string;
    arrayIndex?: number;
    depth: number;
}

// XML tag information interface
export interface TagInfo {
    name: string;
    depth: number;
    siblingIndex: number;
    globalIndex: number;
    totalSiblings: number;
}

// File size information interface
export interface FileSizeInfo {
    lineCount: number;
    charCount: number;
    isLarge: boolean;
}

// Column range information interface
export interface ColumnRange {
    startColumn: number;
    endColumn: number;
}

// Column alignment type
export type ColumnAlignment = 'left' | 'right' | 'center';
