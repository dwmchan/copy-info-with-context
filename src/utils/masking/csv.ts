// csv.ts - CSV-specific masking with column-aware detection
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts

import { MaskingConfig, MaskedResult, Detection, PiiType } from './config';
import { parseCsvLine, shouldMaskColumn, detectColumnType } from './csvHelpers';
import { applyPreset } from './presets';
import { maskGeneric, MASKING_FUNCTIONS } from './maskingFunctions';

/**
 * Mask sensitive data in CSV text with column-aware detection
 * Detects column headers and masks entire columns based on column names
 *
 * @param text - CSV text to mask
 * @param config - Masking configuration
 * @param headersLine - Optional external header line (for data-only selections)
 * @returns Masked result with detections
 */
export function maskCsvText(
    text: string,
    config: MaskingConfig,
    headersLine?: string
): MaskedResult {
    const lines = text.split('\n');
    if (lines.length === 0) {
        return {
            maskedText: text,
            detections: [],
            maskingApplied: false
        };
    }

    const effectiveConfig = applyPreset(config);

    let headers: string[];
    let dataStartIndex = 0;
    let includeHeaderInOutput = true;

    if (headersLine) {
        headers = parseCsvLine(headersLine);
        dataStartIndex = 0;
        includeHeaderInOutput = false;
    } else {
        const firstLine = lines[0] ?? '';
        headers = parseCsvLine(firstLine);
        dataStartIndex = 1;
        includeHeaderInOutput = true;
    }

    const maskColumns = headers.map(h => shouldMaskColumn(h, effectiveConfig));

    const allDetections: Detection[] = [];
    const maskedLines: string[] = includeHeaderInOutput ? [lines[0] ?? ''] : [];

    for (let i = dataStartIndex; i < lines.length; i++) {
        const values = parseCsvLine(lines[i] ?? '');
        const maskedValues: string[] = [];

        for (let colIdx = 0; colIdx < values.length; colIdx++) {
            const value = values[colIdx] ?? '';
            const header = headers[colIdx] ?? '';

            if (maskColumns[colIdx] && value.trim()) {
                const columnType = detectColumnType(header);
                const maskFn = MASKING_FUNCTIONS[columnType] ?? maskGeneric;
                const maskedValue = maskFn(value, effectiveConfig.strategy);

                maskedValues.push(maskedValue);

                allDetections.push({
                    type: columnType as PiiType,
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
            } else {
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