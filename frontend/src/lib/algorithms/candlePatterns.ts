export interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface DetectedPattern {
    pattern: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number; // 0 to 1
    description: string;
    recommendedAction: 'BUY' | 'SELL' | 'HOLD';
}

export function detectCandlePatterns(candles: Candle[], index: number): DetectedPattern | null {
    if (index < 2 || index >= candles.length) return null;

    const c = candles[index];
    const prev = candles[index - 1];
    const prev2 = candles[index - 2];

    const body = Math.abs(c.close - c.open);
    const upperShadow = c.high - Math.max(c.open, c.close);
    const lowerShadow = Math.min(c.open, c.close) - c.low;
    const totalRange = c.high - c.low;

    if (totalRange === 0) return null;

    const isGreen = c.close > c.open;
    const isRed = c.close < c.open;
    const prevIsRed = prev.close < prev.open;
    const prevIsGreen = prev.close > prev.open;

    // 1. Hammer Pattern (Bullish Reversal)
    // Long lower shadow >= 2x body, tiny upper shadow, at downtrend bottom
    if (lowerShadow >= 2 * body && upperShadow <= 0.2 * body && prevIsRed) {
        return {
            pattern: 'Hammer',
            sentiment: 'BULLISH',
            strength: 0.85,
            description: 'Long lower shadow indicates sellers were completely absorbed. Strong bottom rejection.',
            recommendedAction: 'BUY'
        };
    }

    // 2. Inverted Hammer (Bullish Reversal)
    if (upperShadow >= 2 * body && lowerShadow <= 0.2 * body && prevIsRed) {
        return {
            pattern: 'Inverted Hammer',
            sentiment: 'BULLISH',
            strength: 0.75,
            description: 'Buyers pushed price up aggressively; testing resistance at cycle bottom.',
            recommendedAction: 'BUY'
        };
    }

    // 3. Bullish Engulfing (Strong Bullish Reversal)
    // Green body completely covers previous red candle body
    if (isGreen && prevIsRed && c.open <= prev.close && c.close >= prev.open && body > Math.abs(prev.close - prev.open)) {
        return {
            pattern: 'Bullish Engulfing',
            sentiment: 'BULLISH',
            strength: 0.90,
            description: 'Bullish candle completely engulfs previous bear candle. High-conviction buying.',
            recommendedAction: 'BUY'
        };
    }

    // 4. Bearish Engulfing (Strong Bearish Reversal)
    // Red body completely covers previous green candle body
    if (isRed && prevIsGreen && c.open >= prev.close && c.close <= prev.open && body > Math.abs(prev.close - prev.open)) {
        return {
            pattern: 'Bearish Engulfing',
            sentiment: 'BEARISH',
            strength: 0.88,
            description: 'Bearish candle engulfs prior bull body. Institutional distribution / selling.',
            recommendedAction: 'SELL'
        };
    }

    // 5. Morning Star (3-Bar Bullish Reversal)
    // Large bear -> small star/doji gap -> strong bull candle closing above midpoint of bar 1
    const prevBody = Math.abs(prev.close - prev.open);
    const prev2Body = Math.abs(prev2.close - prev2.open);
    if (prev2.close < prev2.open && prevBody < prev2Body * 0.4 && isGreen && c.close > (prev2.open + prev2.close) / 2) {
        return {
            pattern: 'Morning Star',
            sentiment: 'BULLISH',
            strength: 0.92,
            description: 'Classic 3-candle reversal: bears exhausted at star, bulls seized full control.',
            recommendedAction: 'BUY'
        };
    }

    // 6. Evening Star (3-Bar Bearish Reversal)
    if (prev2.close > prev2.open && prevBody < prev2Body * 0.4 && isRed && c.close < (prev2.open + prev2.close) / 2) {
        return {
            pattern: 'Evening Star',
            sentiment: 'BEARISH',
            strength: 0.90,
            description: 'Exhaustion at peak followed by strong sell-off. Take profit or short.',
            recommendedAction: 'SELL'
        };
    }

    // 7. Doji (Indecision)
    if (body <= 0.1 * totalRange) {
        return {
            pattern: 'Doji',
            sentiment: 'NEUTRAL',
            strength: 0.60,
            description: 'Open and close virtually equal. Market equilibrium and indecision.',
            recommendedAction: 'HOLD'
        };
    }

    return null;
}
