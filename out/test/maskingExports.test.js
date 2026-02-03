"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
// Ensure re-exports from maskingEngine are available at runtime
(0, node_test_1.test)('maskingEngine exports UI helpers', () => {
    // require compiled output like extension activation does
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maskingEngine = require('../out/utils/maskingEngine');
    node_assert_1.strict.equal(typeof maskingEngine.updateMaskingStatusBar, 'function', 'updateMaskingStatusBar should be a function');
    node_assert_1.strict.equal(typeof maskingEngine.showMaskingNotification, 'function', 'showMaskingNotification should be a function');
});
//# sourceMappingURL=maskingExports.test.js.map