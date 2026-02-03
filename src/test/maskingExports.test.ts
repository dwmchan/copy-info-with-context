/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// Ensure re-exports from maskingEngine are available at runtime
test('maskingEngine exports UI helpers', () => {
    // require compiled output like extension activation does
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maskingEngine = require('../out/utils/maskingEngine');

    assert.equal(typeof maskingEngine.updateMaskingStatusBar, 'function', 'updateMaskingStatusBar should be a function');
    assert.equal(typeof maskingEngine.showMaskingNotification, 'function', 'showMaskingNotification should be a function');
});