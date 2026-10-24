import { Candle } from './candlePatterns';

export function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray: number[] = new Array(prices.length).fill(0);

    // Initial SMA
    let sum = 0;
    for (let i = 0; i < Math.min(period, prices.length); i++) {
        sum += prices[i];
    }
    emaArray[Math.min(period, prices.length) - 1] = sum / Math.min(period, prices.length);

    for (let i = period; i < prices.length; i++) {
        emaArray[i] = prices[i] * k + emaArray[i - 1] * (1 - k);
    }

    return emaArray;
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
    const rsiArray: number[] = new Array(prices.length).fill(50);
    if (prices.length <= period) return rsiArray;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArray[period] = 100 - (100 / (1 + rs));

    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        const currentGain = diff > 0 ? diff : 0;
        const currentLoss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsiArray[i] = 100 - (100 / (1 + rs));
    }

    return rsiArray;
}

export function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2) {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            upper.push(prices[i]);
            middle.push(prices[i]);
            lower.push(prices[i]);
            continue;
        }

        const slice = prices.slice(i - period + 1, i + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        middle.push(sma);
        upper.push(sma + multiplier * stdDev);
        lower.push(sma - multiplier * stdDev);
    }

    return { upper, middle, lower };
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
    const atr: number[] = new Array(candles.length).fill(0);
    if (candles.length < 2) return atr;

    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
        const c = candles[i];
        const prevClose = candles[i - 1].close;
        const trueRange = Math.max(
            c.high - c.low,
            Math.abs(c.high - prevClose),
            Math.abs(c.low - prevClose)
        );
        tr.push(trueRange);
    }

    let sum = 0;
    for (let i = 0; i < Math.min(period, tr.length); i++) sum += tr[i];
    atr[Math.min(period, tr.length) - 1] = sum / period;

    for (let i = period; i < tr.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    return atr;
}
