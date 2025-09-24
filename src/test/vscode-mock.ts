/**
 * Mock implementation of VS Code API for testing
 * This allows us to run tests in Node.js without the actual VS Code environment
 */

export class Position {
    constructor(public line: number, public character: number) {}
    
    translate(lineDelta?: number, characterDelta?: number): Position {
        return new Position(
            this.line + (lineDelta || 0),
            this.character + (characterDelta || 0)
        );
    }
    
    with(line?: number, character?: number): Position {
        return new Position(
            line !== undefined ? line : this.line,
            character !== undefined ? character : this.character
        );
    }
    
    compareTo(other: Position): number {
        if (this.line < other.line) return -1;
        if (this.line > other.line) return 1;
        if (this.character < other.character) return -1;
        if (this.character > other.character) return 1;
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
            start || this.start,
            end || this.end
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
        return `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`;
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
    inspect<T>(section: string): any;
    update(section: string, value: any): Thenable<void>;
}

export const workspace = {
    getConfiguration: (section?: string): WorkspaceConfiguration => {
        const mockConfig = new Map<string, any>();
        
        return {
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                const fullKey = section ? `${section}.${key}` : key;
                return mockConfig.get(fullKey) ?? defaultValue;
            },
            has: (key: string): boolean => {
                const fullKey = section ? `${section}.${key}` : key;
                return mockConfig.has(fullKey);
            },
            inspect: (key: string) => undefined,
            update: async (key: string, value: any) => {
                const fullKey = section ? `${section}.${key}` : key;
                mockConfig.set(fullKey, value);
            }
        };
    }
};

export const window = {
    activeTextEditor: undefined as TextEditor | undefined,
    showInformationMessage: (message: string) => Promise.resolve(undefined),
    showErrorMessage: (message: string) => Promise.resolve(undefined),
    showQuickPick: <T>(items: T[], options?: any) => Promise.resolve(undefined as T | undefined)
};

export const env = {
    clipboard: {
        writeText: async (value: string) => {
            // Mock clipboard - in real tests you might want to capture this
            console.log('Clipboard write:', value);
        },
        readText: async () => ''
    }
};

export const commands = {
    registerCommand: (command: string, callback: (...args: any[]) => any) => {
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