"use strict";
// csv.ts - CSV-specific masking with column-aware detection
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskCsvText = void 0;
const csvHelpers_1 = require("./csvHelpers");
const presets_1 = require("./presets");
const maskingFunctions_1 = require("./maskingFunctions");
/**
 * Mask sensitive data in CSV text with column-aware detection
 * Detects column headers and masks entire columns based on column names
 *
 * @param text - CSV text to mask
 * @param config - Masking configuration
 * @param headersLine - Optional external header line (for data-only selections)
 * @returns Masked result with detections
 */
function maskCsvText(text, config, headersLine) {
    const lines = text.split('\n');
    if (lines.length === 0) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }
    const effectiveConfig = (0, presets_1.applyPreset)(config);
    let headers;
    let dataStartIndex = 0;
    let includeHeaderInOutput = true;
    if (headersLine) {
        headers = (0, csvHelpers_1.parseCsvLine)(headersLine);
        dataStartIndex = 0;
        includeHeaderInOutput = false;
    }
    else {
        const firstLine = lines[0] ?? '';
        headers = (0, csvHelpers_1.parseCsvLine)(firstLine);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }
    const maskColumns = headers.map(h => (0, csvHelpers_1.shouldMaskColumn)(h, effectiveConfig));
    const allDetections = [];
    const maskedLines = includeHeaderInOutput ? [lines[0] ?? ''] : [];
    for (let i = dataStartIndex; i < lines.length; i++) {
        const values = (0, csvHelpers_1.parseCsvLine)(lines[i] ?? '');
        const maskedValues = [];
        for (let colIdx = 0; colIdx < values.length; colIdx++) {
            const value = values[colIdx] ?? '';
            const header = headers[colIdx] ?? '';
            if (maskColumns[colIdx] && value.trim()) {
                const columnType = (0, csvHelpers_1.detectColumnType)(header);
                const maskFn = maskingFunctions_1.MASKING_FUNCTIONS[columnType] ?? maskingFunctions_1.maskGeneric;
                const maskedValue = maskFn(value, effectiveConfig.strategy);
                maskedValues.push(maskedValue);
                allDetections.push({
                    type: columnType,
                    originalValue: value,
                    maskedValue,
                    line: i + 1,
                    column: colIdx,
                    confidence: 0.95,
                    columnContext: {
                        name: header,
                        index: colIdx
                    }
                });
            }
            else {
                maskedValues.push(value);
            }
        }
        maskedLines.push(maskedValues.join(','));
    }
    return {
        maskedText: maskedLines.join('\n'),
        detections: allDetections,
        maskingApplied: allDetections.length > 0
    };
}
exports.maskCsvText = maskCsvText;
//# sourceMappingURL=csv.js.map