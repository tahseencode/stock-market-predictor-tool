# 📈 Stock Prediction AI Chatbot

A command-line chatbot that predicts the **next closing price** of a stock using a Random Forest model trained on 5 years of historical data from Yahoo Finance. Optionally, it uses **Google Gemini** to explain predictions in a friendly, conversational way.

> ⚠️ **Disclaimer:** This project is for learning and experimentation only. It is **not** financial advice. Do not make real investment decisions based on its output.

---

## ✨ Features

- 🔍 **Company name → ticker lookup**: type "Apple" or "Tesla" instead of `AAPL` / `TSLA` (uses Yahoo Finance search).
- 🤖 **ML prediction**: `RandomForestRegressor` trained on 5 years of daily closing prices.
- 📊 **Model score**: reports R² on a held-out test set (time-ordered split, no shuffling).
- 🏢 **Company context**: shows company name, sector, industry, and current price.
- 💬 **Two modes**
  - **Gemini mode**: human-like conversation powered by Google Gemini (free API key).
  - **Basic mode**: rule-based replies, no API key required.

---

## 🧠 How It Works

1. **Input parsing**: a regex extracts the company name from messages like *"predict Apple"* or *"price of Tesla"*.
2. **Ticker resolution**: `get_valid_ticker()` queries Yahoo Finance search and verifies the symbol returns data. Falls back to a cleaned-up version of the input.
3. **Data download**: `yfinance` fetches 5 years of daily OHLCV data.
4. **Feature engineering**: the previous day's close (`Prev_Close`) is the single feature; the current close is the target.
5. **Training**: 80/20 chronological train/test split, then `RandomForestRegressor(n_estimators=100)`.
6. **Prediction**: the latest close is fed into the model to predict the next close.
7. **Response**: results are either passed to Gemini to narrate, or printed by the basic fallback.

---

## 🛠️ Tech Stack

| Purpose | Library |
|---|---|
| Market data | `yfinance` |
| Data handling | `pandas` |
| Machine learning | `scikit-learn` |
| HTTP requests | `requests` |
| Conversational AI (optional) | `google-generativeai` |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- (Optional) A free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# 2. (Recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install yfinance pandas scikit-learn requests

# 4. (Optional) Install Gemini support
pip install google-generativeai
```

Or use a `requirements.txt`:

```text
yfinance
pandas
scikit-learn
requests
google-generativeai
```

```bash
pip install -r requirements.txt
```

### Configure Gemini (optional)

Set your key as an environment variable:

```bash
export GEMINI_API_KEY="your_api_key_here"      # macOS / Linux
set GEMINI_API_KEY=your_api_key_here           # Windows (cmd)
$env:GEMINI_API_KEY="your_api_key_here"        # Windows (PowerShell)
```

Or just paste it when the program asks. Press **Enter** to skip and use the basic version.

### Run

```bash
python main.py
```

*(Replace `main.py` with your script's filename.)*

---

## 💬 Example Usage

```text
AI: Hello! I am your Stock Prediction AI. You can ask me to predict a stock's price, or just say hi.

You: predict Apple
AI: Let me look into 'apple' for you...
Searching for symbol for: apple...
Found symbol: AAPL
AI: Based on my Random Forest model, the predicted next closing price is $xxx.xx with xx.xx% accuracy.

You: what is your accuracy?
AI: On my last prediction for AAPL, my model achieved an accuracy score of xx.xx%...

You: bye
AI: Goodbye! Happy trading!
```

### Things you can say

- `predict Apple`
- `what is the price of Tesla?`
- `forecast Microsoft stock`
- `what is your accuracy?`
- `quit` / `exit` / `bye`

---

## 📁 Project Structure

```text
.
├── main.py          # Chatbot, ticker search, and prediction logic
├── requirements.txt # Python dependencies
└── README.md
```

### Key functions

| Function | Description |
|---|---|
| `get_valid_ticker(ticker)` | Searches Yahoo Finance for a symbol and validates it |
| `predict_stock(ticker)` | Downloads data, trains the model, returns prediction + metadata |
| `chat()` | Main interactive loop (Gemini mode and basic mode) |

---

## ⚠️ Limitations

Being upfront about what this model can and can't do:

- **Single feature**: the model only sees yesterday's close, so it learns little beyond "tomorrow ≈ today". No volume, indicators, news, or market context.
- **"Accuracy" is R², not prediction accuracy**: because prices are highly autocorrelated, R² can look high even for a trivial model. It does **not** mean the prediction is right X% of the time.
- **Random Forests can't extrapolate**: if a stock trades above its historical price range, predictions are capped near the highest prices seen in training.
- **Markets are noisy**: no model based on price history alone reliably predicts the market.
- **Name matching is heuristic**: the regex and Yahoo search may pick the wrong ticker for ambiguous names.
- **Library changes**: recent `yfinance` versions can return multi-level columns, and `google-generativeai` and the `gemini-1.5-flash` model are being phased out. You may need to update them.

---

## 🔮 Ideas for Improvement

- Add technical indicators (moving averages, RSI, MACD) and volume as features
- Predict **returns** (percent change) instead of raw price
- Try time-series models (ARIMA, LSTM, XGBoost) and compare against a naive baseline
- Use walk-forward validation, and report MAE/RMSE and directional accuracy
- Add price charts (matplotlib / plotly)
- Build a web UI with Streamlit or Flask
- Migrate to the newer `google-genai` SDK and a current Gemini model

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

## 🙏 Acknowledgements

- [yfinance](https://github.com/ranaroussi/yfinance) for market data
- [scikit-learn](https://scikit-learn.org/) for machine learning
- [Google Gemini](https://ai.google.dev/) for conversational responses
