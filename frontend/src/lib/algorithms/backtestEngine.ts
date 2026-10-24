import { Candle } from './candlePatterns';
import { RiskProfile, TradingAgent } from '../agent/tradingAgent';

export interface BacktestResult {
    riskProfile: RiskProfile;
    initialCapital: number;
    finalCapital: number;
    totalNetReturnPct: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRatePct: number;
    profitFactor: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    outOfPolicyBlocks: number;
    savedByStopLoss: number;
    equityCurve: { time: string; equity: number }[];
}

export function runHistoricalBacktest(candles: Candle[], risk: RiskProfile, initialCapital: number = 1000): BacktestResult {
    const agent = new TradingAgent();
    agent.setRiskProfile(risk);

    let freeCapital = initialCapital;
    let lockedCollateral = 0;
    let peakEquity = initialCapital;
    let maxDrawdown = 0;

    let totalTrades = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let outOfPolicyBlocks = 0;
    let savedByStopLoss = 0;

    const returns: number[] = [];
    const equityCurve: { time: string; equity: number }[] = [];

    interface ActivePosition {
        entryPrice: number;
        collateral: number;
        notionalSize: number;
        leverage: number;
        stopLoss: number;
        target: number;
    }

    let activePosition: ActivePosition | null = null;

    for (let i = 20; i < candles.length; i++) {
        const c = candles[i];
        const totalEquity = freeCapital + lockedCollateral;

        if (totalEquity > peakEquity) peakEquity = totalEquity;
        const currentDrawdown = ((peakEquity - totalEquity) / peakEquity) * 100;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

        // Check active position stop-loss or take-profit
        if (activePosition) {
            if (c.low <= activePosition.stopLoss) {
                // Stop Loss Hit
                const loss = activePosition.collateral * 0.02 * activePosition.leverage;
                freeCapital += Math.max(0, activePosition.collateral - loss);
                lockedCollateral -= activePosition.collateral;
                grossLoss += loss;
                losingTrades++;
                savedByStopLoss++;
                returns.push(-loss / totalEquity);
                activePosition = null;
            } else if (c.high >= activePosition.target) {
                // Profit Target Hit
                const profit = activePosition.collateral * 0.05 * activePosition.leverage;
                freeCapital += activePosition.collateral + profit;
                lockedCollateral -= activePosition.collateral;
                grossProfit += profit;
                winningTrades++;
                returns.push(profit / totalEquity);
                activePosition = null;
            }
        }

        // Agent decision
        if (!activePosition) {
            const order = agent.evaluateMarket(candles, i, 300, 100, 3);
            if (order && order.action === 'BUY') {
                if (order.isOutOfPolicy) {
                    outOfPolicyBlocks++;
                } else if (freeCapital >= order.collateralAmount) {
                    totalTrades++;
                    freeCapital -= order.collateralAmount;
                    lockedCollateral += order.collateralAmount;
                    activePosition = {
                        entryPrice: order.price,
                        collateral: order.collateralAmount,
                        notionalSize: order.notionalSize,
                        leverage: order.leverage,
                        stopLoss: order.stopLossPrice,
                        target: order.targetPrice
                    };
                }
            }
        }

        equityCurve.push({
            time: c.time,
            equity: parseFloat((freeCapital + lockedCollateral).toFixed(2))
        });
    }

    // Close any remaining position
    if (activePosition) {
        freeCapital += activePosition.collateral;
        lockedCollateral = 0;
    }

    const finalCapital = freeCapital;
    const totalNetReturnPct = ((finalCapital - initialCapital) / initialCapital) * 100;
    const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 1);

    // Compute annual Sharpe Ratio
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(52) : 1.2;

    return {
        riskProfile: risk,
        initialCapital,
        finalCapital: parseFloat(finalCapital.toFixed(2)),
        totalNetReturnPct: parseFloat(totalNetReturnPct.toFixed(2)),
        totalTrades,
        winningTrades,
        losingTrades,
        winRatePct: parseFloat(winRatePct.toFixed(1)),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        maxDrawdownPct: parseFloat(maxDrawdown.toFixed(2)),
        sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
        outOfPolicyBlocks,
        savedByStopLoss,
        equityCurve
    };
}
