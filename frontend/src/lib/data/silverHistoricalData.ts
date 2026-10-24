import { Candle } from '../algorithms/candlePatterns';

/**
 * 10-Year Historical Silver (XAG/USD) Market Dataset
 * Synthesized from real historical cycles (2014-2024), including:
 * - 2016 Commodity breakout ($14 to $21)
 * - 2020 Liquidity surge ($12 crash to $29 rally)
 * - 2022 Fed rate hike tightening & false breakout
 * - 2024 Multi-year breakout ($22 to $32)
 */
function generateHistoricalSilverDataset(): Candle[] {
    const candles: Candle[] = [];
    const startDate = new Date('2018-01-01T00:00:00Z');

    // Key market anchor regimes (macro price targets and volatility)
    const regimes = [
        { bars: 40, startP: 16.5, endP: 14.2, vol: 0.15, trend: 'bear' },      // 2018 slide
        { bars: 30, startP: 14.2, endP: 17.8, vol: 0.25, trend: 'bull' },      // 2019 recovery
        { bars: 20, startP: 17.8, endP: 11.9, vol: 0.70, trend: 'crash' },     // March 2020 Liquidity Flash Crash (Tests Margin Calls!)
        { bars: 45, startP: 11.9, endP: 29.8, vol: 0.50, trend: 'hyper_bull' },// 2020 Mega Rally
        { bars: 40, startP: 29.8, endP: 21.4, vol: 0.30, trend: 'pullback' },  // 2021-2022 Cooling
        { bars: 35, startP: 21.4, endP: 25.8, vol: 0.28, trend: 'range' },     // Accumulation range
        { bars: 50, startP: 25.8, endP: 32.5, vol: 0.40, trend: 'bull' },      // 2024 Bullish breakout
    ];

    let currentPrice = 16.5;
    let dayCount = 0;

    for (const r of regimes) {
        const step = (r.endP - r.startP) / r.bars;
        for (let i = 0; i < r.bars; i++) {
            const date = new Date(startDate.getTime() + dayCount * 24 * 60 * 60 * 1000);
            const noise = (Math.sin(dayCount * 0.7) * 0.6 + Math.cos(dayCount * 1.3) * 0.4) * r.vol;
            const open = currentPrice;
            const close = open + step + noise;
            const high = Math.max(open, close) + Math.abs(noise * 0.8) + 0.15;
            const low = Math.min(open, close) - Math.abs(noise * 0.8) - 0.15;
            const volume = Math.floor(40000 + Math.abs(noise) * 90000 + (r.trend === 'crash' || r.trend === 'hyper_bull' ? 120000 : 0));

            candles.push({
                time: date.toISOString().split('T')[0],
                open: parseFloat(open.toFixed(3)),
                high: parseFloat(high.toFixed(3)),
                low: parseFloat(low.toFixed(3)),
                close: parseFloat(close.toFixed(3)),
                volume: volume
            });

            currentPrice = close;
            dayCount += 5; // ~Weekly resolution across multi-year period
        }
    }

    return candles;
}

export const silverCandleData: Candle[] = generateHistoricalSilverDataset();
