const assert = require('assert');

console.log('⚔️  Running Comprehensive Hijack Attack & Social Recovery Test Suite...\n');

/**
 * Emulated On-Chain State Machine for SafeAgent Smart Account & Extensions
 */
class SafeAgentHarness {
    constructor() {
        this.owner = '0xOwner5B38Da6a701c568545dCfcB03FcB875f56beddC4';
        this.agent = '0xAgent92F1c30E682cB72a6A20C57aD7858D0aA4481023';
        this.hacker = '0xHacker9999999999999999999999999999999999999999';

        this.vaultBalance = 1250000; // ₹12,50,000
        this.dailyBudget = 10000;    // ₹10,000 daily limit
        this.maxPerTx = 2500;        // ₹2,500 per tx cap
        this.dailySpent = 0;
        this.lastEpoch = Date.now();
        this.validUntil = Date.now() + 6 * 3600 * 1000;
        this.isFrozen = false;

        // Whitelists
        this.allowedContracts = new Set([
            '0x00000000000000000000000000000000000a1a1a', // OpenAI
            '0x00000000000000000000000000000000000b2b2b', // Blinkit
            '0xe592427a0aece92de3edee1f18e0157c05861564'  // Uniswap V3
        ]);
        this.allowedSelectors = new Set([
            '0x12345678', // payInvoice
            '0x87654321', // orderCheckout
            '0x414bf389'  // exactInputSingle
        ]);

        // Paymaster Anti-Spam Gas Quota
        this.paymasterGasSpent = 0;
        this.maxDailyGas = 0.005; // 0.005 ETH

        // 3-of-5 Social Recovery State
        this.guardians = [
            '0xGuardianAlice111111111111111111111111111111',
            '0xGuardianBob22222222222222222222222222222222',
            '0xGuardianCharlie3333333333333333333333333333',
            '0xGuardianDave44444444444444444444444444444444',
            '0xGuardianEve555555555555555555555555555555555'
        ];
        this.recoveryProposal = null;
    }

    executeAction(caller, target, selector, amount, timestamp = Date.now()) {
        if (this.isFrozen) {
            throw new Error('REVERT: Account or Virtual Card is FROZEN');
        }
        if (caller.toLowerCase() !== this.agent.toLowerCase() && caller.toLowerCase() !== this.owner.toLowerCase()) {
            throw new Error('REVERT: Caller not authorized');
        }
        if (caller.toLowerCase() === this.agent.toLowerCase()) {
            if (timestamp > this.validUntil) {
                throw new Error('REVERT: Session key expired (validUntil passed)');
            }
            if (!this.allowedContracts.has(target.toLowerCase())) {
                throw new Error(`REVERT: Target address not whitelisted: ${target}`);
            }
            if (!this.allowedSelectors.has(selector.toLowerCase())) {
                throw new Error(`REVERT: Method selector not whitelisted: ${selector}`);
            }
            if (amount > this.maxPerTx) {
                throw new Error(`REVERT: Exceeds per-tx cap (₹${amount} > ₹${this.maxPerTx})`);
            }
            if (this.dailySpent + amount > this.dailyBudget) {
                throw new Error(`REVERT: Daily budget cap exceeded (requested ₹${amount}, remaining ₹${this.dailyBudget - this.dailySpent})`);
            }
            this.dailySpent += amount;
            this.vaultBalance -= amount;
        } else {
            // Owner execution
            this.vaultBalance -= amount;
        }
        return true;
    }

    sponsorGas(agent, cost) {
        if (this.paymasterGasSpent + cost > this.maxDailyGas) {
            throw new Error('REVERT: Paymaster anti-spam daily gas quota exceeded');
        }
        this.paymasterGasSpent += cost;
        return true;
    }

    proposeRecovery(guardian, newOwner) {
        if (!this.guardians.map(g => g.toLowerCase()).includes(guardian.toLowerCase())) {
            throw new Error('REVERT: Not a verified guardian');
        }
        if (!this.recoveryProposal) {
            this.recoveryProposal = {
                newOwner,
                approvals: new Set([guardian.toLowerCase()]),
                executeAfter: null,
                isExecuted: false
            };
        } else {
            this.recoveryProposal.approvals.add(guardian.toLowerCase());
        }

        if (this.recoveryProposal.approvals.size >= 3 && !this.recoveryProposal.executeAfter) {
            this.recoveryProposal.executeAfter = Date.now() + 48 * 3600 * 1000; // 48-hour delay
        }
    }

    executeRecovery(nowTimestamp) {
        if (!this.recoveryProposal || this.recoveryProposal.approvals.size < 3) {
            throw new Error('REVERT: 3-of-5 quorum not reached');
        }
        if (nowTimestamp < this.recoveryProposal.executeAfter) {
            throw new Error('REVERT: 48-hour timelock delay pending');
        }
        this.owner = this.recoveryProposal.newOwner;
        this.recoveryProposal.isExecuted = true;
    }

    vetoRecovery(caller) {
        if (caller.toLowerCase() !== this.owner.toLowerCase()) {
            throw new Error('REVERT: Only legitimate owner can veto recovery');
        }
        this.recoveryProposal = null; // Instantly cancelled
    }
}

// -------------------------------------------------------------
// EXECUTE 5+ SCRIPTED HIJACK ATTACK SCENARIOS
// -------------------------------------------------------------
const harness = new SafeAgentHarness();
let totalLossFromHijack = 0;

// Attack 1: Prompt Injection / Direct Drain to Hacker Address
try {
    harness.executeAction(harness.agent, harness.hacker, '0x12345678', 500000);
    assert.fail('Attack 1 should have reverted');
} catch (err) {
    assert(err.message.includes('not whitelisted'));
    console.log('  ✅ Attack 1: Prompt Injection / Full Drain -> REVERTED (Loss: ₹0)');
}

// Attack 2: Malicious Calldata & Reentrancy Selector
try {
    harness.executeAction(harness.agent, '0x00000000000000000000000000000000000a1a1a', '0xdeadbeef', 1000);
    assert.fail('Attack 2 should have reverted');
} catch (err) {
    assert(err.message.includes('Method selector not whitelisted'));
    console.log('  ✅ Attack 2: Malicious Calldata (0xdeadbeef) -> REVERTED (Loss: ₹0)');
}

// Attack 3: Rapid-Fire Micro-Drain Sybil Attack
// Attacker tries to fire 20x ₹1,500 transactions within policy whitelist
let passedTxs = 0;
let blockedTxs = 0;
for (let i = 0; i < 20; i++) {
    try {
        harness.executeAction(harness.agent, '0x00000000000000000000000000000000000a1a1a', '0x12345678', 1500);
        passedTxs++;
        totalLossFromHijack += 1500;
    } catch (err) {
        blockedTxs++;
    }
}
assert.strictEqual(passedTxs, 6); // 6 * 1500 = 9000 <= 10000
assert.strictEqual(blockedTxs, 14); // 7th attempt hits daily limit and reverts
assert(totalLossFromHijack <= harness.dailyBudget, 'Losses must NEVER exceed daily limit');
console.log(`  ✅ Attack 3: High-Frequency Micro-Drain -> 6 passed (₹${totalLossFromHijack}), 14 REVERTED at daily limit (Total Loss: ₹${totalLossFromHijack} <= ₹${harness.dailyBudget})`);

// Attack 4: Post-Expiry Sub-Key Replay
try {
    const expiredTimestamp = harness.validUntil + 10000;
    harness.executeAction(harness.agent, '0x00000000000000000000000000000000000a1a1a', '0x12345678', 500, expiredTimestamp);
    assert.fail('Attack 4 should have reverted');
} catch (err) {
    assert(err.message.includes('validUntil passed'));
    console.log('  ✅ Attack 4: Post-Expiry Sub-Key Call -> REVERTED on-chain (Loss: ₹0)');
}

// Attack 5: Paymaster Infinite Gas Drain Loop
let sponsoredCount = 0;
let paymasterBlocked = 0;
for (let i = 0; i < 15; i++) {
    try {
        harness.sponsorGas(harness.agent, 0.001); // 0.001 ETH each
        sponsoredCount++;
    } catch (err) {
        paymasterBlocked++;
    }
}
assert.strictEqual(sponsoredCount, 5); // 5 * 0.001 = 0.005 ETH quota
assert.strictEqual(paymasterBlocked, 10); // Blocked after 0.005 ETH quota
console.log(`  ✅ Attack 5: Paymaster Infinite Gas Drain -> 5 sponsored (0.005 ETH), 10 REVERTED (Paymaster Tank Protected)`);

// -------------------------------------------------------------
// EXTENSION: 3-OF-5 SOCIAL RECOVERY WITH 48H DELAY & OWNER VETO
// -------------------------------------------------------------
console.log('\n🛡️  Testing 3-of-5 Guardian Social Recovery & Owner Veto...');

const newProposedOwner = '0xRecoveredOwner7777777777777777777777777777';

// 1 Guardian signs
harness.proposeRecovery(harness.guardians[0], newProposedOwner);
assert.strictEqual(harness.recoveryProposal.approvals.size, 1);
assert.strictEqual(harness.recoveryProposal.executeAfter, null);

// 2 Guardians sign (still < 3)
harness.proposeRecovery(harness.guardians[1], newProposedOwner);
assert.strictEqual(harness.recoveryProposal.approvals.size, 2);
assert.strictEqual(harness.recoveryProposal.executeAfter, null);

// 3 Guardians sign -> Quorum reached, 48-hour timelock begins
harness.proposeRecovery(harness.guardians[2], newProposedOwner);
assert.strictEqual(harness.recoveryProposal.approvals.size, 3);
assert(harness.recoveryProposal.executeAfter > Date.now());
console.log('  ✅ 3-of-5 Guardian Quorum Reached: 48-Hour Timelock Initiated');

// Attempt premature execution at 24 hours -> Must revert
try {
    const prematureTime = Date.now() + 24 * 3600 * 1000;
    harness.executeRecovery(prematureTime);
    assert.fail('Premature execution should have reverted');
} catch (err) {
    assert(err.message.includes('48-hour timelock delay pending'));
    console.log('  ✅ Premature Execution Reverted (24h < 48h)');
}

// Test Owner Veto: Legitimate owner cancels malicious recovery attempt
harness.vetoRecovery(harness.owner);
assert.strictEqual(harness.recoveryProposal, null);
console.log('  ✅ Master Owner Hardware Passkey Veto Successful: Cancelled rogue recovery attempt');

// Re-initiate and fast-forward to 49 hours -> Recovery finalized
harness.proposeRecovery(harness.guardians[0], newProposedOwner);
harness.proposeRecovery(harness.guardians[1], newProposedOwner);
harness.proposeRecovery(harness.guardians[3], newProposedOwner);
const postDelayTime = Date.now() + 49 * 3600 * 1000;
harness.executeRecovery(postDelayTime);
assert.strictEqual(harness.owner, newProposedOwner);
console.log('  ✅ Recovery Finalized after 48h delay: Owner successfully transferred to recovered address');

console.log('\n🎉 All 5+ Hijack Attack vectors and Social Recovery invariants verified successfully!\n');
