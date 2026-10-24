import { randomUUID } from 'crypto';
import { readWalletState, writeWalletState, withWalletStateLock, WalletState } from '../state/walletStore';
import { samplePayroll, validateConfig, validatePayslips } from './policy';
import { PAYMASTER_ID, PaymasterState, PayrollConfig, PayrollRun } from './types';

export function getPaymaster(): PaymasterState {
    return readWalletState().paymaster || { revision: 0, config: samplePayroll(), runs: [] };
}
function ensureAgent(state: WalletState, config: PayrollConfig) {
    let agent = state.fleet.find(item => item.id === PAYMASTER_ID);
    if (!agent) {
        agent = { id: PAYMASTER_ID, name: config.name, role: 'Salary & leave administration', category: 'finance', tag: 'PM',
            address: '0x0000000000000000000000000000000000000015', dailyBudget: config.batchLimit, maxPerTx: config.perEmployeeLimit,
            spentToday: 0, status: config.enabled ? 'active' : 'paused', assignedCard: 'SIM-PAYROLL', lastAction: 'Ready for a monthly payroll run',
            cardDetails: { cardNumber: 'SIMULATED', maskedNumber: 'SIM-PAYROLL', expiry: 'N/A', cvv: '', holder: config.name, isFrozen: false,
                dailyLimit: config.batchLimit, spentToday: 0, brand: 'SIMULATED' } };
        state.fleet.push(agent);
        state.principal.totalAgentsCount += 1;
    }
    return agent;
}
export function savePaymaster(input: unknown, revision: number) {
    const config = validateConfig(input);
    return withWalletStateLock(() => {
        const state = readWalletState();
        const current = state.paymaster || { revision: 0, config: samplePayroll(), runs: [] };
        if (revision !== current.revision) throw new Error('Payroll settings changed in another tab. Reload before saving.');
        const agent = ensureAgent(state, config);
        agent.name = config.name; agent.status = config.enabled ? 'active' : 'paused';
        agent.dailyBudget = config.batchLimit; agent.maxPerTx = config.perEmployeeLimit; agent.cardDetails.dailyLimit = config.batchLimit; agent.cardDetails.holder = config.name;
        state.paymaster = { ...current, config, revision: current.revision + 1 };
        // If this agent was selected in another view, keep that view's policy consistent.
        if (state.activeAgent.id === PAYMASTER_ID) {
            state.activeAgent.name = config.name;
            state.policy.dailyBudget = config.batchLimit; state.policy.maxPerTx = config.perEmployeeLimit;
            state.virtualCard = { ...agent.cardDetails };
        }
        writeWalletState(state);
        return state.paymaster;
    });
}
export function startPayroll(requestId: string, revision: number): { run: PayrollRun; existing: boolean } {
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) throw new Error('A valid payroll request ID is required');
    return withWalletStateLock(() => {
        const state = readWalletState();
        const payroll = state.paymaster || { revision: 0, config: samplePayroll(), runs: [] };
        const paid = payroll.runs.find(run => run.month === payroll.config.month && run.status === 'PAID');
        if (paid) return { run: paid, existing: true };
        const repeat = payroll.runs.find(run => run.requestId === requestId);
        if (repeat) {
            if (repeat.status === 'CALCULATING' && Date.now() - Date.parse(repeat.startedAt) >= 90000) {
                repeat.status = 'FAILED'; repeat.error = 'Calculation interrupted or timed out. Start a new run.';
                state.paymaster = payroll; writeWalletState(state);
            }
            return { run: repeat, existing: true };
        }
        if (revision !== payroll.revision) throw new Error('Payroll settings changed. Reload before running payroll.');
        if (!payroll.config.enabled) throw new Error('PayMaster is paused. Enable it in settings first.');
        for (const run of payroll.runs.filter(item => item.status === 'CALCULATING')) {
            if (Date.now() - Date.parse(run.startedAt) < 90000) throw new Error('A payroll calculation is already running. Wait for it to finish.');
            run.status = 'FAILED'; run.error = 'Calculation interrupted or timed out. Start a new run.';
        }
        const config = validateConfig(payroll.config);
        const agent = ensureAgent(state, config);
        if (agent.status !== 'active') throw new Error('PayMaster is paused or provisioning. Enable it in its settings.');
        const run: PayrollRun = { id: `payroll-${randomUUID()}`, requestId, month: config.month, revision: payroll.revision,
            config: structuredClone(config), status: 'CALCULATING', startedAt: new Date().toISOString(), rows: [], totalNet: 0 };
        payroll.runs.unshift(run); state.paymaster = payroll;
        writeWalletState(state);
        return { run, existing: false };
    });
}
export function finishPayroll(id: string, output: unknown, model: string): PayrollRun {
    return withWalletStateLock(() => {
        const state = readWalletState(); const payroll = state.paymaster;
        const run = payroll?.runs.find(item => item.id === id);
        if (!payroll || !run || run.status !== 'CALCULATING') throw new Error('Payroll run is no longer active');
        if (payroll.revision !== run.revision) throw new Error('Settings changed during AI calculation. Run payroll again with the saved settings.');
        run.rows = validatePayslips(output, run.config);
        run.totalNet = run.rows.reduce((sum, row) => sum + row.netPay, 0);
        run.status = 'READY'; run.calculatedAt = new Date().toISOString(); run.model = model;
        writeWalletState(state); return run;
    });
}
export function failPayroll(id: string, message: string) {
    return withWalletStateLock(() => {
        const state = readWalletState(); const run = state.paymaster?.runs.find(item => item.id === id);
        if (run?.status === 'CALCULATING') { run.status = 'FAILED'; run.error = message.slice(0, 800); writeWalletState(state); }
    });
}

/** A whole month's payroll is committed once, in the same atomic write as the wallet debit. */
export function payPayroll(id: string): PayrollRun {
    return withWalletStateLock(() => {
        const state = readWalletState(); const payroll = state.paymaster;
        const run = payroll?.runs.find(item => item.id === id);
        if (!payroll || !run) throw new Error('Payroll run not found');
        if (run.status === 'PAID') return run;
        if (run.status !== 'READY') throw new Error('AI calculations must pass validation before payment');
        if (payroll.runs.some(item => item.id !== run.id && item.month === run.month && item.status === 'PAID')) throw new Error('This month has already been paid. Duplicate salaries are blocked.');
        const block = (message: string): PayrollRun => { run.error = message; writeWalletState(state); return run; };
        if (!payroll.config.enabled) return block('PayMaster is paused. Enable it before payout.');
        if (payroll.revision !== run.revision) return block('Payroll inputs changed. Calculate a new run before payout.');
        const agent = state.fleet.find(item => item.id === PAYMASTER_ID);
        if (!agent || agent.status !== 'active') return block('PayMaster must be active before payout.');
        if (agent.cardDetails.isFrozen) return block('PayMaster’s simulated card is frozen. Unfreeze it before payout.');
        const rows = validatePayslips({ employees: run.rows }, run.config);
        const total = rows.reduce((sum, row) => sum + row.netPay, 0);
        const balance = Math.round(state.balances.usdc * 100);
        if (!Number.isSafeInteger(balance) || balance < total) return block('Insufficient simulated wallet balance. No employee was paid.');
        const limits = [agent.dailyBudget, agent.maxPerTx, agent.cardDetails.dailyLimit, agent.spentToday, agent.cardDetails.spentToday];
        if (limits.some(value => !Number.isFinite(value) || value < 0)) return block('PayMaster spending limits are invalid.');
        if (total > Math.round(run.config.batchLimit * 100)) return block('Payroll exceeds the configured batch limit. Update settings and recalculate.');
        if (rows.some(row => row.netPay > Math.round(Math.min(run.config.perEmployeeLimit, agent.maxPerTx) * 100))) return block('An employee salary exceeds the per-employee limit. Update settings and recalculate.');
        const day = new Date().toISOString().slice(0, 10);
        // Include any other simulated actions taken by this same agent today.
        const recordedSpend = state.activityStream.filter(item => item.agentId === PAYMASTER_ID && Number.isFinite(item.timestamp) && new Date(item.timestamp).toISOString().slice(0, 10) === day)
            .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
        const spent = Math.max(recordedSpend, payroll.spendDay === day ? Math.round(agent.spentToday * 100) : 0);
        const cardSpent = Math.max(recordedSpend, payroll.spendDay === day ? Math.round(agent.cardDetails.spentToday * 100) : 0);
        if (spent + total > Math.round(agent.dailyBudget * 100) || cardSpent + total > Math.round(agent.cardDetails.dailyLimit * 100)) return block('PayMaster’s remaining daily budget cannot cover this batch. No employee was paid.');
        const paidAt = new Date().toISOString();
        state.balances.usdc = (balance - total) / 100;
        agent.spentToday = (spent + total) / 100; agent.cardDetails.spentToday = (cardSpent + total) / 100;
        agent.lastAction = `Paid ${rows.length} simulated salaries for ${run.month}`;
        payroll.spendDay = day;
        state.principal.totalFleetSpendToday = (Math.round(state.principal.totalFleetSpendToday * 100) + total) / 100;
        if (state.activeAgent.id === PAYMASTER_ID) { state.dailySpent = agent.spentToday; state.virtualCard.spentToday = agent.cardDetails.spentToday; }
        run.receipts = rows.map(row => {
            const employee = run.config.employees.find(item => item.id === row.employeeId)!;
            const receiptId = `${run.id}-${employee.id}`;
            if (row.netPay > 0) {
                const title = `${run.month} salary · ${employee.name}`;
                (state.simulatedTransactions ||= []).unshift({ id: receiptId, kind: 'TRANSFER', agentId: PAYMASTER_ID, title,
                    recipient: employee.payoutReference, amountMinor: row.netPay, currency: 'INR', quantity: 1, expiresAt: Date.now(),
                    status: 'SIMULATED', completedAt: paidAt, balanceAfter: state.balances.usdc, fingerprint: `payroll:${run.id}:${employee.id}` });
                state.userOps.unshift({ id: receiptId, userOpHash: receiptId, timestamp: paidAt, targetName: title, targetAddress: employee.payoutReference,
                    functionCalled: 'simulatedPayroll()', amount: row.netPay / 100, gasSponsored: false, gasCostUSD: 0, status: 'EXECUTED', validationResult: 'IN_POLICY',
                    reason: `PayMaster simulated salary. AI calculation validated. No real bank transfer. Payslip ${receiptId}.`,
                    rawUserOp: { sender: state.smartAccountAddress, nonce: state.userOps.length + 1, callData: '0x', callGasLimit: '0x0', verificationGasLimit: '0x0', paymasterAndData: '0x', signature: '0x' } });
                state.activityStream.unshift({ id: receiptId, agentId: PAYMASTER_ID, agentName: run.config.name, category: 'finance', tag: 'PM', action: 'Simulated salary', vendor: employee.name, amount: row.netPay / 100, timeAgo: 'now', timestamp: Date.now() });
            }
            return { id: receiptId, employeeId: employee.id, amountMinor: row.netPay };
        });
        state.inboxMessages.unshift({ id: run.id, sender: run.config.name, subject: `Payroll ${run.month} completed · ${rows.length} employees`,
            body: `₹${(total / 100).toFixed(2)} distributed from the simulated wallet. Open PayMaster for individual AI payslips. No bank transfer or tax remittance was made.`, timestamp: paidAt, unread: true, category: 'receipt' });
        run.status = 'PAID'; run.paidAt = paidAt; run.error = undefined;
        writeWalletState(state); return run;
    });
}
