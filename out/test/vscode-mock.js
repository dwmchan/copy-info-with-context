"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock implementation of VS Code API for testing
 * This allows us to run tests in Node.js without the actual VS Code environment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockExtensionContext = exports.commands = exports.env = exports.window = exports.workspace = exports.EndOfLine = exports.Uri = exports.Selection = exports.Range = exports.Position = void 0;
class Position {
    line;
    character;
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
    translate(lineDelta, characterDelta) {
        return new Position(this.line + (lineDelta ?? 0), this.character + (characterDelta ?? 0));
    }
    with(line, character) {
        return new Position(line !== undefined ? line : this.line, character !== undefined ? character : this.character);
    }
    compareTo(other) {
        if (this.line < other.line) {
            return -1;
        }
        if (this.line > other.line) {
            return 1;
        }
        if (this.character < other.character) {
            return -1;
        }
        if (this.character > other.character) {
            return 1;
        }
        return 0;
    }
    isEqual(other) {
        return this.line === other.line && this.character === other.character;
    }
    isBefore(other) {
        return this.compareTo(other) < 0;
    }
    isAfter(other) {
        return this.compareTo(other) > 0;
    }
    isBeforeOrEqual(other) {
        return this.compareTo(other) <= 0;
    }
    isAfterOrEqual(other) {
        return this.compareTo(other) >= 0;
    }
}
exports.Position = Position;
class Range {
    start;
    end;
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    get isEmpty() {
        return this.start.isEqual(this.end);
    }
    get isSingleLine() {
        return this.start.line === this.end.line;
    }
    contains(positionOrRange) {
        if (positionOrRange instanceof Position) {
            return positionOrRange.isAfterOrEqual(this.start) && positionOrRange.isBeforeOrEqual(this.end);
        }
        return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    isEqual(other) {
        return this.start.isEqual(other.start) && this.end.isEqual(other.end);
    }
    intersection(range) {
        const start = this.start.isAfter(range.start) ? this.start : range.start;
        const end = this.end.isBefore(range.end) ? this.end : range.end;
        if (start.isAfter(end)) {
            return undefined;
        }
        return new Range(start, end);
    }
    union(other) {
        const start = this.start.isBefore(other.start) ? this.start : other.start;
        const end = this.end.isAfter(other.end) ? this.end : other.end;
        return new Range(start, end);
    }
    with(start, end) {
        return new Range(start ?? this.start, end ?? this.end);
    }
}
exports.Range = Range;
class Selection extends Range {
    constructor(anchor, active) {
        super(anchor, active);
        this.anchor = anchor;
        this.active = active;
    }
    anchor;
    active;
    get isReversed() {
        return this.anchor.isAfter(this.active);
    }
}
exports.Selection = Selection;
class Uri {
    scheme;
    authority;
    path;
    query;
    fragment;
    constructor(scheme, authority, path, query, fragment) {
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.query = query;
        this.fragment = fragment;
    }
    static file(path) {
        return new Uri('file', '', path, '', '');
    }
    static parse(value) {
        return new Uri('file', '', value, '', '');
    }
    toString() {
        return `${this.scheme}://${this.authority}${this.path}${this.query ? `?${this.query}` : ''}${this.fragment ? `#${this.fragment}` : ''}`;
    }
    toJSON() {
        return {
            scheme: this.scheme,
            authority: this.authority,
            path: this.path,
            query: this.query,
            fragment: this.fragment
        };
    }
}
exports.Uri = Uri;
var EndOfLine;
(function (EndOfLine) {
    EndOfLine[EndOfLine["LF"] = 1] = "LF";
    EndOfLine[EndOfLine["CRLF"] = 2] = "CRLF";
})(EndOfLine = exports.EndOfLine || (exports.EndOfLine = {}));
exports.workspace = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfiguration: (section) => {
        const mockConfig = new Map();
        return {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            get: (key, defaultValue) => {
                const fullKey = section ? `${section}.${key}` : key;
                return mockConfig.get(fullKey) ?? defaultValue;
            },
            has: (key) => {
                const fullKey = section ? `${section}.${key}` : key;
                return mockConfig.has(fullKey);
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            inspect: (_key) => undefined,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            update: (_key, _value) => {
                return Promise.resolve();
            }
        };
    }
};
exports.window = {
    activeTextEditor: undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showInformationMessage: (_message) => Promise.resolve(undefined),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showErrorMessage: (_message) => Promise.resolve(undefined),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    showQuickPick: (_items, _options) => Promise.resolve(undefined)
};
exports.env = {
    clipboard: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        writeText: (_value) => {
            // Mock clipboard - no-op in tests
        },
        readText: () => ''
    }
};
exports.commands = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    registerCommand: (_command, _callback) => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return { dispose: () => { } };
    }
};
exports.mockExtensionContext = {
    subscriptions: [],
    workspaceState: {},
    globalState: {},
    extensionPath: '/mock/extension/path',
    asAbsolutePath: (relativePath) => `/mock/extension/path/${relativePath}`
};
//# sourceMappingURL=vscode-mock.js.map