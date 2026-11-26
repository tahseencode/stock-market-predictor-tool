# 📈 QuantPulse AI - Quantitative Stock Predictor (US & Indian Markets)

A production-grade quantitative stock prediction and analysis platform powered by **Ensemble Machine Learning** (`RandomForestRegressor` + `GradientBoostingRegressor`) and stationary multi-factor technical indicators. Features a **modern interactive Web Dashboard (FastAPI + Chart.js)** with seamless native support for both **US Markets (NYSE, NASDAQ, S&P 500)** and **Indian Markets (NSE, BSE, NIFTY 50, SENSEX)**.

---

## 🖥️ Modern Web Frontend Dashboard

The tool includes a sleek, dark-mode institutional trading web application:
- **Interactive Multi-Market Search**: Auto-complete and auto-detection for Indian and US tickers.
- **Multi-Timeframe Charting (Chart.js)**: Toggle between `1M`, `3M`, `6M`, `1Y`, and `ALL` historical sessions with SMA 20, SMA 50, underlaid volume bars, and next-session forecast targets.
- **Dual Forecast Horizons**: Generates both a **1-Day Next Close Target** and a **5-Day Swing Target** with 95% Confidence Corridors ($1.96 \times \text{ATR}$).
- **Key Fundamentals & Valuation**: Live Market Cap (₹ Lakh Cr / $ Trillion), P/E Ratio, 52-Week Range Bar with dynamic price position slider, Beta, and Dividend Yield.
- **Technical Indicator Matrix**: RSI (14-day) with overbought/oversold meters, Stochastic Oscillator (%K, %D), Daily ATR, Volatility %, and Pivot Point Ladder (R2, R1, Pivot, S1, S2).
- **Consensus Indicator Score**: Visual tally of bullish, neutral, and bearish signals across Moving Averages and Oscillators.
- **High-Speed In-Memory Caching**: 5-minute TTL cache ensures sub-5ms instant responses on repeat queries.
- **Embedded AI Financial Analyst**: Integrated conversational drawer powered by Google Gemini (or local quantitative analyst) to ask questions, analyze valuations, explain forecasts, and compute dynamic stop-loss levels.

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
python ai.py --ticker "Tata Steel"
python ai.py --ticker "BEL"
python ai.py --ticker "NIFTY 50"

# US Stocks (uses $ USD)
python ai.py --ticker "Apple"
python ai.py --ticker "Tesla"
python ai.py --ticker "NVDA"
python ai.py --ticker "BRK.B"
python ai.py --ticker "S&P 500"
```

---

### 3. Interactive Terminal Chatbot Mode

```bash
python ai.py
```

---

## ⚙️ Project Architecture

```text
stock-market-predictor-tool/
├── app.py              # FastAPI server, in-memory caching & REST API (/api/predict, /api/chat, /api/search)
├── ai.py               # Core quantitative engine, stationary feature engineering, ensemble ML & fundamentals
├── requirements.txt    # Python dependencies
├── README.md           # Documentation & mathematical disclosure
└── static/
    ├── index.html      # Responsive single-page web dashboard (Tailwind + Chart.js)
    ├── style.css       # Dark-mode institutional trading UI theme
    └── app.js          # Multi-timeframe chart, autocomplete, fundamentals & AI chat drawer
```

---

## 🛡️ Disclaimer

This tool is created for educational, research, and algorithmic analysis purposes only. It does not constitute personal financial, investment, or trading advice. Always conduct your own due diligence and apply strict capital risk management.
