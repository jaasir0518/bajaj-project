/**
 * Systematic BFHL validation suite aligned to the PDF rules.
 *
 * Coverage:
 * 1. Unit-level rules against HierarchyService
 * 2. Integration/API checks against the running Express server
 * 3. Edge/performance checks for evaluator-style inputs
 */

const { spawn } = require('child_process');
const HierarchyService = require('./src/services/hierarchyService');

const PORT = Number(process.env.PORT || 3000);
const API_URL = process.env.API_URL || `http://127.0.0.1:${PORT}/bfhl`;
const SERVER_URL = API_URL.replace(/\/bfhl$/, '');

const userData = {
  user_id: 'Mohamed Jaasir',
  email_id: 'mj3055@srmist.edu.in',
  college_roll_number: 'RA2311026020018'
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class ValidationSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.serverProcess = null;
  }

  log(message, color = 'reset') {
    // Logging disabled
  }

  assertTrue(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `${message}\n   Expected: ${JSON.stringify(expected)}\n   Got: ${JSON.stringify(actual)}`
      );
    }
  }

  async runTest(name, testFn) {
    try {
      this.log(`\n🧪 ${name}`, 'cyan');
      await testFn();
      this.passed += 1;
      this.log(`✅ PASSED: ${name}`, 'green');
    } catch (error) {
      this.failed += 1;
      this.log(`❌ FAILED: ${name}`, 'red');
      this.log(`   ${error.message}`, 'red');
    }
  }

  processWithService(data) {
    return new HierarchyService(userData).process(data);
  }

  async callAPI(payload) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async waitForServer(timeoutMs = 5000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await fetch(`${SERVER_URL}/bfhl`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Retry until timeout.
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new Error(`Server did not become ready within ${timeoutMs}ms`);
  }

  async ensureServer() {
    try {
      await this.waitForServer(500);
      this.log('Using already-running backend server for API checks.', 'yellow');
      return;
    } catch (error) {
      // Start a local server for the integration checks.
    }

    this.serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'ignore'
    });

    await this.waitForServer();
  }

  async stopServer() {
    if (!this.serverProcess) {
      return;
    }

    await new Promise((resolve) => {
      this.serverProcess.once('exit', resolve);
      this.serverProcess.kill('SIGTERM');
      setTimeout(resolve, 1000);
    });
  }

  buildPerformanceInput(size = 50) {
    const edges = [];
    for (let parentCode = 65; parentCode <= 90 && edges.length < size; parentCode += 1) {
      for (let childCode = 65; childCode <= 90 && edges.length < size; childCode += 1) {
        if (parentCode === childCode) {
          continue;
        }

        const parent = String.fromCharCode(parentCode);
        const child = String.fromCharCode(childCode);
        edges.push(`${parent}->${child}`);
      }
    }

    return edges;
  }

  async testInputValidationMatrix() {
    const cases = [
      { input: ['A->B'], invalid: [] },
      { input: ['hello'], invalid: ['hello'] },
      { input: ['1->2'], invalid: ['1->2'] },
      { input: ['AB->C'], invalid: ['AB->C'] },
      { input: ['A-B'], invalid: ['A-B'] },
      { input: ['A->'], invalid: ['A->'] },
      { input: ['A->A'], invalid: ['A->A'] },
      { input: [''], invalid: [''] },
      { input: [' A->B '], invalid: [] }
    ];

    for (const { input, invalid } of cases) {
      const result = this.processWithService(input);
      this.assertEqual(result.invalid_entries, invalid, `Unexpected validation result for ${JSON.stringify(input[0])}`);
    }
  }

  async testDuplicateHandling() {
    const result = this.processWithService(['A->B', 'A->B', 'A->B']);
    this.assertEqual(result.duplicate_edges, ['A->B'], 'Duplicate edges should be reported once');
    this.assertEqual(result.summary.total_trees, 1, 'Only one tree should remain after de-duplication');
    this.assertEqual(result.hierarchies[0].tree, { A: { B: {} } }, 'Only one A->B edge should be used');
  }

  async testMultiParentRule() {
    const result = this.processWithService(['A->D', 'B->D']);
    const containingD = result.hierarchies.filter((hierarchy) => JSON.stringify(hierarchy.tree).includes('"D"'));

    this.assertEqual(containingD.length, 1, 'D should appear in exactly one hierarchy');
    this.assertEqual(containingD[0].root, 'A', 'The first parent should win');
    this.assertTrue(
      result.hierarchies.some((hierarchy) => hierarchy.root === 'B'),
      'The losing parent should still remain as its own root node'
    );
  }

  async testRootDetection() {
    const direct = this.processWithService(['A->B', 'B->C']);
    const unordered = this.processWithService(['B->C', 'A->B', 'C->D']);

    this.assertEqual(direct.hierarchies[0].root, 'A', 'Root should be A');
    this.assertEqual(unordered.hierarchies[0].root, 'A', 'Root should stay A for unordered input');
  }

  async testCycleDetection() {
    const result = this.processWithService(['A->B', 'B->C', 'C->A']);

    this.assertTrue(result.has_cycle, 'Cycle should be detected');
    this.assertEqual(result.summary.total_cycles, 1, 'Exactly one cycle should be counted');
    this.assertEqual(result.summary.total_trees, 0, 'Cycle-only input should not count as a tree');
    this.assertEqual(result.hierarchies[0].tree, {}, 'Cycle hierarchy should not expose a tree');
    this.assertTrue(result.hierarchies[0].has_cycle, 'Hierarchy should be marked as a cycle');
  }

  async testPureCycleRootSelection() {
    const result = this.processWithService(['X->Y', 'Y->Z', 'Z->X']);

    this.assertTrue(result.has_cycle, 'Pure cycle should be detected');
    this.assertEqual(result.hierarchies[0].root, 'X', 'Pure cycle root should be lexicographically smallest');
  }

  async testDepthCalculation() {
    const chain = this.processWithService(['A->B', 'B->C', 'C->D']);
    const branch = this.processWithService(['A->B', 'A->C', 'B->D']);

    this.assertEqual(chain.hierarchies[0].depth, 4, 'Depth should count nodes for a chain');
    this.assertEqual(branch.hierarchies[0].depth, 3, 'Depth should follow the longest branch');
  }

  async testMultipleTreesAndSummary() {
    const result = this.processWithService(['A->B', 'X->Y']);

    this.assertEqual(result.hierarchies.length, 2, 'Should create two separate hierarchies');
    this.assertEqual(result.summary.total_trees, 2, 'Summary should count two trees');
    this.assertEqual(result.summary.total_cycles, 0, 'Summary should count zero cycles');
    this.assertEqual(result.summary.largest_tree_root, 'A', 'Tie should prefer the lexicographically smaller root');
  }

  async testMasterCase() {
    const input = [
      'A->B', 'A->C', 'B->D', 'C->E', 'E->F',
      'X->Y', 'Y->Z', 'Z->X',
      'P->Q', 'Q->R',
      'G->H', 'G->H', 'G->I',
      'hello', '1->2', 'A->'
    ];

    const result = this.processWithService(input);

    this.assertEqual(result.hierarchies.length, 4, 'Master case should produce 4 hierarchies total');
    this.assertEqual(result.summary.total_trees, 3, 'Master case should count 3 non-cycle trees');
    this.assertEqual(result.summary.total_cycles, 1, 'Master case should count 1 cycle');
    this.assertEqual(result.summary.largest_tree_root, 'A', 'Largest tree root should be A');
    this.assertEqual(result.duplicate_edges, ['G->H'], 'Master case should report duplicate G->H');
    this.assertEqual(result.invalid_entries, ['hello', '1->2', 'A->'], 'Master case should report the invalid entries');
  }

  async testAPIStructure() {
    await this.ensureServer();

    const getResponse = await fetch(`${SERVER_URL}/bfhl`);
    const getPayload = await getResponse.json();
    this.assertEqual(getPayload, { operation_code: 1 }, 'GET /bfhl should return operation_code');

    const result = await this.callAPI({ data: ['A->B'] });
    this.assertTrue(Array.isArray(result.hierarchies), 'Response should include hierarchies');
    this.assertTrue(Array.isArray(result.invalid_entries), 'Response should include invalid_entries');
    this.assertTrue(Array.isArray(result.duplicate_edges), 'Response should include duplicate_edges');
    this.assertTrue(typeof result.summary === 'object', 'Response should include summary');
  }

  async testAPIValidationError() {
    await this.ensureServer();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'A->B' })
    });

    this.assertEqual(response.status, 400, 'Invalid request body should return HTTP 400');
  }

  async testPerformance() {
    await this.ensureServer();

    const input = this.buildPerformanceInput(50);
    const startedAt = Date.now();
    const result = await this.callAPI({ data: input });
    const duration = Date.now() - startedAt;

    this.assertTrue(duration < 3000, `Response time should be under 3 seconds, got ${duration}ms`);
    this.assertTrue(result.hierarchies.length > 0 || result.has_cycle !== undefined, 'Performance call should return a valid payload');
  }

  async runAll() {
    this.log('\n============================================================', 'blue');
    this.log('BFHL PDF VALIDATION SUITE', 'blue');
    this.log('============================================================', 'blue');

    const tests = [
      ['Unit: Input validation matrix', () => this.testInputValidationMatrix()],
      ['Unit: Duplicate handling', () => this.testDuplicateHandling()],
      ['Unit: Multi-parent rule', () => this.testMultiParentRule()],
      ['Unit: Root detection', () => this.testRootDetection()],
      ['Unit: Cycle detection', () => this.testCycleDetection()],
      ['Unit: Pure cycle root selection', () => this.testPureCycleRootSelection()],
      ['Unit: Depth calculation', () => this.testDepthCalculation()],
      ['Unit: Multiple trees + summary', () => this.testMultipleTreesAndSummary()],
      ['Integration: Master case', () => this.testMasterCase()],
      ['API: Structure + GET/POST smoke', () => this.testAPIStructure()],
      ['API: Validation error handling', () => this.testAPIValidationError()],
      ['Performance: 50 valid-format edges under 3s', () => this.testPerformance()]
    ];

    try {
      for (const [name, testFn] of tests) {
        await this.runTest(name, testFn);
      }
    } finally {
      await this.stopServer();
    }

    this.printSummary();
  }

  printSummary() {
    const total = this.passed + this.failed;
    const successRate = total === 0 ? 0 : ((this.passed / total) * 100).toFixed(2);

    this.log('\n============================================================', 'blue');
    this.log('VALIDATION SUMMARY', 'blue');
    this.log('============================================================', 'blue');
    this.log(`Passed: ${this.passed}`, 'green');
    this.log(`Failed: ${this.failed}`, this.failed === 0 ? 'green' : 'red');
    this.log(`Success Rate: ${successRate}%`, 'cyan');

    if (this.failed === 0) {
      this.log('\nAll PDF-aligned validation checks passed.', 'green');
    } else {
      this.log('\nSome validation checks failed. Review the failing cases above.', 'yellow');
    }
  }
}

(async () => {
  const suite = new ValidationSuite();

  try {
    await suite.runAll();
    process.exit(suite.failed === 0 ? 0 : 1);
  } catch (error) {
    process.exit(1);
  }
})();
