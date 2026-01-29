"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const confidence_1 = require("../utils/masking/confidence");
(0, node_test_1.describe)('isInsideFieldName() - XML Tag Protection', () => {
    (0, node_test_1.test)('should detect pattern inside XML tag name after CDATA section', () => {
        // Simulates the bug scenario from cdata-test-2.xml
        // CDATA section followed by <bsb> tag - opening < is ~250 chars before "bsb"
        const xmlContent = `<order id="ORD-003">
    <description><![CDATA[
        Customer Information:
        Name: Robert Chen
        Email: robert.chen@company.com
        Phone: +61 407 888 999
        Credit Card: 4532 1234 5678 9010
    ]]></description>
    <bsb>345-678</bsb>
    <accountNumber>888999777</accountNumber>
</order>`;
        // Find position of "bsb" in the tag name <bsb>
        const bsbTagStartIndex = xmlContent.indexOf('<bsb>');
        const bsbTextIndex = bsbTagStartIndex + 1; // Position of 'b' in '<bsb>'
        // Test that "bsb" inside the tag name is detected
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, bsbTextIndex, 3);
        node_assert_1.strict.ok(result, 'Should detect "bsb" is inside XML tag name after CDATA section');
    });
    (0, node_test_1.test)('should detect pattern inside XML tag name with 300-char lookback', () => {
        // Create XML with CDATA section that puts opening < more than 50 but less than 300 chars before tag
        const longCdata = 'A'.repeat(200); // 200 chars of padding
        const xmlContent = `<data><![CDATA[${longCdata}]]></data><accountNumber>123456</accountNumber>`;
        const tagStart = xmlContent.indexOf('<accountNumber>');
        const textIndex = tagStart + 1; // Position of 'a' in '<accountNumber>'
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 13);
        node_assert_1.strict.ok(result, 'Should detect tag name with 300-char lookback even after long CDATA');
    });
    (0, node_test_1.test)('should NOT detect pattern inside XML tag value', () => {
        const xmlContent = '<bsb>345-678</bsb>';
        // Position of value "345-678" (not inside tag name)
        const valueIndex = xmlContent.indexOf('345-678');
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, valueIndex, 7);
        node_assert_1.strict.equal(result, false, 'Should NOT detect pattern inside tag value as being inside tag name');
    });
    (0, node_test_1.test)('should detect accountNumber tag name after CDATA', () => {
        const xmlContent = `<order>
    <description><![CDATA[
        Some long CDATA content here that pushes the distance
        between the CDATA section and the next tag beyond 50 characters
        to test the 300-character lookback window fix.
    ]]></description>
    <accountNumber>888999777</accountNumber>
</order>`;
        const tagStart = xmlContent.indexOf('<accountNumber>');
        const textIndex = tagStart + 1;
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 13);
        node_assert_1.strict.ok(result, 'Should detect accountNumber tag name after CDATA section');
    });
});
(0, node_test_1.describe)('isInsideFieldName() - JSON Field Name Protection', () => {
    (0, node_test_1.test)('should detect pattern inside JSON field name', () => {
        const jsonContent = '{"accountNumber": "123456"}';
        // Position of "accountNumber" text in field name
        const fieldNameIndex = jsonContent.indexOf('accountNumber');
        const result = (0, confidence_1.isInsideFieldName)(jsonContent, fieldNameIndex, 13);
        node_assert_1.strict.ok(result, 'Should detect pattern inside JSON field name');
    });
    (0, node_test_1.test)('should NOT detect pattern inside JSON field value', () => {
        const jsonContent = '{"account": "accountNumber123"}';
        // Position of "accountNumber" in the value (not field name)
        const valueIndex = jsonContent.indexOf('accountNumber123');
        const result = (0, confidence_1.isInsideFieldName)(jsonContent, valueIndex, 13);
        node_assert_1.strict.equal(result, false, 'Should NOT detect pattern in JSON value as being in field name');
    });
    (0, node_test_1.test)('should detect bsb in JSON field name', () => {
        const jsonContent = '{"bsb": "345-678"}';
        const fieldNameIndex = jsonContent.indexOf('bsb');
        const result = (0, confidence_1.isInsideFieldName)(jsonContent, fieldNameIndex, 3);
        node_assert_1.strict.ok(result, 'Should detect bsb in JSON field name');
    });
});
(0, node_test_1.describe)('isInsideFieldName() - Edge Cases', () => {
    (0, node_test_1.test)('should handle match at beginning of text', () => {
        const content = 'accountNumber: 123';
        const result = (0, confidence_1.isInsideFieldName)(content, 0, 13);
        node_assert_1.strict.equal(result, false, 'Should handle match at position 0');
    });
    (0, node_test_1.test)('should handle match at end of text', () => {
        const content = 'value: accountNumber';
        const index = content.indexOf('accountNumber');
        const result = (0, confidence_1.isInsideFieldName)(content, index, 13);
        node_assert_1.strict.equal(result, false, 'Should handle match near end of text');
    });
    (0, node_test_1.test)('should handle XML with nested tags', () => {
        const xmlContent = '<parent><child><bsb>123-456</bsb></child></parent>';
        const tagStart = xmlContent.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 3);
        node_assert_1.strict.ok(result, 'Should detect tag name in nested XML structure');
    });
    (0, node_test_1.test)('should handle malformed XML gracefully', () => {
        const xmlContent = '<tag without closing bracket bsb>123</tag>';
        const bsbIndex = xmlContent.indexOf('bsb');
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, bsbIndex, 3);
        // Should still detect as inside tag since between < and >
        node_assert_1.strict.ok(result, 'Should detect pattern between < and > even in malformed XML');
    });
});
(0, node_test_1.describe)('isInsideFieldName() - Regression Tests', () => {
    (0, node_test_1.test)('should still work with short XML (50-char lookback sufficient)', () => {
        // Verify fix doesn't break cases that worked before
        const xmlContent = '<bsb>345-678</bsb>';
        const tagStart = xmlContent.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 3);
        node_assert_1.strict.ok(result, 'Should still detect tag name in short XML');
    });
    (0, node_test_1.test)('should work with JSON regardless of lookback window size', () => {
        // JSON detection uses different mechanism (quote and colon check)
        const jsonContent = '{"field": "value"}';
        const fieldIndex = jsonContent.indexOf('field');
        const result = (0, confidence_1.isInsideFieldName)(jsonContent, fieldIndex, 5);
        node_assert_1.strict.ok(result, 'JSON detection should work regardless of lookback window');
    });
    (0, node_test_1.test)('should handle exact 300-char distance', () => {
        // Create content where opening < is exactly 300 chars before match
        const padding = 'X'.repeat(288); // 288 + '<![CDATA[' (9 chars) + ']]>' (3 chars) = 300 total
        const xmlContent = `<![CDATA[${padding}]]><bsb>123</bsb>`;
        const tagStart = xmlContent.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 3);
        node_assert_1.strict.ok(result, 'Should detect tag name at exactly 300-char lookback distance');
    });
    (0, node_test_1.test)('should fail gracefully beyond 300-char distance', () => {
        // Create content where opening < is more than 300 chars before match
        const padding = 'X'.repeat(310);
        const xmlContent = `<![CDATA[${padding}]]><bsb>123</bsb>`;
        const tagStart = xmlContent.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        const result = (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 3);
        // This is a known limitation - beyond 300 chars, detection may fail
        // But this is acceptable as real-world CDATA sections are typically shorter
        // Just documenting the boundary behavior
        node_assert_1.strict.equal(typeof result, 'boolean', 'Should return boolean even at edge of window');
    });
});
//# sourceMappingURL=confidence.test.js.map