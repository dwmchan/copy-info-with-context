/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock implementation of VS Code API for testing
 * This allows us to run tests in Node.js without the actual VS Code environment
 */

export class Position {
    constructor(public line: number, public character: number) {}
    
    translate(lineDelta?: number, characterDelta?: number): Position {
        return new Position(
            this.line + (lineDelta ?? 0),
            this.character + (characterDelta ?? 0)
        );
    }
    
    with(line?: number, character?: number): Position {
        return new Position(
            line !== undefined ? line : this.line,
            character !== undefined ? character : this.character
        );
    }
    
    compareTo(other: Position): number {
        if (this.line < other.line) {return -1;}
        if (this.line > other.line) {return 1;}
        if (this.character < other.character) {return -1;}
        if (this.character > other.character) {return 1;}
        return 0;
    }
    
    isEqual(other: Position): boolean {
        return this.line === other.line && this.character === other.character;
    }
    
    isBefore(other: Position): boolean {
        return this.compareTo(other) < 0;
    }
    
    isAfter(other: Position): boolean {
        return this.compareTo(other) > 0;
    }
    
    isBeforeOrEqual(other: Position): boolean {
        return this.compareTo(other) <= 0;
    }
    
    isAfterOrEqual(other: Position): boolean {
        return this.compareTo(other) >= 0;
    }
}

export class Range {
    constructor(
        public start: Position,
        public end: Position
    ) {}
    
    get isEmpty(): boolean {
        return this.start.isEqual(this.end);
    }
    
    get isSingleLine(): boolean {
        return this.start.line === this.end.line;
    }
    
    contains(positionOrRange: Position | Range): boolean {
        if (positionOrRange instanceof Position) {
            return positionOrRange.isAfterOrEqual(this.start) && positionOrRange.isBeforeOrEqual(this.end);
        }
        return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    
    isEqual(other: Range): boolean {
        return this.start.isEqual(other.start) && this.end.isEqual(other.end);
    }
    
    intersection(range: Range): Range | undefined {
        const start = this.start.isAfter(range.start) ? this.start : range.start;
        const end = this.end.isBefore(range.end) ? this.end : range.end;
        
        if (start.isAfter(end)) {
            return undefined;
        }
        
        return new Range(start, end);
    }
    
    union(other: Range): Range {
        const start = this.start.isBefore(other.start) ? this.start : other.start;
        const end = this.end.isAfter(other.end) ? this.end : other.end;
        return new Range(start, end);
    }
    
    with(start?: Position, end?: Position): Range {
        return new Range(
            start ?? this.start,
            end ?? this.end
        );
    }
}

export class Selection extends Range {
    constructor(
        anchor: Position,
        active: Position
    ) {
        super(anchor, active);
        this.anchor = anchor;
        this.active = active;
    }
    
    anchor: Position;
    active: Position;
    
    get isReversed(): boolean {
        return this.anchor.isAfter(this.active);
    }
}

export class Uri {
    constructor(
        public scheme: string,
        public authority: string,
        public path: string,
        public query: string,
        public fragment: string
    ) {}
    
    static file(path: string): Uri {
        return new Uri('file', '', path, '', '');
    }
    
    static parse(value: string): Uri {
        return new Uri('file', '', value, '', '');
    }
    
    toString(): string {
        return `${this.scheme}://${this.authority}${this.path}${this.query ? `?${  this.query}` : ''}${this.fragment ? `#${  this.fragment}` : ''}`;
    }
    
    toJSON(): any {
        return {
            scheme: this.scheme,
            authority: this.authority,
            path: this.path,
            query: this.query,
            fragment: this.fragment
        };
    }
}

export interface TextLine {
    lineNumber: number;
    text: string;
    range: Range;
    rangeIncludingLineBreak: Range;
    firstNonWhitespaceCharacterIndex: number;
    isEmptyOrWhitespace: boolean;
}

export interface TextDocument {
    uri: Uri;
    fileName: string;
    isUntitled: boolean;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;
    encoding: string;
    eol: EndOfLine;
    lineCount: number;
    save(): Thenable<boolean>;
    getText(range?: Range): string;
    getWordRangeAtPosition(position: Position): Range | undefined;
    lineAt(line: number): TextLine;
    lineAt(position: Position): TextLine;
    offsetAt(position: Position): number;
    positionAt(offset: number): Position;
    validateRange(range: Range): Range;
    validatePosition(position: Position): Position;
}

export enum EndOfLine {
    LF = 1,
    CRLF = 2
}

export interface TextEditor {
    document: TextDocument;
    selection: Selection;
    selections: Selection[];
    visibleRanges: Range[];
    options: any;
    viewColumn?: any;
}

export interface WorkspaceConfiguration {
    get<T>(section: string): T | undefined;
    get<T>(section: string, defaultValue: T): T;
    has(section: string): boolean;
    inspect(section: string): any;
    update(section: string, value: any): Thenable<void>;
}

export const workspace = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfiguration: (section?: string): WorkspaceConfiguration => {
        const mockConfig = new Map<string, unknown>();
        
        return {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                const fullKey = section ? `${section}.${key}` : key;
                return (mockConfig.get(fullKey) as T | undefined) ?? defaultValue;
            },
            has: (key: string): boolean => {
                const fullKey = section ? `${section}.${key}` : key;
                return mockConfig.has(fullKey);
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            inspect: (_key: string) => undefined,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            update: (_key: string, _value: unknown): Thenable<void> => {
                return Promise.resolve();
            }
        };
    }
};

export const window = {
    activeTextEditor: undefined as TextEditor | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showInformationMessage: (_message: string) => Promise.resolve(undefined),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showErrorMessage: (_message: string) => Promise.resolve(undefined),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    showQuickPick: <T>(_items: T[], _options?: any) => Promise.resolve(undefined as T | undefined)
};

export const env = {
    clipboard: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        writeText: (_value: string) => {
            // Mock clipboard - no-op in tests
        },
        readText: () => ''
    }
};

export const commands = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    registerCommand: (_command: string, _callback: (...args: any[]) => any) => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return { dispose: () => {} };
    }
};

export interface ExtensionContext {
    subscriptions: { dispose(): any }[];
    workspaceState: any;
    globalState: any;
    extensionPath: string;
    asAbsolutePath: (relativePath: string) => string;
}

export const mockExtensionContext: ExtensionContext = {
    subscriptions: [],
    workspaceState: {},
    globalState: {},
    extensionPath: '/mock/extension/path',
    asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`
};
