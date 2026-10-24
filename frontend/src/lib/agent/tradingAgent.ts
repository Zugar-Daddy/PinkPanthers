import { Candle, detectCandlePatterns, DetectedPattern } from '../algorithms/candlePatterns';
import { solveLC121_SingleTransaction, solveLC122_UnlimitedGreedy, solveLC123_TwoTransactionsDP, solveLC188_KTransactionsWithFee, StockDecision } from '../algorithms/stockDSA';
import { calculateEMA, calculateRSI } from '../algorithms/technicalIndicators';

export type RiskProfile = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AgentTradeOrder {
    id: string;
    timestamp: string;
    asset: string;
    action: 'BUY' | 'SELL';
    price: number;
    collateralAmount: number; // in USD
    notionalSize: number;     // collateral * leverage
    leverage: number;         // e.g. 2 = 2x
    stopLossPrice: number;
    targetPrice: number;
    dsaStrategy: string;
    detectedPattern?: DetectedPattern | null;
    rationale: string;
    isOutOfPolicy: boolean;
    policyViolationReason?: string;
}

export class TradingAgent {
    public riskProfile: RiskProfile = 'LOW';
    private openPositionCount: number = 0;
    private lastTradeIndex: number = -10;

    setRiskProfile(profile: RiskProfile) {
        this.riskProfile = profile;
    }

    /**
     * Analyze market candle and determine trade order
     */
    evaluateMarket(
        candles: Candle[],
        currentIndex: number,
        dailyRemainingBudget: number = 300,
        maxPerTxLimit: number = 100,
        maxLeverageCap: number = 3
    ): AgentTradeOrder | null {
        if (currentIndex < 20 || currentIndex >= candles.length) return null;

        const currentCandle = candles[currentIndex];
        const prices = candles.slice(0, currentIndex + 1).map(c => c.close);
        const rsiValues = calculateRSI(prices, 14);
        const ema20 = calculateEMA(prices, 20);
        const currentRSI = rsiValues[rsiValues.length - 1];
        const currentEMA20 = ema20[ema20.length - 1];

        // 1. Candlestick Pattern Detection
        const pattern = detectCandlePatterns(candles, currentIndex);

        // 2. Select DSA Algorithm based on Risk Profile
        let decision: StockDecision;
        let requestedLeverage = 1;
        let collateral = 30;

        if (this.riskProfile === 'LOW') {
            // Low Risk: LC 188 (constrained K transactions, cooldown, fee hurdle) + LC 121
            decision = solveLC188_KTransactionsWithFee(prices, currentIndex, 2, 0.5, this.lastTradeIndex, 5);
            if (decision.action === 'HOLD') {
                decision = solveLC121_SingleTransaction(prices, currentIndex);
            }
            requestedLeverage = 1; // 1x spot/minimal margin
            collateral = 40;       // Well within $100 per-tx limit
        } else if (this.riskProfile === 'MEDIUM') {
            // Medium Risk: LC 123 (Dual Transaction State Machine)
            decision = solveLC123_TwoTransactionsDP(prices, currentIndex, this.openPositionCount);
            requestedLeverage = 2; // 2x leverage
            collateral = 80;       // Moderate size
        } else {
            // High Risk: LC 122 (Greedy Momentum Scalper)
            decision = solveLC122_UnlimitedGreedy(prices, currentIndex);
            requestedLeverage = 4; // 4x leverage (intentionally tests the 3x policy cap!)
            collateral = 250;      // $250 collateral (intentionally tests the $100 per-tx cap!)
        }

        // Confluence: only trigger if pattern or DSA provides a positive signal
        if (decision.action === 'BUY') {
            const stopLoss = decision.stopLossPrice || currentCandle.close * (1 - 0.02);
            const target = decision.targetPrice || currentCandle.close * (1 + 0.05);

            // Policy Pre-Validation Checks
            let isOutOfPolicy = false;
            let violationReason = '';

            if (requestedLeverage > maxLeverageCap) {
                isOutOfPolicy = true;
                violationReason = `Leverage requested (${requestedLeverage}x) exceeds Vault Policy Cap (${maxLeverageCap}x)`;
            } else if (collateral > maxPerTxLimit) {
                isOutOfPolicy = true;
                violationReason = `Collateral ($${collateral}) exceeds Per-Tx Limit ($${maxPerTxLimit})`;
            } else if (collateral > dailyRemainingBudget) {
                isOutOfPolicy = true;
                violationReason = `Collateral ($${collateral}) exceeds 24h Remaining Budget ($${dailyRemainingBudget})`;
            }

            this.lastTradeIndex = currentIndex;
            this.openPositionCount++;

            return {
                id: `ORD-${Date.now()}-${currentIndex}`,
                timestamp: currentCandle.time,
                asset: 'SILVER / USD',
                action: 'BUY',
                price: currentCandle.close,
                collateralAmount: collateral,
                notionalSize: collateral * requestedLeverage,
                leverage: requestedLeverage,
                stopLossPrice: parseFloat(stopLoss.toFixed(3)),
                targetPrice: parseFloat(target.toFixed(3)),
                dsaStrategy: decision.dsaProblem,
                detectedPattern: pattern,
                rationale: `${pattern ? `[${pattern.pattern}] ` : ''}${decision.reason}`,
                isOutOfPolicy,
                policyViolationReason: violationReason || undefined
            };
        } else if (decision.action === 'SELL' && this.openPositionCount > 0) {
            this.openPositionCount = 0;
            return {
                id: `ORD-SELL-${Date.now()}-${currentIndex}`,
                timestamp: currentCandle.time,
                asset: 'SILVER / USD',
                action: 'SELL',
                price: currentCandle.close,
                collateralAmount: 0,
                notionalSize: 0,
                leverage: 1,
                stopLossPrice: 0,
                targetPrice: 0,
                dsaStrategy: decision.dsaProblem,
                detectedPattern: pattern,
                rationale: decision.reason,
                isOutOfPolicy: false
            };
        }

        return null;
    }
}

export const tradingAgent = new TradingAgent();
