"use strict";
// config.ts - Configuration management with memoization
// Phase 1 (v1.6.0): WeakMap-based caching for processed configurations
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnabledTypes = exports.getMaskingConfig = exports.configProcessor = exports.MaskingStrategy = exports.PiiType = void 0;
const vscode = __importStar(require("vscode"));
/**
 * PII types supported by the masking engine
 */
var PiiType;
(function (PiiType) {
    PiiType["Email"] = "email";
    PiiType["Phone"] = "phone";
    PiiType["SSN"] = "ssn";
    PiiType["CreditCard"] = "creditCard";
    PiiType["CreditCardVisa"] = "creditCardVisa";
    PiiType["CreditCardMastercard"] = "creditCardMastercard";
    PiiType["CreditCardAmex"] = "creditCardAmex";
    PiiType["CreditCardGeneric"] = "creditCardGeneric";
    PiiType["Address"] = "address";
    PiiType["AccountNumber"] = "accountNumber";
    PiiType["AustralianAccountNumber"] = "australianAccountNumber";
    PiiType["IPAddress"] = "ipAddress";
    PiiType["IPv4"] = "ipv4";
    PiiType["IPv6"] = "ipv6";
    PiiType["NMI"] = "nmi";
    PiiType["DateOfBirth"] = "dateOfBirth";
    PiiType["PassportNumber"] = "passportNumber";
    PiiType["AustralianPassport"] = "australianPassport";
    PiiType["USPassport"] = "usPassport";
    PiiType["UKPassport"] = "ukPassport";
    PiiType["EUPassport"] = "euPassport";
    PiiType["DriversLicense"] = "driversLicense";
    PiiType["AustralianDriversLicense"] = "australianDriversLicense";
    PiiType["USDriversLicense"] = "usDriversLicense";
    PiiType["UKDriversLicense"] = "ukDriversLicense";
    PiiType["NationalID"] = "nationalID";
    PiiType["UKNationalInsurance"] = "ukNationalInsurance";
    PiiType["AustralianBSB"] = "australianBSB";
    PiiType["AustralianTFN"] = "australianTFN";
    PiiType["AustralianABN"] = "australianABN";
    PiiType["AustralianMedicare"] = "australianMedicare";
    PiiType["AustralianPhone"] = "australianPhone";
    PiiType["ClientNumber"] = "clientNumber";
    PiiType["ReferenceNumber"] = "referenceNumber";
    PiiType["PolicyNumber"] = "policyNumber";
    PiiType["TransactionID"] = "transactionID";
    PiiType["IBAN"] = "iban";
    PiiType["SWIFT"] = "swift";
    PiiType["RoutingNumber"] = "routingNumber";
    PiiType["Custom"] = "custom";
})(PiiType = exports.PiiType || (exports.PiiType = {}));
/**
 * Masking strategies
 */
var MaskingStrategy;
(function (MaskingStrategy) {
    MaskingStrategy["FULL"] = "full";
    MaskingStrategy["PARTIAL"] = "partial";
    MaskingStrategy["STRUCTURAL"] = "structural";
    MaskingStrategy["HASH"] = "hash";
    MaskingStrategy["REDACT"] = "redact"; // [REDACTED]
})(MaskingStrategy = exports.MaskingStrategy || (exports.MaskingStrategy = {}));
/**
 * Configuration Processor with memoization
 *
 * OPTIMIZATION: Uses WeakMap to cache processed configurations
 * Avoids repeated validation and processing overhead
 *
 * Performance Impact:
 * - Eliminates redundant config processing (common when masking multiple files)
 * - O(1) cache lookup vs. O(n) config validation
 * - Memory-efficient: WeakMap auto-cleans when config object is garbage collected
 */
class ConfigProcessor {
    /**
     * Cache for processed configurations
     * WeakMap allows garbage collection when config object is no longer referenced
     */
    configCache = new WeakMap();
    /**
     * Cache for enabled types Set
     * Avoids recreating Set for same configuration
     */
    enabledTypesCache = new WeakMap();
    /**
     * Get masking configuration with memoization
     *
     * @returns Processed masking configuration
     */
    getMaskingConfig() {
        const rawConfig = vscode.workspace.getConfiguration('copyInfoWithContext');
        // Check cache first
        const cached = this.configCache.get(rawConfig);
        if (cached) {
            return cached;
        }
        // Process configuration
        const processed = this.processConfig(rawConfig);
        // Cache and return
        this.configCache.set(rawConfig, processed);
        return processed;
    }
    /**
     * Process raw VS Code configuration into MaskingConfig
     *
     * @param config - Raw workspace configuration
     * @returns Processed configuration
     */
    processConfig(config) {
        // Default types configuration
        const defaultTypes = {
            email: true,
            phone: true,
            ssn: true,
            dateOfBirth: true,
            passportNumber: true,
            driversLicense: true,
            nationalID: true,
            creditCard: true,
            creditCardVisa: true,
            creditCardMastercard: true,
            creditCardAmex: true,
            creditCardGeneric: true,
            address: true,
            accountNumber: true,
            ipAddress: false,
            ipv4: false,
            ipv6: false,
            nmi: true,
            australianBSB: true,
            australianTFN: true,
            australianABN: true,
            australianMedicare: true,
            australianPhone: true,
            australianAccountNumber: true,
            australianPassport: true,
            australianDriversLicense: true,
            usPassport: true,
            usDriversLicense: true,
            ukPassport: true,
            ukDriversLicense: true,
            ukNationalInsurance: true,
            euPassport: true,
            clientNumber: true,
            referenceNumber: false,
            policyNumber: false,
            transactionID: false,
            iban: true,
            swift: true,
            routingNumber: false,
            custom: false
        };
        // Get user's maskingTypes and merge with defaults
        const userTypes = config.get('maskingTypes', {});
        const mergedTypes = { ...defaultTypes, ...userTypes };
        return {
            enabled: config.get('enableDataMasking', false),
            mode: config.get('maskingMode', 'auto'),
            strategy: config.get('maskingStrategy', 'partial'),
            preset: config.get('maskingPreset', 'none'),
            denyList: config.get('maskingDenyList', []).map(s => s.toLowerCase()),
            allowList: config.get('maskingAllowList', []).map(s => s.toLowerCase()),
            types: mergedTypes,
            showIndicator: config.get('showMaskingIndicator', true),
            includeStats: config.get('includeMaskingStats', false),
            customPatterns: this.processCustomPatterns(config.get('maskingCustomPatterns', [])),
            confidenceThreshold: config.get('maskingConfidenceThreshold', 0.7)
        };
    }
    /**
     * Process custom patterns from configuration
     *
     * @param patterns - Raw custom pattern configuration
     * @returns Processed custom patterns
     */
    processCustomPatterns(patterns) {
        return patterns.map(p => ({
            name: String(p.name ?? ''),
            pattern: typeof p.pattern === 'string' ? new RegExp(p.pattern, 'g') : (p.pattern instanceof RegExp ? p.pattern : /.*/),
            replacement: String(p.replacement ?? ''),
            enabled: p.enabled !== false
        }));
    }
    /**
     * Get enabled PII types as a Set for efficient lookup
     *
     * OPTIMIZATION: Converts Record<string, boolean> to Set<string> once
     * Set.has() is faster than checking object properties in loops
     *
     * @param config - Masking configuration
     * @returns Set of enabled PII type names
     */
    getEnabledTypes(config) {
        // Check cache first
        const cached = this.enabledTypesCache.get(config);
        if (cached) {
            return cached;
        }
        // Build Set of enabled types
        const enabled = new Set();
        for (const [type, isEnabled] of Object.entries(config.types)) {
            if (isEnabled) {
                enabled.add(type);
            }
        }
        // Cache and return
        this.enabledTypesCache.set(config, enabled);
        return enabled;
    }
    /**
     * Clear all caches
     * Useful for testing or when configuration changes
     */
    clearCache() {
        // Note: WeakMaps don't have a clear() method
        // Create new instances to effectively clear
        this.configCache = new WeakMap();
        this.enabledTypesCache = new WeakMap();
    }
    /**
     * Get cache statistics
     * Note: WeakMaps don't expose size, so this returns placeholder values
     *
     * @returns Cache statistics
     */
    getCacheStats() {
        return {
            configCacheSize: 'WeakMap (size not exposed)',
            typesCacheSize: 'WeakMap (size not exposed)'
        };
    }
}
/**
 * Singleton instance of ConfigProcessor
 * Export this for consistent configuration access
 */
exports.configProcessor = new ConfigProcessor();
/**
 * Convenience function to get current masking configuration
 * Uses memoization for performance
 *
 * @returns Current masking configuration
 */
function getMaskingConfig() {
    return exports.configProcessor.getMaskingConfig();
}
exports.getMaskingConfig = getMaskingConfig;
/**
 * Get enabled PII types as Set
 *
 * @param config - Optional configuration (uses current if not provided)
 * @returns Set of enabled PII type names
 */
function getEnabledTypes(config) {
    const effectiveConfig = config ?? getMaskingConfig();
    return exports.configProcessor.getEnabledTypes(effectiveConfig);
}
exports.getEnabledTypes = getEnabledTypes;
//# sourceMappingURL=config.js.map