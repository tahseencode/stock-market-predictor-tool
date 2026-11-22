# 📈 Advanced Quantitative Stock Predictor AI (US & Indian Markets)

A production-grade quantitative stock prediction and analysis tool powered by **Ensemble Machine Learning** (`RandomForestRegressor` + `GradientBoostingRegressor`) and stationary technical indicators. It provides seamless native support for both **US Markets (NYSE, NASDAQ, S&P 500)** and **Indian Markets (NSE, BSE, NIFTY 50, SENSEX)**.

---

## ⚠️ Important Mathematical & Market Reality

> **Can any algorithm guarantee 100% price prediction accuracy?**
>
> **No.** In financial mathematics and economic theory (the *Efficient Market Hypothesis* and *Random Walk Theory*), stock price movements are stochastic processes influenced by unpredictable future events: unexpected earnings results, central bank interest rate decisions (RBI / US Federal Reserve), geopolitical shifts, macroeconomic shocks, and human sentiment.
>
> Any model that claims "100% accuracy" is either suffering from severe data leakage (e.g. predicting $P_t$ as $P_{t+1}$ on non-stationary price data) or overfitting historical noise.
>
> **What professional quantitative systems actually do:**
> - Rather than making single dogmatic guesses, institutional quantitative algorithms focus on **statistical edge** (55%–65% directional win rates), **expected price value**, **95% confidence corridors (trading ranges)**, and **asymmetric risk-to-reward ratios**.

---

## ✨ Features

- 🇮🇳 🇺🇸 **Dual-Market Intelligence**:
  - Automatically identifies whether an asset is listed on US exchanges (NYSE / NASDAQ) or Indian exchanges (NSE / BSE).
  - Dynamic currency formatting: Indian stocks display in **INR (₹)**; US stocks display in **USD ($)**.
  - Built-in aliases for top Indian equities (`Reliance`, `TCS`, `HDFC Bank`, `Infosys`, `Tata Motors`, `SBI`, etc.) and Indian indices (`Nifty 50`, `Bank Nifty`, `Sensex`), alongside US giants (`Apple`, `Tesla`, `Nvidia`, `Microsoft`, `S&P 500`).
- 🔬 **Stationary Quantitative Feature Engineering**:
  - Solves the classic non-stationary random-walk trap by predicting **next-day percentage return** ($\Delta y$) rather than raw lagging price.
  - Multi-factor technical indicators:
    - **Momentum**: 1-day, 3-day, 5-day, 10-day returns.
    - **Trend**: Distance ratios to 10, 20, 50, and 200-day Moving Averages.
    - **RSI (14-day)**: Relative Strength Index for overbought / oversold detection.
    - **MACD**: MACD line, signal line, and normalized histogram.
    - **Bollinger Bands**: %B position and bandwidth.
    - **Volatility & ATR**: 14-day Average True Range and 20-day annualized rolling volatility.
    - **Volume Dynamics**: Volume-to-20-day MA ratio.
- 🤖 **Ensemble Machine Learning Architecture**:
  - Blends `RandomForestRegressor` and `GradientBoostingRegressor`.
  - Evaluates on a strict chronological **time-series split** (last 20% out-of-sample).
- 📊 **Comprehensive Actionable Output**:
  - **Expected Next Close Price**: Most probable point estimate based on predicted return.
  - **95% Confidence Corridor**: Upper and lower trading boundary calculated via $1.96 \times \text{ATR}$.
  - **Directional Hit Rate (Win Rate %)**: Out-of-sample percentage of times the model correctly called the direction (UP vs DOWN).
  - **Mean Absolute Percentage Error (MAPE %)**: Actual price forecasting error margin.
  - **Key Support & Resistance Levels**: Quantitative pivot points, S1, R1, 20-day swing highs and lows.
  - **Overall Signal**: Strong Buy 🟢, Moderate Buy 🟢, Neutral 🟡, Moderate Sell 🔴, Strong Sell 🔴.
- 💬 **Conversational AI & CLI Modes**:
  - **One-Shot CLI**: Run direct stock analysis from the terminal without interactive prompts.
  - **Interactive Chatbot**: Converse with the bot and ask questions.
  - **Gemini Integration**: Supports Google Gemini (`google.genai` SDK or `google.generativeai`) to explain predictions conversationally, or runs seamlessly offline using the built-in quantitative analytics engine.

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd stock-market-predictor-tool

# Install dependencies
pip install yfinance pandas numpy scikit-learn requests google-genai
```

---

## 🚀 How to Run

### 1. Direct CLI Analysis (Instant Output)

Analyze any Indian or US stock instantly:

```bash
# Indian Stocks (auto-appends .NS and uses ₹ INR)
python ai.py --ticker "Reliance"
python ai.py --ticker "TCS"
python ai.py --ticker "Tata Motors"
python ai.py --ticker "HDFCBANK.NS"
python ai.py --ticker "NIFTY 50"

# US Stocks (uses $ USD)
python ai.py --ticker "Apple"
python ai.py --ticker "Tesla"
python ai.py --ticker "NVDA"
python ai.py --ticker "S&P 500"
```

### 2. Interactive Chatbot Mode

```bash
python ai.py
```

Example interactions:
```text
You: predict Reliance
AI: Analyzing 'Reliance' across Indian and US exchanges...
Found symbol: RELIANCE.NS. Training quantitative ensemble on historical market data...

======================================================================
📊 QUANTITATIVE PREDICTION & ANALYSIS REPORT
======================================================================
Company:       Reliance Industries Limited (RELIANCE.NS)
Sector / Ind:  Energy | Oil & Gas Refining & Marketing
Market / Curr: INR (₹)

💵 Current Price:           ₹1,377.50
🎯 Expected Next Close:     ₹1,378.22 (▲ +0.05%)
🚦 Overall Signal:          MODERATE BUY / SLIGHTLY BULLISH 🟢

🛡️ 95% Confidence Range:   ₹1,314.81  ───►  ₹1,441.62
📈 Directional Hit Rate:    54.1% (Out-of-sample Win Rate)
📉 Model Price Error (MAPE): 1.04%

[ TECHNICAL CONTEXT ]
• RSI (14-day):            98.2 (Overbought)
• Volatility (Annualized): 43.1%
• Daily True Range (ATR):  ₹32.35
• Key Support (S1):        ₹1,225.67 (20D Low: ₹1,152.50)
• Key Resistance (R1):     ₹1,456.17 (20D High: ₹1,383.00)
...
```

---

## ⚙️ Project Architecture

```text
stock-market-predictor-tool/
├── ai.py           # Core quantitative engine, ticker resolver, ML ensemble & chatbot
├── README.md       # Comprehensive documentation & mathematical disclosure
└── requirements.txt
```

---

## 🛡️ Disclaimer

This tool is created for educational, research, and algorithmic analysis purposes only. It does not constitute personal financial, investment, or trading advice. Always conduct your own due diligence and apply strict capital risk management.
