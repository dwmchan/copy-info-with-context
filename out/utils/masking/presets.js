"use strict";
// presets.ts - Masking preset configurations for different industries
// Phase 1 (v1.6.0): Extracted from maskingEngine.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPreset = exports.MASKING_PRESETS = void 0;
/**
 * Predefined masking presets for different industries
 */
exports.MASKING_PRESETS = {
    default: {
        name: 'default',
        description: 'Default masking: common sensitive types enabled',
        enabledTypes: [
            'email',
            'phone',
            'creditCard',
            'ssn',
            'dateOfBirth',
            'passportNumber',
            'driversLicense',
            'nationalID',
            'address'
        ]
    },
    privacy: {
        name: 'privacy',
        description: 'Privacy-first preset: mask almost everything',
        enabledTypes: Object.keys((() => {
            return {
                email: true, phone: true, creditCard: true, ssn: true, dateOfBirth: true,
                passportNumber: true, driversLicense: true, nationalID: true, address: true,
                ipAddress: true, iban: true, swift: true, accountNumber: true
            };
        })())
    },
    strict: {
        name: 'strict',
        description: 'Strict: mask all configured types except custom',
        enabledTypes: [
            'email', 'phone', 'creditCard', 'ssn', 'dateOfBirth', 'passportNumber', 'driversLicense', 'nationalID',
            'address', 'ipAddress', 'iban', 'swift', 'accountNumber', 'custom'
        ]
    }
};
/**
 * Apply a preset configuration to the masking config
 * Enables only the types specified in the preset
 */
function applyPreset(config) {
    if (config.preset === 'none' || config.preset === 'custom') {
        return config;
    }
    const preset = exports.MASKING_PRESETS[config.preset];
    if (!preset) {
        return config;
    }
    const types = { ...config.types };
    for (const key of Object.keys(types)) {
        types[key] = preset.enabledTypes.includes(key);
    }
    return { ...config, types };
}
exports.applyPreset = applyPreset;
//# sourceMappingURL=presets.js.map