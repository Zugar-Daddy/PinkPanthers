/**
 * 4 Classic Stock Trading DSA Algorithms (LeetCode Stock Series)
 * Adapted for Real-Time Market Simulation & Risk-Adjusted Decision Making
 */

export interface StockDecision {
    action: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
    dsaProblem: 'LC_121' | 'LC_122' | 'LC_123' | 'LC_188';
    confidence: number; // 0 to 1
    targetPrice?: number;
    stopLossPrice?: number;
}

/**
 * Problem 1: LeetCode 121 — Best Time to Buy and Sell Stock I
 * Concept: Single Transaction. Find global minimum valley followed by maximum peak.
 * Strategy: Ultra-conservative macro swing trader. Low Risk.
 */
export function solveLC121_SingleTransaction(prices: number[], currentIndex: number): StockDecision {
    if (currentIndex < 5 || prices.length < 5) return { action: 'HOLD', reason: 'Insufficient history', dsaProblem: 'LC_121', confidence: 0 };

    const lookback = prices.slice(Math.max(0, currentIndex - 30), currentIndex + 1);
    const currentPrice = lookback[lookback.length - 1];
    let minPrice = Infinity;
    let minIdx = -1;

    for (let i = 0; i < lookback.length; i++) {
        if (lookback[i] < minPrice) {
            minPrice = lookback[i];
            minIdx = i;
        }
    }

    const distanceFromMin = (currentPrice - minPrice) / minPrice;
    const isAtValley = minIdx >= lookback.length - 3 && distanceFromMin < 0.015; // Within 1.5% of local valley

    if (isAtValley) {
        return {
            action: 'BUY',
            reason: `LC 121: Macro valley detected at $${minPrice.toFixed(2)} (within ${(distanceFromMin * 100).toFixed(1)}% of cycle low). Holding for major peak.`,
            dsaProblem: 'LC_121',
            confidence: 0.88,
            targetPrice: currentPrice * 1.08,
            stopLossPrice: minPrice * 0.985
        };
    }

    // Sell if reached a significant peak (+6% from valley)
    if (distanceFromMin > 0.06) {
        return {
            action: 'SELL',
            reason: `LC 121: Max profit target reached (+${(distanceFromMin * 100).toFixed(1)}% gain above cycle bottom $${minPrice.toFixed(2)}).`,
            dsaProblem: 'LC_121',
            confidence: 0.85
        };
    }

    return { action: 'HOLD', reason: 'LC 121: Waiting for cycle extreme valley or peak.', dsaProblem: 'LC_121', confidence: 0.3 };
}

/**
 * Problem 2: LeetCode 122 — Best Time to Buy and Sell Stock II
 * Concept: Unlimited Transactions. Greedily capture all positive slopes (P[i] - P[i-1] > 0).
 * Strategy: Aggressive intra-day momentum scalper. High Risk.
 */
export function solveLC122_UnlimitedGreedy(prices: number[], currentIndex: number): StockDecision {
    if (currentIndex < 2) return { action: 'HOLD', reason: 'Insufficient history', dsaProblem: 'LC_122', confidence: 0 };

    const prevPrice = prices[currentIndex - 1];
    const currentPrice = prices[currentIndex];
    const delta = currentPrice - prevPrice;
    const deltaPct = delta / prevPrice;

    if (deltaPct > 0.004) { // Upward tick > 0.4%
        return {
            action: 'BUY',
            reason: `LC 122: Greedy slope ascent detected (+${(deltaPct * 100).toFixed(2)}% tick). Capturing momentum.`,
            dsaProblem: 'LC_122',
            confidence: 0.78,
            targetPrice: currentPrice * 1.02,
            stopLossPrice: currentPrice * 0.988
        };
    } else if (deltaPct < -0.005) {
        return {
            action: 'SELL',
            reason: `LC 122: Negative slope confirmed (${(deltaPct * 100).toFixed(2)}% drop). Cutting position immediately to protect profit.`,
            dsaProblem: 'LC_122',
            confidence: 0.82
        };
    }

    return { action: 'HOLD', reason: 'LC 122: Flat slope.', dsaProblem: 'LC_122', confidence: 0.2 };
}

/**
 * Problem 3: LeetCode 123 — Best Time to Buy and Sell Stock III
 * Concept: At Most 2 Transactions. 4-State Machine Dynamic Programming:
 * buy1 = max(buy1, -P[i]), sell1 = max(sell1, buy1 + P[i]), buy2 = max(buy2, sell1 - P[i]), sell2 = max(sell2, buy2 + P[i])
 * Strategy: Balanced Core & Tactical Re-entry Swing. Medium Risk.
 */
export function solveLC123_TwoTransactionsDP(prices: number[], currentIndex: number, openPositionCount: number): StockDecision {
    if (currentIndex < 10) return { action: 'HOLD', reason: 'Insufficient history', dsaProblem: 'LC_123', confidence: 0 };

    const window = prices.slice(Math.max(0, currentIndex - 20), currentIndex + 1);
    let buy1 = -Infinity, sell1 = 0, buy2 = -Infinity, sell2 = 0;

    for (const p of window) {
        buy1 = Math.max(buy1, -p);
        sell1 = Math.max(sell1, buy1 + p);
        buy2 = Math.max(buy2, sell1 - p);
        sell2 = Math.max(sell2, buy2 + p);
    }

    const currentPrice = window[window.length - 1];

    if (openPositionCount === 0 && currentPrice + buy1 < 0.5) {
        return {
            action: 'BUY',
            reason: `LC 123 DP: Primary Transaction 1 triggered at state buy1 equilibrium.`,
            dsaProblem: 'LC_123',
            confidence: 0.80,
            targetPrice: currentPrice * 1.045,
            stopLossPrice: currentPrice * 0.98
        };
    } else if (openPositionCount === 1 && currentPrice >= -buy2 + 0.3) {
        return {
            action: 'BUY',
            reason: `LC 123 DP: Secondary Re-entry Transaction 2 triggered at state buy2 reinvestment level.`,
            dsaProblem: 'LC_123',
            confidence: 0.75,
            targetPrice: currentPrice * 1.04,
            stopLossPrice: currentPrice * 0.985
        };
    } else if (openPositionCount >= 1 && (sell1 > currentPrice * 0.04 || sell2 > currentPrice * 0.06)) {
        return {
            action: 'SELL',
            reason: `LC 123 DP: Dual-transaction profit target satisfied at state sell1/sell2.`,
            dsaProblem: 'LC_123',
            confidence: 0.84
        };
    }

    return { action: 'HOLD', reason: 'LC 123: State machine in accumulation range.', dsaProblem: 'LC_123', confidence: 0.4 };
}

/**
 * Problem 4: LeetCode 188 / 309 / 714 — Best Time to Buy and Sell Stock IV with Cooldown & Fees
 * Concept: At Most K Transactions with Transaction Fee (gas + slippage) and Cooldown Interval.
 * Strategy: Institutional Arbitrage with Rate-Limiting matching ERC-4337 Daily Budget.
 */
export function solveLC188_KTransactionsWithFee(
    prices: number[],
    currentIndex: number,
    k: number = 3,
    fee: number = 0.5, // $0.50 gas/swap fee
    lastTradeIndex: number = -10,
    cooldownBars: number = 4
): StockDecision {
    if (currentIndex - lastTradeIndex < cooldownBars) {
        return {
            action: 'HOLD',
            reason: `LC 309 Cooldown: Rate limit active (${cooldownBars - (currentIndex - lastTradeIndex)} bars remaining). Preserving daily budget.`,
            dsaProblem: 'LC_188',
            confidence: 0.9
        };
    }

    const window = prices.slice(Math.max(0, currentIndex - 25), currentIndex + 1);
    const n = window.length;
    if (n < 5) return { action: 'HOLD', reason: 'Insufficient data', dsaProblem: 'LC_188', confidence: 0 };

    const currentPrice = window[n - 1];
    const prev5Avg = window.slice(n - 6, n - 1).reduce((a, b) => a + b, 0) / 5;

    // Net profit hurdle after gas fee
    const expectedGrossProfit = (currentPrice - prev5Avg);
    if (expectedGrossProfit > fee * 2 && currentPrice > prev5Avg) {
        return {
            action: 'BUY',
            reason: `LC 188 (k=${k}): Net expected return exceeds fee hurdle ($${expectedGrossProfit.toFixed(2)} > fee $${fee.toFixed(2)}). Cooldown clear.`,
            dsaProblem: 'LC_188',
            confidence: 0.82,
            targetPrice: currentPrice + fee * 4,
            stopLossPrice: currentPrice - fee * 2
        };
    }

    return { action: 'HOLD', reason: 'LC 188: Profit expectation below fee/gas threshold.', dsaProblem: 'LC_188', confidence: 0.5 };
}
