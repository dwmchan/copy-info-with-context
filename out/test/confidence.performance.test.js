"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const confidence_1 = require("../utils/masking/confidence");
(0, node_test_1.describe)('isInsideFieldName() - Performance Tests', () => {
    (0, node_test_1.test)('performance with 300-char lookback - typical XML scenario', () => {
        // Simulate realistic XML with CDATA section (200 chars of CDATA content)
        const cdataContent = 'Customer Information:\nName: Robert Chen\nEmail: robert.chen@company.com\nPhone: +61 407 888 999\nCredit Card: 4532 1234 5678 9010\nAddress: 123 Main Street, Sydney NSW 2000';
        const xmlContent = `<order id="ORD-003">
    <description><![CDATA[${cdataContent}]]></description>
    <bsb>345-678</bsb>
    <accountNumber>888999777</accountNumber>
</order>`;
        const iterations = 10000;
        const tagStart = xmlContent.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 3);
        }
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        console.log(`[Performance] 10,000 iterations with 300-char lookback:`);
        console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  Average per call: ${(avgTime * 1000).toFixed(2)}μs`);
        console.log(`  Calls per second: ${(1000 / avgTime).toFixed(0)}`);
        // Performance assertion: Should complete 10,000 iterations in under 100ms
        // This gives ~10μs per call average, which is acceptable for text processing
        node_assert_1.strict.ok(totalTime < 100, `Performance degradation: ${totalTime.toFixed(2)}ms for 10k iterations (expected <100ms)`);
    });
    (0, node_test_1.test)('performance comparison - short vs long context', () => {
        // Short context (tag near beginning, ~50 chars before)
        const shortXml = `<order><bsb>345-678</bsb></order>`;
        const shortTagStart = shortXml.indexOf('<bsb>');
        const shortTextIndex = shortTagStart + 1;
        // Long context (tag after 250 chars of CDATA)
        const longCdata = 'A'.repeat(250);
        const longXml = `<data><![CDATA[${longCdata}]]></data><bsb>345-678</bsb>`;
        const longTagStart = longXml.indexOf('<bsb>');
        const longTextIndex = longTagStart + 1;
        const iterations = 10000;
        // Benchmark short context
        const shortStartTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            (0, confidence_1.isInsideFieldName)(shortXml, shortTextIndex, 3);
        }
        const shortEndTime = performance.now();
        const shortTotalTime = shortEndTime - shortStartTime;
        // Benchmark long context
        const longStartTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            (0, confidence_1.isInsideFieldName)(longXml, longTextIndex, 3);
        }
        const longEndTime = performance.now();
        const longTotalTime = longEndTime - longStartTime;
        const shortAvgTime = shortTotalTime / iterations;
        const longAvgTime = longTotalTime / iterations;
        const performanceRatio = longAvgTime / shortAvgTime;
        console.log(`[Performance Comparison]`);
        console.log(`  Short context (50 chars): ${shortTotalTime.toFixed(2)}ms total, ${(shortAvgTime * 1000).toFixed(2)}μs avg`);
        console.log(`  Long context (250 chars): ${longTotalTime.toFixed(2)}ms total, ${(longAvgTime * 1000).toFixed(2)}μs avg`);
        console.log(`  Performance ratio: ${performanceRatio.toFixed(2)}x`);
        // Assertion: Long context should not be more than 3x slower than short context
        // 300-char lookback is 6x larger (50→300), but substring operations are fast
        // so we expect <3x degradation due to algorithmic efficiency
        node_assert_1.strict.ok(performanceRatio < 3, `Long context too slow: ${performanceRatio.toFixed(2)}x slower than short (expected <3x)`);
    });
    (0, node_test_1.test)('performance with nested CDATA - worst case scenario', () => {
        // Worst case: Multiple CDATA sections with maximum 300-char distance
        const cdata1 = 'X'.repeat(100);
        const cdata2 = 'Y'.repeat(100);
        const cdata3 = 'Z'.repeat(88); // 288 total + 12 for CDATA markers = 300
        const worstCaseXml = `<root>
    <section1><![CDATA[${cdata1}]]></section1>
    <section2><![CDATA[${cdata2}]]></section2>
    <section3><![CDATA[${cdata3}]]></section3>
    <bsb>345-678</bsb>
</root>`;
        const iterations = 10000;
        const tagStart = worstCaseXml.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            (0, confidence_1.isInsideFieldName)(worstCaseXml, textIndex, 3);
        }
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        console.log(`[Worst Case Performance] Multiple CDATA sections (300 chars):`);
        console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  Average per call: ${(avgTime * 1000).toFixed(2)}μs`);
        // Should still complete in under 150ms even in worst case
        node_assert_1.strict.ok(totalTime < 150, `Worst case performance issue: ${totalTime.toFixed(2)}ms (expected <150ms)`);
    });
    (0, node_test_1.test)('performance with large document - real-world stress test', () => {
        // Simulate a large XML document with multiple orders (realistic VS Code extension scenario)
        const singleOrder = `<order id="ORD-001">
    <description><![CDATA[
        Customer: Alice Johnson
        Email: alice.johnson@email.com
        Phone: +61 412 345 678
        BSB: 123-456
        Account: 987654321
    ]]></description>
    <bsb>345-678</bsb>
    <accountNumber>888999777</accountNumber>
</order>`;
        // Create document with 10 orders
        const orders = Array(10).fill(singleOrder).join('\n');
        const largeXml = `<orders>\n${orders}\n</orders>`;
        // Test each BSB tag in the document
        const bsbTags = [];
        let searchIndex = 0;
        let foundIndex;
        while ((foundIndex = largeXml.indexOf('<bsb>', searchIndex)) !== -1) {
            bsbTags.push(foundIndex + 1); // +1 to get position of 'b' in '<bsb>'
            searchIndex = foundIndex + 1;
        }
        console.log(`[Large Document Test] Testing ${bsbTags.length} tag locations in ${largeXml.length}-char document`);
        const iterations = 1000; // 1000 iterations * 10 tags = 10,000 total checks
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            for (const tagIndex of bsbTags) {
                (0, confidence_1.isInsideFieldName)(largeXml, tagIndex, 3);
            }
        }
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const totalChecks = iterations * bsbTags.length;
        const avgTime = totalTime / totalChecks;
        console.log(`  Total checks: ${totalChecks}`);
        console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  Average per call: ${(avgTime * 1000).toFixed(2)}μs`);
        // Should complete 10,000 checks in under 200ms
        node_assert_1.strict.ok(totalTime < 200, `Large document performance issue: ${totalTime.toFixed(2)}ms for ${totalChecks} checks (expected <200ms)`);
    });
    (0, node_test_1.test)('memory efficiency - no excessive allocations', () => {
        // Test that substring operations don't cause memory bloat
        const largeContent = 'X'.repeat(10000); // 10KB of content
        const xmlContent = `<data><![CDATA[${largeContent}]]></data><bsb>345-678</bsb>`;
        const tagStart = xmlContent.indexOf('<bsb>');
        const textIndex = tagStart + 1;
        // Track memory before
        if (global.gc) {
            global.gc(); // Force garbage collection if available
        }
        const memBefore = process.memoryUsage().heapUsed;
        // Run many iterations
        const iterations = 5000;
        for (let i = 0; i < iterations; i++) {
            (0, confidence_1.isInsideFieldName)(xmlContent, textIndex, 3);
        }
        // Track memory after
        if (global.gc) {
            global.gc();
        }
        const memAfter = process.memoryUsage().heapUsed;
        const memDelta = memAfter - memBefore;
        const memDeltaMB = memDelta / (1024 * 1024);
        console.log(`[Memory Efficiency] 5000 iterations with 10KB document:`);
        console.log(`  Memory before: ${(memBefore / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Memory after: ${(memAfter / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Memory delta: ${memDeltaMB.toFixed(2)}MB`);
        // Should not allocate more than 10MB for 5000 iterations
        // Substring creates new string objects, but they should be GC'd
        node_assert_1.strict.ok(Math.abs(memDeltaMB) < 10, `Excessive memory allocation: ${memDeltaMB.toFixed(2)}MB delta (expected <10MB)`);
    });
});
//# sourceMappingURL=confidence.performance.test.js.map