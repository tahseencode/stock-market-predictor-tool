"""
Advanced Quantitative Stock Predictor AI
Supports US Markets (NYSE, NASDAQ, S&P 500) and Indian Markets (NSE, BSE, NIFTY 50, SENSEX).

Features:
- Dual-market symbol resolution with automatic currency detection (₹ INR / $ USD)
- Multi-feature quantitative technical analysis (RSI, MACD, Bollinger Bands, ATR, SMAs)
- Ensemble Machine Learning (Random Forest + Gradient Boosting Regressor)
- Return-based stationary modeling (avoids non-stationary autoregressive traps)
- Expected Price, Directional Hit Rate (Win %), 95% Confidence Corridor, Support & Resistance
- Integration with Google Gemini (via google.genai or google.generativeai) + Built-in offline analyst
"""

import sys
import os
import re
import argparse
import warnings
from typing import Dict, Any, Optional, Tuple

import numpy as np
import pandas as pd
import requests
import yfinance as yf
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

warnings.filterwarnings("ignore")

# ---------------------------------------------------------
# Known Market Aliases (Indian & US Equities / Indices)
# ---------------------------------------------------------
POPULAR_ALIASES = {
    # Indian Indices
    "nifty": "^NSEI",
    "nifty 50": "^NSEI",
    "nifty50": "^NSEI",
    "bank nifty": "^NSEBANK",
    "banknifty": "^NSEBANK",
    "sensex": "^BSESN",
    "bse sensex": "^BSESN",
    
    # Top Indian Equities (NSE)
    "reliance": "RELIANCE.NS",
    "reliance industries": "RELIANCE.NS",
    "tcs": "TCS.NS",
    "tata consultancy": "TCS.NS",
    "tata consultancy services": "TCS.NS",
    "hdfc": "HDFCBANK.NS",
    "hdfc bank": "HDFCBANK.NS",
    "infosys": "INFY.NS",
    "infy": "INFY.NS",
    "icici": "ICICIBANK.NS",
    "icici bank": "ICICIBANK.NS",
    "sbi": "SBIN.NS",
    "state bank of india": "SBIN.NS",
    "tata motors": "TATAMOTORS.NS",
    "tatamotors": "TATAMOTORS.NS",
    "bharti airtel": "BHARTIARTL.NS",
    "airtel": "BHARTIARTL.NS",
    "itc": "ITC.NS",
    "hindustan unilever": "HINDUNILVR.NS",
    "hul": "HINDUNILVR.NS",
    "l&t": "LT.NS",
    "larsen": "LT.NS",
    "larsen & toubro": "LT.NS",
    "kotak": "KOTAKBANK.NS",
    "kotak bank": "KOTAKBANK.NS",
    "axis bank": "AXISBANK.NS",
    "axis": "AXISBANK.NS",
    "bajaj finance": "BAJFINANCE.NS",
    "maruti": "MARUTI.NS",
    "maruti suzuki": "MARUTI.NS",
    "wipro": "WIPRO.NS",
    "titan": "TITAN.NS",
    "sun pharma": "SUNPHARMA.NS",
    "asian paints": "ASIANPAINT.NS",
    "adani enterprises": "ADANIENT.NS",
    "adani ports": "ADANIPORTS.NS",
    "zomato": "ZOMATO.NS",
    
    # US Indices
    "sp500": "^GSPC",
    "s&p 500": "^GSPC",
    "s&p": "^GSPC",
    "nasdaq": "^IXIC",
    "dow": "^DJI",
    "dow jones": "^DJI",
    
    # Top US Equities
    "apple": "AAPL",
    "microsoft": "MSFT",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "amazon": "AMZN",
    "nvidia": "NVDA",
    "tesla": "TSLA",
    "meta": "META",
    "facebook": "META",
    "netflix": "NFLX",
    "amd": "AMD",
    "berkshire": "BRK-B",
    "jpmorgan": "JPM",
    "visa": "V",
    "walmart": "WMT"
}

def get_currency_symbol(currency_code: str, ticker: str) -> str:
    """Returns currency symbol based on currency code or ticker."""
    if ".NS" in ticker or ".BO" in ticker or currency_code == "INR":
        return "₹"
    elif currency_code == "USD" or not currency_code:
        return "$"
    elif currency_code == "EUR":
        return "€"
    elif currency_code == "GBP":
        return "£"
    elif currency_code == "JPY":
        return "¥"
    return f"{currency_code} "

def resolve_ticker(query: str, preferred_market: Optional[str] = None) -> Optional[str]:
    """
    Intelligently resolves company names or symbols to a validated Yahoo Finance ticker.
    Handles US and Indian markets with priority awareness.
    """
    cleaned = query.strip().lower()
    
    # Direct alias match
    if cleaned in POPULAR_ALIASES:
        return POPULAR_ALIASES[cleaned]
    
    # Remove common prefix/suffix words
    cleaned_norm = re.sub(r'\b(stock|share|price|predict|forecast|quote|ltd|limited|inc|corp)\b', '', cleaned).strip()
    if cleaned_norm in POPULAR_ALIASES:
        return POPULAR_ALIASES[cleaned_norm]
        
    # If the user already provided an uppercase ticker with or without exchange suffix
    raw_upper = query.strip().upper()
    if re.match(r'^[A-Z0-9\.\-\^]{1,12}$', raw_upper):
        try:
            t = yf.Ticker(raw_upper)
            hist = t.history(period="3d")
            if not hist.empty:
                return raw_upper
        except Exception:
            pass

    # If user wants Indian market specifically or company likely Indian
    is_indian_intent = (
        preferred_market == "in" or
        "india" in cleaned or
        "nse" in cleaned or
        "bse" in cleaned
    )
    
    # Query Yahoo Finance search API
    try:
        search_q = cleaned_norm if cleaned_norm else cleaned
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={requests.utils.quote(search_q)}&quotesCount=10"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            quotes = data.get('quotes', [])
            
            if is_indian_intent:
                # Prioritize Indian listings (.NS or .BO)
                for q in quotes:
                    sym = q.get('symbol', '')
                    if sym.endswith('.NS') or sym.endswith('.BO'):
                        if not yf.Ticker(sym).history(period="3d").empty:
                            return sym

            # General match: check top returned symbols
            for q in quotes:
                sym = q.get('symbol', '')
                if sym:
                    try:
                        if not yf.Ticker(sym).history(period="3d").empty:
                            return sym
                    except Exception:
                        continue
    except Exception as e:
        pass

    # Try common Indian suffixes as fallback if looks like an Indian stock name
    for suffix in [".NS", ".BO"]:
        test_sym = raw_upper + suffix
        try:
            if not yf.Ticker(test_sym).history(period="3d").empty:
                return test_sym
        except Exception:
            pass
            
    # Try raw ticker directly
    try:
        if not yf.Ticker(raw_upper).history(period="3d").empty:
            return raw_upper
    except Exception:
        pass

    return None

def calculate_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes professional quantitative indicators.
    All features are stationary or relative to prevent non-stationary drift.
    """
    df = df.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
        
    close = df['Close']
    high = df['High']
    low = df['Low']
    volume = df['Volume']
    
    # 1. Price Momentum / Returns (Stationary)
    df['ret_1d'] = close.pct_change(1)
    df['ret_3d'] = close.pct_change(3)
    df['ret_5d'] = close.pct_change(5)
    df['ret_10d'] = close.pct_change(10)
    
    # 2. Moving Average Distance Ratios (Stationary)
    sma_10 = close.rolling(10).mean()
    sma_20 = close.rolling(20).mean()
    sma_50 = close.rolling(50).mean()
    sma_200 = close.rolling(200).mean()
    
    df['sma_10_ratio'] = (close / sma_10) - 1.0
    df['sma_20_ratio'] = (close / sma_20) - 1.0
    df['sma_50_ratio'] = (close / sma_50) - 1.0
    df['sma_200_ratio'] = (close / sma_200) - 1.0
    
    # 3. Relative Strength Index (RSI - 14)
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / (loss + 1e-9)
    df['rsi_14'] = 100.0 - (100.0 / (1.0 + rs))
    
    # 4. Moving Average Convergence Divergence (MACD)
    ema_12 = close.ewm(span=12, adjust=False).mean()
    ema_26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema_12 - ema_26
    macd_signal = macd_line.ewm(span=9, adjust=False).mean()
    df['macd_line_ratio'] = macd_line / close
    df['macd_signal_ratio'] = macd_signal / close
    df['macd_hist_ratio'] = (macd_line - macd_signal) / close
    
    # 5. Bollinger Bands (20-day, 2 std)
    std_20 = close.rolling(20).std()
    bb_upper = sma_20 + (2.0 * std_20)
    bb_lower = sma_20 - (2.0 * std_20)
    df['bb_pct_b'] = (close - bb_lower) / ((bb_upper - bb_lower) + 1e-9)
    df['bb_bandwidth'] = (bb_upper - bb_lower) / (sma_20 + 1e-9)
    
    # 6. Average True Range (ATR - 14) normalized by price
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(14).mean()
    df['atr_raw'] = atr
    df['atr_ratio'] = atr / close
    
    # 7. Volatility (Annualized 20-day rolling std of returns)
    df['vol_20'] = df['ret_1d'].rolling(20).std() * np.sqrt(252)
    
    # 8. Volume Dynamics
    vol_sma20 = volume.rolling(20).mean()
    df['volume_ratio'] = volume / (vol_sma20 + 1e-9)
    
    # 9. Daily Intraday Spread
    df['intraday_spread'] = (high - low) / close
    
    # Target: Next Day Return (Close_{t+1} / Close_t - 1)
    df['target_return'] = df['ret_1d'].shift(-1)
    
    return df

def predict_stock(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Downloads historical data, trains an ensemble model (RandomForest + GradientBoosting),
    and computes expected price, directional hit rate, confidence intervals, and key levels.
    """
    try:
        ticker_obj = yf.Ticker(ticker)
        fast_info = getattr(ticker_obj, 'fast_info', {})
        currency_code = fast_info.get('currency', 'USD')
        currency_sym = get_currency_symbol(currency_code, ticker)
        
        # Meta info
        company_name = ticker
        sector = "General Market"
        industry = "Equity"
        try:
            info = ticker_obj.info
            company_name = info.get('longName', info.get('shortName', ticker))
            sector = info.get('sector', sector)
            industry = info.get('industry', industry)
        except Exception:
            pass
            
        # Download 3 years of daily historical data
        hist = ticker_obj.history(period="3y", interval="1d")
        if hist.empty or len(hist) < 220:
            # Fallback to yf.download
            hist = yf.download(ticker, period="3y", interval="1d", progress=False)
            if hist.empty or len(hist) < 150:
                return None
                
        df = calculate_technical_indicators(hist)
        
        feature_cols = [
            'ret_1d', 'ret_3d', 'ret_5d', 'ret_10d',
            'sma_10_ratio', 'sma_20_ratio', 'sma_50_ratio', 'sma_200_ratio',
            'rsi_14', 'macd_line_ratio', 'macd_signal_ratio', 'macd_hist_ratio',
            'bb_pct_b', 'bb_bandwidth', 'atr_ratio', 'vol_20',
            'volume_ratio', 'intraday_spread'
        ]
        
        clean_df = df.dropna(subset=feature_cols + ['target_return']).copy()
        if len(clean_df) < 100:
            return None
            
        X = clean_df[feature_cols]
        y = clean_df['target_return']
        
        # 80/20 chronological time-ordered train/test split
        split_idx = int(len(clean_df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        # Ensemble models
        rf = RandomForestRegressor(
            n_estimators=150,
            max_depth=5,
            min_samples_leaf=4,
            random_state=42,
            n_jobs=-1
        )
        gbr = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.03,
            max_depth=3,
            subsample=0.8,
            random_state=42
        )
        
        rf.fit(X_train, y_train)
        gbr.fit(X_train, y_train)
        
        # Out-of-sample evaluation
        test_pred_rf = rf.predict(X_test)
        test_pred_gbr = gbr.predict(X_test)
        test_pred = 0.5 * test_pred_rf + 0.5 * test_pred_gbr
        
        # Directional Hit Rate (Win rate on test set: predicting UP/DOWN accurately)
        actual_direction = np.sign(y_test)
        predicted_direction = np.sign(test_pred)
        correct_directions = (actual_direction == predicted_direction).sum()
        directional_hit_rate = (correct_directions / len(y_test)) * 100.0
        
        # Mean Absolute Percentage Error (MAPE) on test prices
        test_actual_prices = clean_df['Close'].iloc[split_idx:].values
        test_prev_prices = test_actual_prices / (1.0 + y_test.values)
        test_predicted_prices = test_prev_prices * (1.0 + test_pred)
        mape = np.mean(np.abs((test_actual_prices - test_predicted_prices) / test_actual_prices)) * 100.0
        
        # Predict Next Day Return from latest features
        latest_features_df = df[feature_cols].iloc[-1:]
        next_ret_rf = rf.predict(latest_features_df)[0]
        next_ret_gbr = gbr.predict(latest_features_df)[0]
        pred_return = 0.5 * next_ret_rf + 0.5 * next_ret_gbr
        
        current_close = float(df['Close'].iloc[-1])
        predicted_close = current_close * (1.0 + pred_return)
        
        # Technical metrics
        latest_rsi = float(df['rsi_14'].iloc[-1])
        latest_atr = float(df['atr_raw'].iloc[-1])
        latest_vol = float(df['vol_20'].iloc[-1]) * 100.0
        latest_macd_hist = float(df['macd_hist_ratio'].iloc[-1])
        
        # 95% Confidence Corridor (Expected Trading Range based on ATR / Volatility)
        range_margin = 1.96 * latest_atr
        range_lower = max(0.01, predicted_close - range_margin)
        range_upper = predicted_close + range_margin
        
        # Support and Resistance
        recent_20 = df['Close'].iloc[-20:]
        recent_high = float(df['High'].iloc[-20:].max())
        recent_low = float(df['Low'].iloc[-20:].min())
        pivot = (recent_high + recent_low + current_close) / 3.0
        r1 = (2.0 * pivot) - recent_low
        s1 = (2.0 * pivot) - recent_high
        
        # Chart Data for Frontend (last 90 trading days)
        chart_slice = df.iloc[-90:].copy()
        dates_list = [d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)[:10] for d in chart_slice.index]
        close_list = [round(float(p), 2) for p in chart_slice['Close']]
        sma20_series = df['Close'].rolling(20).mean().iloc[-90:]
        sma50_series = df['Close'].rolling(50).mean().iloc[-90:]
        sma20_list = [round(float(p), 2) if not np.isnan(p) else None for p in sma20_series]
        sma50_list = [round(float(p), 2) if not np.isnan(p) else None for p in sma50_series]
        volume_list = [int(v) if not np.isnan(v) else 0 for v in chart_slice['Volume']]
        
        # Next projected date (1 business day after last date)
        try:
            last_dt = chart_slice.index[-1]
            next_dt = last_dt + pd.tseries.offsets.BDay(1)
            next_date_str = next_dt.strftime('%Y-%m-%d')
        except Exception:
            next_date_str = "Next Session"
            
        chart_data = {
            'dates': dates_list,
            'prices': close_list,
            'sma20': sma20_list,
            'sma50': sma50_list,
            'volume': volume_list,
            'next_date': next_date_str,
            'predicted_price': round(predicted_close, 2),
            'range_lower': round(range_lower, 2),
            'range_upper': round(range_upper, 2)
        }
        
        # Qualitative Signal Analysis
        bullish_score = 0
        if pred_return > 0.001:
            bullish_score += 2
        elif pred_return < -0.001:
            bullish_score -= 2
            
        if latest_rsi < 35:
            bullish_score += 1  # oversold bounce candidate
        elif latest_rsi > 70:
            bullish_score -= 1  # overbought risk
            
        if latest_macd_hist > 0:
            bullish_score += 1
        else:
            bullish_score -= 1
            
        if current_close > df['Close'].rolling(50).mean().iloc[-1]:
            bullish_score += 1
        else:
            bullish_score -= 1
            
        if bullish_score >= 3:
            signal = "STRONG BUY / BULLISH 🟢"
        elif bullish_score >= 1:
            signal = "MODERATE BUY / SLIGHTLY BULLISH 🟢"
        elif bullish_score <= -3:
            signal = "STRONG SELL / BEARISH 🔴"
        elif bullish_score <= -1:
            signal = "MODERATE SELL / SLIGHTLY BEARISH 🔴"
        else:
            signal = "NEUTRAL / CONSOLIDATION 🟡"
            
        return {
            'ticker': ticker,
            'company_name': company_name,
            'sector': sector,
            'industry': industry,
            'currency_code': currency_code,
            'currency_sym': currency_sym,
            'current_price': current_close,
            'predicted_price': predicted_close,
            'predicted_return_pct': pred_return * 100.0,
            'signal': signal,
            'directional_hit_rate': directional_hit_rate,
            'mape': mape,
            'confidence_range_lower': range_lower,
            'confidence_range_upper': range_upper,
            'atr': latest_atr,
            'rsi': latest_rsi,
            'annualized_volatility_pct': latest_vol,
            'support_s1': s1,
            'resistance_r1': r1,
            'swing_high_20d': recent_high,
            'swing_low_20d': recent_low,
            'chart_data': chart_data
        }
        
    except Exception as e:
        return None

def format_prediction_report(res: Dict[str, Any]) -> str:
    """Creates a formatted ASCII analysis card for terminal output."""
    cs = res['currency_sym']
    arrow = "▲" if res['predicted_return_pct'] >= 0 else "▼"
    sign = "+" if res['predicted_return_pct'] >= 0 else ""
    
    report = f"""
{'='*70}
📊 QUANTITATIVE PREDICTION & ANALYSIS REPORT
{'='*70}
Company:       {res['company_name']} ({res['ticker']})
Sector / Ind:  {res['sector']} | {res['industry']}
Market / Curr: {res['currency_code']} ({cs})

💵 Current Price:           {cs}{res['current_price']:,.2f}
🎯 Expected Next Close:     {cs}{res['predicted_price']:,.2f} ({arrow} {sign}{res['predicted_return_pct']:.2f}%)
🚦 Overall Signal:          {res['signal']}

🛡️ 95% Confidence Range:   {cs}{res['confidence_range_lower']:,.2f}  ───►  {cs}{res['confidence_range_upper']:,.2f}
📈 Directional Hit Rate:    {res['directional_hit_rate']:.1f}% (Out-of-sample Win Rate)
📉 Model Price Error (MAPE): {res['mape']:.2f}%

[ TECHNICAL CONTEXT ]
• RSI (14-day):            {res['rsi']:.1f} ({'Oversold' if res['rsi'] < 30 else 'Overbought' if res['rsi'] > 70 else 'Neutral'})
• Volatility (Annualized): {res['annualized_volatility_pct']:.1f}%
• Daily True Range (ATR):  {cs}{res['atr']:,.2f}
• Key Support (S1):        {cs}{res['support_s1']:,.2f} (20D Low: {cs}{res['swing_low_20d']:,.2f})
• Key Resistance (R1):     {cs}{res['resistance_r1']:,.2f} (20D High: {cs}{res['swing_high_20d']:,.2f})

ℹ️ MATHEMATICAL & MARKET REALITY:
No algorithm can guarantee 100% price accuracy due to market stochasticity,
sudden macro events, and news flow. This tool uses statistical ensemble ML
(Random Forest + Gradient Boosting) to compute high-probability expected returns,
risk bands, and directional edges.
{'='*70}
"""
    return report

def init_gemini():
    """Initializes Google Gemini via google.genai or fallback to google.generativeai."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None, None
        
    system_instruction = (
        "You are an elite quantitative financial analyst and stock market AI chatbot. "
        "You converse engagingly, professionally, and honestly. You provide clear explanations "
        "of technical indicators (RSI, MACD, Bollinger Bands, ATR), expected price targets, "
        "and 95% confidence corridors for both US and Indian markets. Always emphasize risk management."
    )
    
    # Try new google.genai SDK first
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        return "google.genai", client
    except Exception:
        pass
        
    # Fallback to legacy google.generativeai
    try:
        import google.generativeai as legacy_genai
        legacy_genai.configure(api_key=api_key)
        model = legacy_genai.GenerativeModel(
            'gemini-1.5-flash',
            system_instruction=system_instruction
        )
        chat_session = model.start_chat(history=[])
        return "google.generativeai", chat_session
    except Exception:
        pass
        
    return None, None

def ask_gemini(client_type, client_obj, prompt: str) -> Optional[str]:
    """Sends prompt to Gemini."""
    if not client_obj:
        return None
    try:
        if client_type == "google.genai":
            response = client_obj.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        elif client_type == "google.generativeai":
            response = client_obj.send_message(prompt)
            return response.text
    except Exception as e:
        # Retry with 2.0 or 1.5 if model name failed
        if client_type == "google.genai":
            try:
                response = client_obj.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                return response.text
            except Exception:
                pass
    return None

def run_chat_interface():
    """Interactive chatbot CLI."""
    print("\n" + "="*70)
    print("📈 AI QUANTITATIVE STOCK PREDICTOR (US & INDIAN MARKETS)")
    print("="*70)
    print("Supported: US Stocks (AAPL, TSLA, NVDA), Indian Stocks (Reliance, TCS, HDFC, etc.)")
    print("Indices:   NIFTY 50, SENSEX, S&P 500, NASDAQ")
    print("Commands:  'predict <company>', 'help', or 'quit'")
    print("="*70)
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("\nAI: Optional: Enter your Google Gemini API Key for conversational AI explanations")
        print("AI: (Press Enter to continue with built-in Quantitative Analysis Engine)")
        try:
            user_key = input("Enter GEMINI_API_KEY (or Enter to skip): ").strip()
            if user_key:
                os.environ["GEMINI_API_KEY"] = user_key
        except (KeyboardInterrupt, EOFError):
            return

    client_type, gemini_client = init_gemini()
    if gemini_client:
        print(f"AI: Human-like Gemini AI connected successfully ({client_type}).\n")
    else:
        print("AI: Running in High-Performance Local Quantitative Engine mode.\n")

    last_result = None

    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAI: Goodbye! Trade safely.")
            break

        if not user_input:
            continue

        lower = user_input.lower()
        if lower in ['quit', 'exit', 'bye', 'goodbye']:
            print("AI: Goodbye! Trade responsibly and protect your capital.")
            break

        if lower in ['help', 'commands', '?']:
            print("\n💡 Tips:")
            print("• 'predict Reliance' (Indian NSE equity)")
            print("• 'price of Apple' (US NASDAQ equity)")
            print("• 'forecast TCS' or 'predict HDFC Bank'")
            print("• 'predict Nifty 50' or 'forecast S&P 500'")
            print("• 'can you guarantee 100% accuracy?'")
            print("• 'exit' to quit\n")
            continue

        # Check for 100% accuracy inquiry
        if any(w in lower for w in ['100%', 'always correct', 'perfect', 'never lose', 'guarantee']):
            msg = (
                "\n💡 QUANTITATIVE REALITY ON '100% ACCURACY':\n"
                "In financial mathematics and economics (Efficient Market Hypothesis), no system can "
                "consistently predict future stock prices with 100% certainty. Markets are driven by unpredictable "
                "new information: geopolitical shocks, earnings surprises, central bank rate decisions (RBI/Fed), "
                "and human sentiment.\n\n"
                "Professional algorithmic systems do not seek impossible crystal balls; they focus on:\n"
                "1. Statistical edge (achieving 55-65% directional win rates)\n"
                "2. 95% Confidence Corridors (expected price trading range)\n"
                "3. Asymmetric Risk-to-Reward ratios and Stop-Loss management.\n"
            )
            print(msg)
            continue

        # Check for stock query
        is_query = any(k in lower for k in ['predict', 'price', 'stock', 'forecast', 'target', 'analyze'])
        company_query = None

        if is_query:
            match = re.search(r'(?:predict|price of|for|stock|forecast|analyze)\s+([a-zA-Z0-9.\-\s&]+)', user_input, re.IGNORECASE)
            if match:
                raw_c = match.group(1)
                for stop_w in ['stock', 'price', 'please', 'for me', 'today', 'tomorrow']:
                    raw_c = re.sub(rf'\b{stop_w}\b', '', raw_c, flags=re.IGNORECASE)
                company_query = raw_c.strip()

        # If user just typed a single stock ticker/name directly
        if not company_query and len(user_input.split()) <= 3 and not any(w in lower for w in ['hi', 'hello', 'who are you', 'how are you']):
            company_query = user_input.strip()

        if company_query:
            print(f"AI: Analyzing '{company_query}' across Indian and US exchanges...")
            resolved_ticker = resolve_ticker(company_query)
            
            if not resolved_ticker:
                print(f"AI: Could not resolve a valid stock ticker for '{company_query}'. Try using the exact symbol like 'RELIANCE.NS' or 'AAPL'.")
                continue

            print(f"AI: Found symbol: {resolved_ticker}. Training quantitative ensemble on historical market data...")
            result = predict_stock(resolved_ticker)
            
            if result is None:
                print(f"AI: Could not retrieve sufficient historical market data for '{resolved_ticker}'. Please check the symbol and try again.")
                continue

            last_result = result
            report_str = format_prediction_report(result)
            print(report_str)

            if gemini_client:
                prompt = (
                    f"The user asked to analyze {company_query}. Here is the quantitative model output:\n"
                    f"{report_str}\n"
                    f"Explain this forecast conversationally to the user. Mention the expected next price target, "
                    f"the 95% confidence corridor, the directional win rate, and provide practical risk management advice."
                )
                ai_narration = ask_gemini(client_type, gemini_client, prompt)
                if ai_narration:
                    print(f"\nAI (Gemini Analyst):\n{ai_narration}\n")
            continue

        # Conversational fallback
        if gemini_client:
            reply = ask_gemini(client_type, gemini_client, user_input)
            if reply:
                print(f"AI: {reply}")
            else:
                print("AI: I am ready. Try typing 'predict Reliance' or 'predict Apple'.")
        else:
            if any(w in lower for w in ['hi', 'hello', 'hey']):
                print("AI: Hello! I am your Quantitative Stock Predictor. You can ask me to analyze any US or Indian stock (e.g. 'predict Reliance', 'predict Nvidia').")
            elif 'who are you' in lower:
                print("AI: I am an advanced Quantitative Stock Prediction system using Random Forest + Gradient Boosting ensemble modeling, technical indicators (RSI, MACD, Bollinger Bands, ATR), and dual-market support for US and Indian exchanges.")
            else:
                print("AI: Ask me to predict any stock. Examples: 'predict Reliance', 'price of Tesla', 'predict TCS', 'forecast Apple'.")

def main():
    parser = argparse.ArgumentParser(description="Advanced Quantitative Stock Prediction Tool (US & Indian Markets)")
    parser.add_argument("--ticker", type=str, help="Stock symbol or company name (e.g., AAPL, RELIANCE.NS, 'Tata Motors')")
    parser.add_argument("--market", type=str, choices=["us", "in"], help="Market bias ('us' or 'in')")
    parser.add_argument("--details", action="store_true", help="Print full technical analysis details")
    args = parser.parse_args()

    if args.ticker:
        resolved = resolve_ticker(args.ticker, preferred_market=args.market)
        if not resolved:
            print(f"Error: Unable to resolve ticker for '{args.ticker}'")
            sys.exit(1)
        res = predict_stock(resolved)
        if not res:
            print(f"Error: Unable to compute prediction for '{resolved}'")
            sys.exit(1)
        print(format_prediction_report(res))
    else:
        run_chat_interface()

if __name__ == "__main__":
    main()
