# Crypto Market Peak Assessment (BTC, ETH, SOL)

## Context & Cycle Awareness

You are analyzing whether the crypto market has reached a **cycle peak** - not just short-term tops, but the major bull market peak that precedes multi-year bear markets.

**Critical Context**: Crypto bull markets typically last 12-18 months from major bottoms and involve 5-20x price increases from cycle lows. Peak conditions require **extreme euphoria, mainstream adoption peaks, and multiple confirming indicators hitting simultaneously**.

## Inputs

- **Timestamp**: {{timestamp}}
- **Data Sources**: Bull Market Peak Indicators, BTC/ETH/SOL 3-year price history

### Bull Market Peak Indicators

```json
{{bull_market_peak_raw}}
```

### BTC Price Data

**24H Recent Minutes**: {{bitcoin_recent_minutes_24h}}

**~900 Daily Closes (3+ years)**: {{bitcoin_daily_900d_close}}

### ETH Price Data

**24H Recent Minutes**: {{ethereum_recent_minutes_24h}}

**~900 Daily Closes (3+ years)**: {{ethereum_daily_900d_close}}

### SOL Price Data

**24H Recent Minutes**: {{solana_recent_minutes_24h}}

**~900 Daily Closes (3+ years)**: {{solana_daily_900d_close}}

## Analysis Framework

### 1. Cycle Position Assessment (Most Important)

Using the 3-year price data, determine where we are in the cycle:

- **Bear Market Bottom**: Major lows, 80-90% down from previous peaks
- **Early Bull Market**: 2-5x from major lows, building momentum
- **Mid Bull Market**: 5-10x from major lows, sustained uptrend
- **Late Bull Market**: 10-20x from major lows, parabolic moves
- **Peak/Distribution**: Extreme valuations, euphoria, multiple peak indicators

### 2. Peak Indicator Analysis

**Critical**: Peak indicators are designed to trigger only at true cycle peaks. If few/none are hitting, we're likely not at peak.

For each indicator:

- Is it actually triggered (hit_status = true)?
- How far above/below threshold is the current value?
- What does this specific indicator measure and why does it matter for peaks?

### 3. Price Structure Analysis

- **Long-term trend**: Are we in sustained multi-year uptrend from major lows?
- **Recent behavior**: Normal bull market volatility vs distribution/exhaustion patterns
- **Cross-asset confirmation**: Do BTC, ETH, SOL show similar cycle positioning?

## Scoring Guidelines (Be Extremely Conservative)

### 1-9: Far From Peak (Default for Early/Mid Bull)

- **Cycle Position**: Early to mid bull market (2-10x from major lows)
- **Peak Indicators**: 0-2 indicators triggered, most well below thresholds
- **Price Action**: Healthy bull market corrections, no distribution patterns
- **Market Sentiment**: Building optimism but not euphoric

### 10-19: Early Warning Signs

- **Cycle Position**: Mid to late bull market (8-15x from major lows)
- **Peak Indicators**: 2-4 indicators triggered, some approaching thresholds
- **Price Action**: Some concerning patterns but still trending up
- **Market Sentiment**: High optimism, some speculative excess

### 20-34: Elevated Concerns

- **Cycle Position**: Late bull market (12-20x from major lows)
- **Peak Indicators**: 4-6 indicators triggered, multiple above thresholds
- **Price Action**: Parabolic moves, increased volatility
- **Market Sentiment**: Widespread euphoria beginning

### 35-49: Peak Formation Possible

- **Cycle Position**: Potential peak zone (15-25x from major lows)
- **Peak Indicators**: 6-8 indicators triggered, most significantly above thresholds
- **Price Action**: Clear distribution patterns, divergences
- **Market Sentiment**: Extreme euphoria, mainstream FOMO

### 50-69: Peak Likely

- **Cycle Position**: Clear peak zone valuations
- **Peak Indicators**: 8+ indicators triggered, extreme readings
- **Price Action**: Failed breakouts, distribution, volume divergence
- **Market Sentiment**: Peak euphoria, everyone bullish

### 70-84: Peak Confirmed

- **Peak Indicators**: Nearly all indicators triggered with extreme readings
- **Price Action**: Clear reversal patterns, failed rallies
- **Market Sentiment**: Peak euphoria followed by first doubt

### 85-100: Peak Behind Us

- **Peak Indicators**: All major indicators triggered, extreme historical readings
- **Price Action**: Clear bear market beginning, sustained selling
- **Market Sentiment**: Euphoria turning to fear

## Language and Analysis Guidelines

**Analysis Field Requirements:**

- Write naturally about current market conditions without referencing technical data structures
- Focus on what makes the current moment unique in the cycle context
- Use varied, descriptive language that reflects actual market positioning
- Avoid template phrases about "indicators" or "thresholds" - explain what conditions actually mean
- Describe the market story: where we are in the cycle and why that matters

**Reasoning Field Approach:**

- Provide substantive assessment of cycle positioning using price history
- Explain which peak conditions are present or absent and their significance
- Address cross-asset behavior and what it reveals about market maturity
- Consider historical context and cycle parallels
- Focus on market reality rather than mechanical indicator checks

**Key Factors Focus:**

- Identify the most important elements driving your assessment
- Use specific, descriptive factors rather than generic indicator references
- Emphasize market positioning and cycle context

## Output Requirements

```json
{
  "score": 1-100,
  "analysis": "Natural narrative explaining current cycle position and peak assessment. Write as if describing the market situation to someone familiar with crypto cycles but unfamiliar with recent developments. Focus on market reality and cycle context rather than indicator mechanics.",
  "reasoning": "Comprehensive assessment covering cycle positioning, market conditions, peak evidence, and historical context. Provide substantive analysis that explains your scoring rationale through market understanding rather than checklist evaluation.",
  "key_factors": ["3-6 most decisive factors using descriptive market language"]
}
```

## Critical Reminders

1. **Cycle peaks are rare**: They happen every 3-4 years, not every few months
2. **Peak indicators are designed for extremes**: If they're not hitting, we're not at peak
3. **Price context matters**: Compare current prices to 3-year history, not just recent moves
4. **Be conservative**: Better to underestimate peak risk than create false alarms
5. **Focus on evidence**: Base score on actual data, not market sentiment or media hype

Only output valid JSON. No additional text.
