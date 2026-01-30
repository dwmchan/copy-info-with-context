"use strict";
// index.ts - Central export point for masking utilities
// Phase 1 (v1.6.0): Modular architecture
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAsciiTable = exports.getColumnRangeFromSelection = exports.detectHeaders = exports.detectColumnType = exports.shouldMaskColumn = exports.parseCsvLine = exports.detectDelimiter = exports.maskSWIFT = exports.maskIBAN = exports.maskIPAddress = exports.maskAustralianMedicare = exports.maskAustralianABN = exports.maskAustralianTFN = exports.maskAccountNumber = exports.maskAustralianBSB = exports.maskNationalID = exports.maskDriversLicense = exports.maskPassport = exports.maskDateOfBirth = exports.maskAddress = exports.maskCreditCard = exports.maskSSN = exports.maskPhone = exports.maskEmail = exports.maskGeneric = exports.isValidIPv6 = exports.isValidIPv4 = exports.isValidIBANFormat = exports.isValidBSBFormat = exports.validateAustralianABN = exports.validateAustralianTFN = exports.luhnCheck = exports.isValidPhoneFormat = exports.isValidEmailFormat = exports.shouldMaskAsDateOfBirth = exports.isPlausibleBirthDate = exports.isBirthDateField = exports.isInsideFieldName = exports.isNonBirthDateField = exports.calculateMaskingConfidence = exports.getAdaptiveThreshold = exports.detectStructureType = exports.checkStatisticalAnomalies = exports.DETECTION_PATTERNS = exports.patternFactory = exports.configProcessor = exports.getEnabledTypes = exports.getMaskingConfig = exports.MaskingStrategy = exports.PiiType = void 0;
exports.MASKING_FUNCTIONS = exports.maskCsvText = exports.maskCdataContent = exports.applyPreset = exports.MASKING_PRESETS = exports.showMaskingNotification = exports.updateMaskingStatusBar = exports.getSensitiveColumnPatterns = exports.detectColumnAlignments = void 0;
// Configuration and types
var config_1 = require("./config");
Object.defineProperty(exports, "PiiType", { enumerable: true, get: function () { return config_1.PiiType; } });
Object.defineProperty(exports, "MaskingStrategy", { enumerable: true, get: function () { return config_1.MaskingStrategy; } });
Object.defineProperty(exports, "getMaskingConfig", { enumerable: true, get: function () { return config_1.getMaskingConfig; } });
Object.defineProperty(exports, "getEnabledTypes", { enumerable: true, get: function () { return config_1.getEnabledTypes; } });
Object.defineProperty(exports, "configProcessor", { enumerable: true, get: function () { return config_1.configProcessor; } });
// Pattern detection
var patterns_1 = require("./patterns");
Object.defineProperty(exports, "patternFactory", { enumerable: true, get: function () { return patterns_1.patternFactory; } });
Object.defineProperty(exports, "DETECTION_PATTERNS", { enumerable: true, get: function () { return patterns_1.DETECTION_PATTERNS; } });
// Confidence scoring and validation
var confidence_1 = require("./confidence");
Object.defineProperty(exports, "checkStatisticalAnomalies", { enumerable: true, get: function () { return confidence_1.checkStatisticalAnomalies; } });
Object.defineProperty(exports, "detectStructureType", { enumerable: true, get: function () { return confidence_1.detectStructureType; } });
Object.defineProperty(exports, "getAdaptiveThreshold", { enumerable: true, get: function () { return confidence_1.getAdaptiveThreshold; } });
Object.defineProperty(exports, "calculateMaskingConfidence", { enumerable: true, get: function () { return confidence_1.calculateMaskingConfidence; } });
Object.defineProperty(exports, "isNonBirthDateField", { enumerable: true, get: function () { return confidence_1.isNonBirthDateField; } });
Object.defineProperty(exports, "isInsideFieldName", { enumerable: true, get: function () { return confidence_1.isInsideFieldName; } });
// Format validators
var validators_1 = require("./validators");
Object.defineProperty(exports, "isBirthDateField", { enumerable: true, get: function () { return validators_1.isBirthDateField; } });
Object.defineProperty(exports, "isPlausibleBirthDate", { enumerable: true, get: function () { return validators_1.isPlausibleBirthDate; } });
Object.defineProperty(exports, "shouldMaskAsDateOfBirth", { enumerable: true, get: function () { return validators_1.shouldMaskAsDateOfBirth; } });
Object.defineProperty(exports, "isValidEmailFormat", { enumerable: true, get: function () { return validators_1.isValidEmailFormat; } });
Object.defineProperty(exports, "isValidPhoneFormat", { enumerable: true, get: function () { return validators_1.isValidPhoneFormat; } });
Object.defineProperty(exports, "luhnCheck", { enumerable: true, get: function () { return validators_1.luhnCheck; } });
Object.defineProperty(exports, "validateAustralianTFN", { enumerable: true, get: function () { return validators_1.validateAustralianTFN; } });
Object.defineProperty(exports, "validateAustralianABN", { enumerable: true, get: function () { return validators_1.validateAustralianABN; } });
Object.defineProperty(exports, "isValidBSBFormat", { enumerable: true, get: function () { return validators_1.isValidBSBFormat; } });
Object.defineProperty(exports, "isValidIBANFormat", { enumerable: true, get: function () { return validators_1.isValidIBANFormat; } });
Object.defineProperty(exports, "isValidIPv4", { enumerable: true, get: function () { return validators_1.isValidIPv4; } });
Object.defineProperty(exports, "isValidIPv6", { enumerable: true, get: function () { return validators_1.isValidIPv6; } });
// Masking functions
var maskingFunctions_1 = require("./maskingFunctions");
Object.defineProperty(exports, "maskGeneric", { enumerable: true, get: function () { return maskingFunctions_1.maskGeneric; } });
Object.defineProperty(exports, "maskEmail", { enumerable: true, get: function () { return maskingFunctions_1.maskEmail; } });
Object.defineProperty(exports, "maskPhone", { enumerable: true, get: function () { return maskingFunctions_1.maskPhone; } });
Object.defineProperty(exports, "maskSSN", { enumerable: true, get: function () { return maskingFunctions_1.maskSSN; } });
Object.defineProperty(exports, "maskCreditCard", { enumerable: true, get: function () { return maskingFunctions_1.maskCreditCard; } });
Object.defineProperty(exports, "maskAddress", { enumerable: true, get: function () { return maskingFunctions_1.maskAddress; } });
Object.defineProperty(exports, "maskDateOfBirth", { enumerable: true, get: function () { return maskingFunctions_1.maskDateOfBirth; } });
Object.defineProperty(exports, "maskPassport", { enumerable: true, get: function () { return maskingFunctions_1.maskPassport; } });
Object.defineProperty(exports, "maskDriversLicense", { enumerable: true, get: function () { return maskingFunctions_1.maskDriversLicense; } });
Object.defineProperty(exports, "maskNationalID", { enumerable: true, get: function () { return maskingFunctions_1.maskNationalID; } });
Object.defineProperty(exports, "maskAustralianBSB", { enumerable: true, get: function () { return maskingFunctions_1.maskAustralianBSB; } });
Object.defineProperty(exports, "maskAccountNumber", { enumerable: true, get: function () { return maskingFunctions_1.maskAccountNumber; } });
Object.defineProperty(exports, "maskAustralianTFN", { enumerable: true, get: function () { return maskingFunctions_1.maskAustralianTFN; } });
Object.defineProperty(exports, "maskAustralianABN", { enumerable: true, get: function () { return maskingFunctions_1.maskAustralianABN; } });
Object.defineProperty(exports, "maskAustralianMedicare", { enumerable: true, get: function () { return maskingFunctions_1.maskAustralianMedicare; } });
Object.defineProperty(exports, "maskIPAddress", { enumerable: true, get: function () { return maskingFunctions_1.maskIPAddress; } });
Object.defineProperty(exports, "maskIBAN", { enumerable: true, get: function () { return maskingFunctions_1.maskIBAN; } });
Object.defineProperty(exports, "maskSWIFT", { enumerable: true, get: function () { return maskingFunctions_1.maskSWIFT; } });
// CSV utilities
var csvHelpers_1 = require("./csvHelpers");
Object.defineProperty(exports, "detectDelimiter", { enumerable: true, get: function () { return csvHelpers_1.detectDelimiter; } });
Object.defineProperty(exports, "parseCsvLine", { enumerable: true, get: function () { return csvHelpers_1.parseCsvLine; } });
Object.defineProperty(exports, "shouldMaskColumn", { enumerable: true, get: function () { return csvHelpers_1.shouldMaskColumn; } });
Object.defineProperty(exports, "detectColumnType", { enumerable: true, get: function () { return csvHelpers_1.detectColumnType; } });
Object.defineProperty(exports, "detectHeaders", { enumerable: true, get: function () { return csvHelpers_1.detectHeaders; } });
Object.defineProperty(exports, "getColumnRangeFromSelection", { enumerable: true, get: function () { return csvHelpers_1.getColumnRangeFromSelection; } });
Object.defineProperty(exports, "buildAsciiTable", { enumerable: true, get: function () { return csvHelpers_1.buildAsciiTable; } });
Object.defineProperty(exports, "detectColumnAlignments", { enumerable: true, get: function () { return csvHelpers_1.detectColumnAlignments; } });
Object.defineProperty(exports, "getSensitiveColumnPatterns", { enumerable: true, get: function () { return csvHelpers_1.getSensitiveColumnPatterns; } });
// UI functions
var ui_1 = require("./ui");
Object.defineProperty(exports, "updateMaskingStatusBar", { enumerable: true, get: function () { return ui_1.updateMaskingStatusBar; } });
Object.defineProperty(exports, "showMaskingNotification", { enumerable: true, get: function () { return ui_1.showMaskingNotification; } });
// Presets
var presets_1 = require("./presets");
Object.defineProperty(exports, "MASKING_PRESETS", { enumerable: true, get: function () { return presets_1.MASKING_PRESETS; } });
Object.defineProperty(exports, "applyPreset", { enumerable: true, get: function () { return presets_1.applyPreset; } });
// CDATA utilities
var cdata_1 = require("./cdata");
Object.defineProperty(exports, "maskCdataContent", { enumerable: true, get: function () { return cdata_1.maskCdataContent; } });
// CSV masking
var csv_1 = require("./csv");
Object.defineProperty(exports, "maskCsvText", { enumerable: true, get: function () { return csv_1.maskCsvText; } });
// Masking functions (registry)
var maskingFunctions_2 = require("./maskingFunctions");
Object.defineProperty(exports, "MASKING_FUNCTIONS", { enumerable: true, get: function () { return maskingFunctions_2.MASKING_FUNCTIONS; } });
//# sourceMappingURL=index.js.map