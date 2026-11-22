# 📈 QuantPulse AI - Quantitative Stock Predictor (US & Indian Markets)

A production-grade quantitative stock prediction and analysis tool powered by **Ensemble Machine Learning** (`RandomForestRegressor` + `GradientBoostingRegressor`) and stationary technical indicators. Features a **modern interactive Web Dashboard (FastAPI + Chart.js)** with seamless native support for both **US Markets (NYSE, NASDAQ, S&P 500)** and **Indian Markets (NSE, BSE, NIFTY 50, SENSEX)**.

---

## 🖥️ Modern Web Frontend Dashboard

The tool includes a sleek, dark-mode institutional trading web application:
- **Interactive Multi-Market Search**: Auto-complete and auto-detection for Indian and US tickers.
- **Dynamic Charting (Chart.js)**: 90-day historical prices, 20-day SMA, 50-day SMA, and next-session predicted targets with forecast cones.
- **Visual Confidence Corridor**: Live 95% probability corridor based on $1.96 \times \text{ATR}$.
- **Technical Indicator Gauges**: RSI (14-day) with overbought/oversold meters, Volatility %, ATR, and Support/Resistance (S1, R1, 20-day extremes).
- **Embedded AI Financial Analyst**: Integrated chat drawer powered by Google Gemini (or local quantitative analyst) to ask questions, explain forecasts, and compute dynamic stop-loss levels.

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

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/tahseencode/stock-market-predictor-tool.git
cd stock-market-predictor-tool

# Install dependencies
pip install -r requirements.txt
```

---

## 🚀 How to Run

### 1. Launch the Web Frontend Dashboard (Recommended)

Start the local web server:

```bash
python app.py
```

Then open your browser at **[http://localhost:8000](http://localhost:8000)**.

---

### 2. Direct CLI Analysis (Instant Output)

Analyze any Indian or US stock directly from your terminal:

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

---

### 3. Interactive Terminal Chatbot Mode

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
======================================================================
```

---

## ⚙️ Project Architecture

```text
stock-market-predictor-tool/
├── app.py              # FastAPI server & REST API endpoints (/api/predict, /api/chat)
├── ai.py               # Core quantitative engine, ticker resolver, ML ensemble & chatbot
├── requirements.txt    # Python dependencies
├── README.md           # Documentation & mathematical disclosure
└── static/
    ├── index.html      # Responsive single-page web dashboard
    ├── style.css       # Dark-mode institutional trading UI theme
    └── app.js          # Chart.js integration, search autocomplete & chat drawer
```

---

## 🛡️ Disclaimer

This tool is created for educational, research, and algorithmic analysis purposes only. It does not constitute personal financial, investment, or trading advice. Always conduct your own due diligence and apply strict capital risk management.
