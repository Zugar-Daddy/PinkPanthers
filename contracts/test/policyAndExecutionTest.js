const assert = require('assert');

console.log('🧪 Running Comprehensive PolicyEngine & ERC-4337 Security Tests...\n');

// Mock PolicyEngine state machine for mathematical validation
class PolicyEngineSimulator {
    constructor() {
        this.policies = new Map();
        this.allowedContracts = new Map();
        this.allowedSelectors = new Map();
        this.allowedRecipients = new Map();
        this.queuedRequests = [];
    }

    setPolicy(agent, validAfter, validUntil, maxPerTx, dailyBudget, maxLeverage, stopLossRequired) {
        this.policies.set(agent, {
            isActive: true,
            validAfter,
            validUntil,
            maxPerTx,
            dailyBudget,
            currentDailySpent: 0,
            lastEpochTimestamp: Date.now(),
            maxLeverage,
            stopLossRequired,
            isEmergencyHalted: false
        });
    }

    setContractWhitelist(agent, target, allowed) {
        if (!this.allowedContracts.has(agent)) this.allowedContracts.set(agent, new Set());
        if (allowed) this.allowedContracts.get(agent).add(target.toLowerCase());
        else this.allowedContracts.get(agent).delete(target.toLowerCase());
    }

    setSelectorWhitelist(agent, selector, allowed) {
        if (!this.allowedSelectors.has(agent)) this.allowedSelectors.set(agent, new Set());
        if (allowed) this.allowedSelectors.get(agent).add(selector.toLowerCase());
        else this.allowedSelectors.get(agent).delete(selector.toLowerCase());
    }

    setRecipientWhitelist(agent, recipient, allowed) {
        if (!this.allowedRecipients.has(agent)) this.allowedRecipients.set(agent, new Set());
        if (allowed) this.allowedRecipients.get(agent).add(recipient.toLowerCase());
        else this.allowedRecipients.get(agent).delete(recipient.toLowerCase());
    }

    validateAction(agent, target, value, selector, requestedLeverage, hasStopLoss, timestamp = Date.now()) {
        const p = this.policies.get(agent);
        if (!p || !p.isActive) throw new Error('Policy inactive');
        if (p.isEmergencyHalted) throw new Error('Policy halted by circuit breaker');
        if (timestamp < p.validAfter) throw new Error('Policy not yet valid');
        if (timestamp > p.validUntil) throw new Error('Policy expired');

        const contracts = this.allowedContracts.get(agent) || new Set();
        const recipients = this.allowedRecipients.get(agent) || new Set();
        if (!contracts.has(target.toLowerCase()) && !recipients.has(target.toLowerCase())) {
            throw new Error(`Target ${target} not allowlisted`);
        }

        if (selector) {
            const selectors = this.allowedSelectors.get(agent) || new Set();
            if (!selectors.has(selector.toLowerCase())) {
                throw new Error(`Selector ${selector} not allowlisted`);
            }
        }

        if (value > p.maxPerTx) {
            throw new Error(`Per-transaction limit exceeded: $${value} > max $${p.maxPerTx}`);
        }

        let currentSpent = p.currentDailySpent;
        if (timestamp > p.lastEpochTimestamp + 86400000) {
            currentSpent = 0; // 24-hour epoch reset
        }
        if (currentSpent + value > p.dailyBudget) {
            throw new Error(`Daily budget exceeded: requested $${value}, remaining $${p.dailyBudget - currentSpent}`);
        }

        if (requestedLeverage > p.maxLeverage) {
            throw new Error(`Leverage cap exceeded: ${requestedLeverage}x > max ${p.maxLeverage}x`);
        }

        if (p.stopLossRequired && !hasStopLoss) {
            throw new Error('Mandatory stop-loss missing');
        }

        return true;
    }

    recordSpend(agent, amount, timestamp = Date.now()) {
        const p = this.policies.get(agent);
        if (timestamp > p.lastEpochTimestamp + 86400000) {
            p.currentDailySpent = amount;
            p.lastEpochTimestamp = timestamp;
        } else {
            p.currentDailySpent += amount;
        }
    }
}

let passed = 0;
let total = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        console.log(`  ✅ Passed: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ Failed: ${name} - ${err.message}`);
    }
}

const engine = new PolicyEngineSimulator();
const agentAddress = '0x1111111111111111111111111111111111111111';
const dexAddress = '0x2222222222222222222222222222222222222222';
const hackerAddress = '0x9999999999999999999999999999999999999999';
const openPositionSelector = '0x12345678';
const maliciousSelector = '0xdeadbeef';

const now = Date.now();
engine.setPolicy(agentAddress, now - 1000, now + 7 * 86400000, 100, 300, 3, true);
engine.setContractWhitelist(agentAddress, dexAddress, true);
engine.setSelectorWhitelist(agentAddress, openPositionSelector, true);

// 1. In-policy standard execution
test('In-policy trade executes successfully within limits', () => {
    const valid = engine.validateAction(agentAddress, dexAddress, 50, openPositionSelector, 2, true);
    assert.strictEqual(valid, true);
    engine.recordSpend(agentAddress, 50);
});

// 2. Reject unwhitelisted target
test('Rejects transaction to unwhitelisted hacker/external target', () => {
    assert.throws(() => {
        engine.validateAction(agentAddress, hackerAddress, 50, openPositionSelector, 2, true);
    }, /not allowlisted/);
});

// 3. Reject unwhitelisted method selector
test('Rejects call with unwhitelisted method selector (malicious calldata)', () => {
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 50, maliciousSelector, 2, true);
    }, /Selector .* not allowlisted/);
});

// 4. Reject per-transaction limit breach
test('Rejects trade exceeding per-transaction cap ($150 > $100)', () => {
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 150, openPositionSelector, 2, true);
    }, /Per-transaction limit exceeded/);
});

// 5. Reject daily budget exhaustion
test('Rejects trade that exceeds remaining daily cumulative budget ($300 cap)', () => {
    // Already spent 50. Let's spend 200 more (total 250)
    engine.validateAction(agentAddress, dexAddress, 100, openPositionSelector, 2, true);
    engine.recordSpend(agentAddress, 100);
    engine.validateAction(agentAddress, dexAddress, 100, openPositionSelector, 2, true);
    engine.recordSpend(agentAddress, 100); // Total spent = 250
    // Now attempting 100 more will breach 300 budget (250 + 100 = 350 > 300)
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 100, openPositionSelector, 2, true);
    }, /Daily budget exceeded/);
});

// 6. Rolling 24-hour epoch reset
test('Resets daily budget when 24 hours have elapsed', () => {
    const futureTimestamp = now + 86400000 + 1000; // 24 hours and 1 second later
    const valid = engine.validateAction(agentAddress, dexAddress, 100, openPositionSelector, 2, true, futureTimestamp);
    assert.strictEqual(valid, true);
});

// 7. Leverage cap check
test('Rejects excessive leverage beyond policy cap (5x > 3x)', () => {
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 50, openPositionSelector, 5, true);
    }, /Leverage cap exceeded/);
});

// 8. Mandatory stop-loss check
test('Rejects derivative order missing mandatory stop-loss', () => {
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 50, openPositionSelector, 2, false);
    }, /Mandatory stop-loss missing/);
});

// 9. Session Key Expiry
test('Rejects action after session key validUntil timestamp', () => {
    const expiredTimestamp = now + 8 * 86400000;
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 50, openPositionSelector, 2, true, expiredTimestamp);
    }, /Policy expired/);
});

// 10. Circuit breaker emergency halt
test('Halts all agent actions when drawdown circuit breaker triggers', () => {
    engine.policies.get(agentAddress).isEmergencyHalted = true;
    assert.throws(() => {
        engine.validateAction(agentAddress, dexAddress, 50, openPositionSelector, 2, true);
    }, /circuit breaker/);
});

console.log(`\n🎉 Results: ${passed}/${total} security test cases passed successfully!`);
if (passed !== total) process.exit(1);
