"""
FastAPI Web Server for Quantitative Stock Predictor AI
Provides REST API endpoints and serves the modern interactive web frontend.
"""

import os
import sys
import time
from threading import Lock
from typing import Optional, Dict, Any, Tuple
from pathlib import Path

from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn

# Import quantitative prediction engine from ai.py
from ai import (
    resolve_ticker,
    predict_stock,
    POPULAR_ALIASES,
    init_gemini,
    ask_gemini,
    get_currency_symbol
)

app = FastAPI(
    title="QuantPulse Stock Predictor API",
    description="Quantitative AI Stock Prediction for US and Indian Markets",
    version="2.1.0"
)

# In-Memory Cache for fast sub-millisecond responses
PREDICTION_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes
cache_lock = Lock()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

class ChatRequest(BaseModel):
    message: str
    stock_data: Optional[Dict[str, Any]] = None

@app.get("/")
def serve_index():
    """Serves the main single-page application dashboard."""
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")
    return FileResponse(str(index_file))

@app.get("/api/status")
def get_status():
    """Returns system status, active models, and Gemini connection status."""
    has_gemini = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "online",
        "gemini_connected": has_gemini,
        "engine": "Ensemble ML (Random Forest + Gradient Boosting)",
        "markets": ["US (NYSE / NASDAQ / S&P 500)", "India (NSE / BSE / NIFTY 50 / SENSEX)"]
    }

@app.get("/api/search")
def search_suggestions(q: str = Query(..., min_length=1)):
    """Provides autocomplete search suggestions for Indian and US stocks."""
    query = q.lower().strip()
    matches = []
    seen_symbols = set()
    
    # Match aliases first
    for name, sym in POPULAR_ALIASES.items():
        if sym in seen_symbols:
            continue
        if query in name or query in sym.lower():
            market = "India (NSE)" if (".NS" in sym or ".BO" in sym or "NSE" in sym or "BSE" in sym) else "US (NYSE/NASDAQ)"
            matches.append({
                "name": name.title(),
                "symbol": sym,
                "market": market
            })
            seen_symbols.add(sym)
            if len(matches) >= 8:
                break
                
    # If fewer than 6 matches, query Yahoo Finance API for global symbols
    if len(matches) < 6 and len(query) >= 2:
        try:
            url = f"https://query2.finance.yahoo.com/v1/finance/search?q={requests.utils.quote(query)}&quotesCount=6"
            headers = {'User-Agent': 'Mozilla/5.0'}
            resp = requests.get(url, headers=headers, timeout=2.5)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get('quotes', []):
                    sym = item.get('symbol', '')
                    if not sym or sym in seen_symbols:
                        continue
                    name = item.get('shortname') or item.get('longname') or sym
                    exch = item.get('exchange', '')
                    if sym.endswith('.NS') or exch == 'NSI':
                        mkt = "India (NSE)"
                    elif sym.endswith('.BO') or exch == 'BSE':
                        mkt = "India (BSE)"
                    elif exch in ['NYQ', 'NMS', 'NGM', 'NCM', 'NAS', 'PCX', 'BTS']:
                        mkt = "US (NYSE/NASDAQ)"
                    else:
                        mkt = "Global"
                    matches.append({
                        "name": name,
                        "symbol": sym,
                        "market": mkt
                    })
                    seen_symbols.add(sym)
                    if len(matches) >= 8:
                        break
        except Exception:
            pass

    return {"suggestions": matches}

@app.get("/api/predict")
def api_predict(
    query: str = Query(..., description="Stock symbol or company name"),
    market: Optional[str] = Query(None, description="Preferred market bias: 'in' or 'us'")
):
    """
    Resolves symbol, downloads historical data, runs feature engineering and ensemble ML,
    and returns full quantitative prediction metrics and chart data. Uses in-memory caching for speed.
    """
    resolved_sym = resolve_ticker(query, preferred_market=market)
    if not resolved_sym:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Could not resolve a valid stock ticker for '{query}'. Please check spelling or enter exact symbol like 'RELIANCE.NS' or 'AAPL'."
            }
        )
        
    cache_key = f"{resolved_sym.upper()}_{market or 'auto'}"
    now = time.time()
    with cache_lock:
        if cache_key in PREDICTION_CACHE:
            cached_time, cached_data = PREDICTION_CACHE[cache_key]
            if now - cached_time < CACHE_TTL_SECONDS:
                return {
                    "success": True,
                    "ticker": resolved_sym,
                    "data": cached_data,
                    "cached": True
                }

    result = predict_stock(resolved_sym)
    if not result:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": f"Insufficient historical trading data available for '{resolved_sym}'."
            }
        )

    with cache_lock:
        PREDICTION_CACHE[cache_key] = (now, result)
        if len(PREDICTION_CACHE) > 200:
            oldest = sorted(PREDICTION_CACHE.keys(), key=lambda k: PREDICTION_CACHE[k][0])[:50]
            for ok in oldest:
                del PREDICTION_CACHE[ok]
        
    return {
        "success": True,
        "ticker": resolved_sym,
        "data": result,
        "cached": False
    }

@app.post("/api/chat")
def api_chat(req: ChatRequest):
    """
    AI Chat endpoint: answers user questions with full quantitative context.
    Uses Google Gemini if configured, or built-in quantitative intelligence.
    """
    user_msg = req.message.strip()
    stock = req.stock_data or {}
    
    # 1. Try Gemini
    client_type, gemini_client = init_gemini()
    if gemini_client:
        context_str = ""
        if stock:
            cs = stock.get("currency_sym", "$")
            context_str = (
                f"\n[ACTIVE STOCK CONTEXT]:"
                f"\nCompany: {stock.get('company_name')} ({stock.get('ticker')})"
                f"\nCurrent Price: {cs}{stock.get('current_price', 0):,.2f}"
                f"\nPredicted Next Close: {cs}{stock.get('predicted_price', 0):,.2f} ({stock.get('predicted_return_pct', 0):+.2f}%)"
                f"\nSignal: {stock.get('signal')}"
                f"\n95% Confidence Corridor: {cs}{stock.get('confidence_range_lower', 0):,.2f} to {cs}{stock.get('confidence_range_upper', 0):,.2f}"
                f"\nDirectional Hit Rate: {stock.get('directional_hit_rate', 0):.1f}% | MAPE Error: {stock.get('mape', 0):.2f}%"
                f"\nRSI (14): {stock.get('rsi', 0):.1f} | ATR: {cs}{stock.get('atr', 0):,.2f} | Volatility: {stock.get('annualized_volatility_pct', 0):.1f}%"
                f"\nSupport S1: {cs}{stock.get('support_s1', 0):,.2f} | Resistance R1: {cs}{stock.get('resistance_r1', 0):,.2f}"
            )
        prompt = f"{user_msg}\n{context_str}"
        gemini_reply = ask_gemini(client_type, gemini_client, prompt)
        if gemini_reply:
            return {"reply": gemini_reply, "source": "Gemini AI"}

    # 2. Built-in Quantitative Analyst Fallback
    lower = user_msg.lower()
    
    # Inquiries about 100% accuracy / certainty
    if any(w in lower for w in ["100%", "always right", "perfect", "guarantee", "certain"]):
        return {
            "reply": (
                "In financial mathematics and the Efficient Market Hypothesis, no algorithm can guarantee 100% accuracy. "
                "Markets are influenced by unpredictable real-world catalysts like sudden rate shifts, geopolitical headlines, and earnings shocks. "
                "Instead, this system uses stationary return modeling to calculate an out-of-sample statistical edge (55-65% win rates), "
                "expected price ranges (95% confidence corridor), and asymmetric risk management."
            ),
            "source": "Quantitative Engine"
        }
        
    if "stop loss" in lower or "risk" in lower:
        if stock:
            cs = stock.get("currency_sym", "$")
            s1 = stock.get("support_s1", 0)
            low20 = stock.get("swing_low_20d", 0)
            atr = stock.get("atr", 0)
            curr = stock.get("current_price", 0)
            suggested_sl = max(low20, curr - (1.5 * atr))
            return {
                "reply": (
                    f"For {stock.get('company_name', 'this stock')}, key support S1 sits at {cs}{s1:,.2f} "
                    f"and the 20-day swing low is {cs}{low20:,.2f}. Based on a 1.5x ATR trailing buffer ({cs}{1.5*atr:,.2f}), "
                    f"a prudent stop-loss level for swing positions is approximately **{cs}{suggested_sl:,.2f}**."
                ),
                "source": "Quantitative Engine"
            }
            
    if stock:
        cs = stock.get("currency_sym", "$")
        ret_pct = stock.get("predicted_return_pct", 0)
        direction_word = "gain" if ret_pct >= 0 else "decline"
        return {
            "reply": (
                f"Analysis for **{stock.get('company_name')} ({stock.get('ticker')})**:\n\n"
                f"• Current Price: **{cs}{stock.get('current_price', 0):,.2f}**\n"
                f"• Expected Next Close: **{cs}{stock.get('predicted_price', 0):,.2f}** ({ret_pct:+.2f}% expected {direction_word})\n"
                f"• Signal: **{stock.get('signal')}**\n"
                f"• 95% Confidence Corridor: **{cs}{stock.get('confidence_range_lower', 0):,.2f} ──► {cs}{stock.get('confidence_range_upper', 0):,.2f}**\n"
                f"• Technicals: RSI is **{stock.get('rsi', 0):.1f}**, S1 Support is **{cs}{stock.get('support_s1', 0):,.2f}**, and R1 Resistance is **{cs}{stock.get('resistance_r1', 0):,.2f}**.\n\n"
                f"Recommendation: Maintain strict position sizing and respect the confidence boundaries."
            ),
            "source": "Quantitative Engine"
        }

    return {
        "reply": "Select or search for any stock (e.g. Reliance, TCS, Apple, Nvidia) to generate forecasts and ask targeted analysis questions!",
        "source": "Quantitative Engine"
    }

def main():
    port = int(os.environ.get("PORT", 8000))
    print(f"\n==================================================================")
    print(f"🚀 QuantPulse AI Stock Predictor Web Server Starting on port {port}")
    print(f"👉 Open in your browser: http://localhost:{port}")
    print(f"==================================================================\n")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)

if __name__ == "__main__":
    main()
