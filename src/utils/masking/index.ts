// index.ts - Central export point for masking utilities
// Phase 1 (v1.6.0): Modular architecture

// Configuration and types
export {
    PiiType,
    MaskingStrategy,
    Detection,
    MaskedResult,
    CustomPattern,
    MaskingConfig,
    getMaskingConfig,
    getEnabledTypes,
    configProcessor
} from './config';

// Pattern detection
export {
    patternFactory,
    DETECTION_PATTERNS
} from './patterns';

// Confidence scoring and validation
export {
    checkStatisticalAnomalies,
    detectStructureType,
    getAdaptiveThreshold,
    calculateMaskingConfidence,
    isNonBirthDateField,
    isInsideFieldName
} from './confidence';

// Format validators
export {
    isBirthDateField,
    isPlausibleBirthDate,
    shouldMaskAsDateOfBirth,
    isValidEmailFormat,
    isValidPhoneFormat,
    luhnCheck,
    validateAustralianTFN,
    validateAustralianABN,
    isValidBSBFormat,
    isValidIBANFormat,
    isValidIPv4,
    isValidIPv6
} from './validators';

// Masking functions
export {
    maskGeneric,
    maskEmail,
    maskPhone,
    maskSSN,
    maskCreditCard,
    maskAddress,
    maskDateOfBirth,
    maskPassport,
    maskDriversLicense,
    maskNationalID,
    maskAustralianBSB,
    maskAccountNumber,
    maskAustralianTFN,
    maskAustralianABN,
    maskAustralianMedicare,
    maskIPAddress,
    maskIBAN,
    maskSWIFT
} from './maskingFunctions';

// CSV utilities
export {
    detectDelimiter,
    parseCsvLine,
    shouldMaskColumn,
    detectColumnType,
    detectHeaders,
    getColumnRangeFromSelection,
    buildAsciiTable,
    detectColumnAlignments,
    getSensitiveColumnPatterns,
    type ColumnRange,
    type ColumnAlignment
} from './csvHelpers';

// UI functions
export {
    updateMaskingStatusBar,
    showMaskingNotification
} from './ui';

// Presets
export {
    PresetDefinition,
    MASKING_PRESETS,
    applyPreset
} from './presets';

// CDATA utilities
export {
    maskCdataContent
} from './cdata';

// CSV masking
export {
    maskCsvText
} from './csv';

// Masking functions (registry)
export {
    MASKING_FUNCTIONS
} from './maskingFunctions';

