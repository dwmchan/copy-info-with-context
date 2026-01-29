// config.ts - Configuration management with memoization
// Phase 1 (v1.6.0): WeakMap-based caching for processed configurations

import * as vscode from 'vscode';

/**
 * PII types supported by the masking engine
 */
export enum PiiType {
    Email = 'email',
    Phone = 'phone',
    SSN = 'ssn',
    CreditCard = 'creditCard',
    CreditCardVisa = 'creditCardVisa',
    CreditCardMastercard = 'creditCardMastercard',
    CreditCardAmex = 'creditCardAmex',
    CreditCardGeneric = 'creditCardGeneric',
    Address = 'address',
    AccountNumber = 'accountNumber',
    AustralianAccountNumber = 'australianAccountNumber',
    IPAddress = 'ipAddress',
    IPv4 = 'ipv4',
    IPv6 = 'ipv6',
    NMI = 'nmi',
    DateOfBirth = 'dateOfBirth',
    PassportNumber = 'passportNumber',
    AustralianPassport = 'australianPassport',
    USPassport = 'usPassport',
    UKPassport = 'ukPassport',
    EUPassport = 'euPassport',
    DriversLicense = 'driversLicense',
    AustralianDriversLicense = 'australianDriversLicense',
    USDriversLicense = 'usDriversLicense',
    UKDriversLicense = 'ukDriversLicense',
    NationalID = 'nationalID',
    UKNationalInsurance = 'ukNationalInsurance',
    AustralianBSB = 'australianBSB',
    AustralianTFN = 'australianTFN',
    AustralianABN = 'australianABN',
    AustralianMedicare = 'australianMedicare',
    AustralianPhone = 'australianPhone',
    ClientNumber = 'clientNumber',
    ReferenceNumber = 'referenceNumber',
    PolicyNumber = 'policyNumber',
    TransactionID = 'transactionID',
    IBAN = 'iban',
    SWIFT = 'swift',
    RoutingNumber = 'routingNumber',
    Custom = 'custom'
}

/**
 * Masking strategies
 */
export enum MaskingStrategy {
    FULL = 'full',        // Complete replacement: ***
    PARTIAL = 'partial',  // Show first/last chars: j***@e***.com
    STRUCTURAL = 'structural', // Preserve format: ***-**-1234
    HASH = 'hash',        // Deterministic hash
    REDACT = 'redact'     // [REDACTED]
}

/**
 * Detection result with metadata
 */
export interface Detection {
    type: PiiType;
    originalValue: string;
    maskedValue: string;
    line: number;
    column: number;
    confidence: number;
    columnContext?: {
        name: string;
        index: number;
    };
}

/**
 * Result of masking operation
 */
export interface MaskedResult {
    maskedText: string;
    detections: Detection[];
    maskingApplied: boolean;
}

/**
 * Custom user-defined pattern
 */
export interface CustomPattern {
    name: string;
    pattern: string | RegExp;
    replacement: string;
    enabled: boolean;
}

/**
 * Complete masking configuration
 */
export interface MaskingConfig {
    enabled: boolean;
    mode: 'auto' | 'manual' | 'strict';
    strategy: 'partial' | 'full' | 'structural' | 'hash';
    preset: 'none' | 'basic' | 'financial' | 'healthcare' | 'enterprise' | 'custom';
    denyList: string[];
    allowList: string[];
    types: Record<string, boolean>;
    showIndicator: boolean;
    includeStats: boolean;
    customPatterns: CustomPattern[];
    confidenceThreshold: number; // 0.0 to 1.0
}

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
    private configCache = new WeakMap<vscode.WorkspaceConfiguration, MaskingConfig>();

    /**
     * Cache for enabled types Set
     * Avoids recreating Set for same configuration
     */
    private enabledTypesCache = new WeakMap<MaskingConfig, Set<string>>();

    /**
     * Get masking configuration with memoization
     *
     * @returns Processed masking configuration
     */
    getMaskingConfig(): MaskingConfig {
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
    private processConfig(config: vscode.WorkspaceConfiguration): MaskingConfig {
        // Default types configuration
        const defaultTypes: Record<string, boolean> = {
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
        const userTypes = config.get('maskingTypes', {}) as Record<string, boolean>;
        const mergedTypes = { ...defaultTypes, ...userTypes };

        return {
            enabled: config.get('enableDataMasking', false),
            mode: config.get('maskingMode', 'auto'),
            strategy: config.get('maskingStrategy', 'partial'),
            preset: config.get('maskingPreset', 'none'),
            denyList: (config.get('maskingDenyList', []) as string[]).map(s => s.toLowerCase()),
            allowList: (config.get('maskingAllowList', []) as string[]).map(s => s.toLowerCase()),
            types: mergedTypes,
            showIndicator: config.get('showMaskingIndicator', true),
            includeStats: config.get('includeMaskingStats', false),
            customPatterns: this.processCustomPatterns(
                (config.get('maskingCustomPatterns', []) as Array<{name?: unknown; pattern?: unknown; replacement?: unknown; enabled?: unknown}>)
            ),
            confidenceThreshold: config.get('maskingConfidenceThreshold', 0.7)
        };
    }

    /**
     * Process custom patterns from configuration
     *
     * @param patterns - Raw custom pattern configuration
     * @returns Processed custom patterns
     */
    private processCustomPatterns(patterns: Array<{name?: unknown; pattern?: unknown; replacement?: unknown; enabled?: unknown}>): CustomPattern[] {
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
    getEnabledTypes(config: MaskingConfig): Set<string> {
        // Check cache first
        const cached = this.enabledTypesCache.get(config);
        if (cached) {
            return cached;
        }

        // Build Set of enabled types
        const enabled = new Set<string>();
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
    clearCache(): void {
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
    getCacheStats(): { configCacheSize: string; typesCacheSize: string } {
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
export const configProcessor = new ConfigProcessor();

/**
 * Convenience function to get current masking configuration
 * Uses memoization for performance
 *
 * @returns Current masking configuration
 */
export function getMaskingConfig(): MaskingConfig {
    return configProcessor.getMaskingConfig();
}

/**
 * Get enabled PII types as Set
 *
 * @param config - Optional configuration (uses current if not provided)
 * @returns Set of enabled PII type names
 */
export function getEnabledTypes(config?: MaskingConfig): Set<string> {
    const effectiveConfig = config ?? getMaskingConfig();
    return configProcessor.getEnabledTypes(effectiveConfig);
}
