// Quick script to inspect compiled module exports
const maskingEngine = require('../out/utils/maskingEngine');
const maskingIndex = require('../out/utils/masking/index');
const maskingUi = require('../out/utils/masking/ui');

console.log('out masking/ui: updateMaskingStatusBar typeof:', typeof maskingUi.updateMaskingStatusBar);
console.log('out masking/index: updateMaskingStatusBar typeof:', typeof maskingIndex.updateMaskingStatusBar);
console.log('out maskingEngine: updateMaskingStatusBar typeof:', typeof maskingEngine.updateMaskingStatusBar);
console.log('out maskingEngine exports:', Object.keys(maskingEngine));
console.log('maskingEngine descriptor:', Object.getOwnPropertyDescriptor(maskingEngine, 'updateMaskingStatusBar'));
// inspect value of masking._get internal
const maskingModule = require('../out/utils/masking');
console.log('masking._ui prop:', typeof maskingModule.updateMaskingStatusBar, maskingModule.updateMaskingStatusBar ? maskingModule.updateMaskingStatusBar.toString().slice(0,80) : maskingModule.updateMaskingStatusBar);
console.log('maskingEngine getter source?');
const meModule = require('../out/utils/maskingEngine');
const desc = Object.getOwnPropertyDescriptor(meModule, 'updateMaskingStatusBar');
console.log('getter is function?:', typeof (desc && desc.get) === 'function');

console.log('calling descriptor.get():', desc && desc.get ? desc.get.call(meModule) : undefined);
console.log('direct maskingModule.updateMaskingStatusBar:', maskingModule.updateMaskingStatusBar);

// dump module cache exports objects
const mePath = require.resolve('../out/utils/maskingEngine');
const mPath = require.resolve('../out/utils/masking');
const uPath = require.resolve('../out/utils/masking/ui');
console.log('module cache entries:');
console.log('maskingEngine.exports keys:', Object.keys(require.cache[mePath].exports));
console.log('masking.exports keys:', Object.keys(require.cache[mPath].exports));
console.log('ui.exports keys:', Object.keys(require.cache[uPath].exports));
console.log('maskingEngine.exports.updateMaskingStatusBar (descriptor):', Object.getOwnPropertyDescriptor(require.cache[mePath].exports, 'updateMaskingStatusBar'));
console.log('masking.exports.updateMaskingStatusBar (descriptor):', Object.getOwnPropertyDescriptor(require.cache[mPath].exports, 'updateMaskingStatusBar'));
console.log('ui.exports.updateMaskingStatusBar (descriptor):', Object.getOwnPropertyDescriptor(require.cache[uPath].exports, 'updateMaskingStatusBar'));



// Also check showMaskingNotification
console.log('out masking/ui: showMaskingNotification typeof:', typeof maskingUi.showMaskingNotification);
console.log('out masking/index: showMaskingNotification typeof:', typeof maskingIndex.showMaskingNotification);
console.log('out maskingEngine: showMaskingNotification typeof:', typeof maskingEngine.showMaskingNotification);

// Try invoking updateMaskingStatusBar to ensure it runs without error
try {
    maskingEngine.updateMaskingStatusBar({ maskedText: 'x', detections: [{ type: 'email', originalValue: 'a', maskedValue: '***', line: 1, column: 1, confidence: 1 }], maskingApplied: true }, { showIndicator: true, enabled: true, includeStats: false, mode: 'auto', strategy: 'partial', preset: 'none', denyList: [], allowList: [], types: {}, customPatterns: [], confidenceThreshold: 0.7 });
    console.log('updateMaskingStatusBar invoked successfully');
} catch (err) {
    console.error('updateMaskingStatusBar invocation failed:', err);
}

