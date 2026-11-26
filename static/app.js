/**
 * QuantPulse AI - Advanced Multi-Timeframe Application Logic
 */

let activeStockData = null;
let priceChartInstance = null;
let fullChartData = null;
let currentTimeframe = "6M";

// DOM Elements
const searchForm = document.getElementById("searchForm");
const tickerInput = document.getElementById("tickerInput");
const marketFilter = document.getElementById("marketFilter");
const submitBtn = document.getElementById("submitBtn");
const suggestionsDropdown = document.getElementById("suggestionsDropdown");

const loadingState = document.getElementById("loadingState");
const loadingText = document.getElementById("loadingText");
const errorBanner = document.getElementById("errorBanner");
const errorMessage = document.getElementById("errorMessage");
const resultsSection = document.getElementById("resultsSection");

// Hero Elements
const tickerBadge = document.getElementById("tickerBadge");
const currencyBadge = document.getElementById("currencyBadge");
const sectorBadge = document.getElementById("sectorBadge");
const companyName = document.getElementById("companyName");
const signalBadge = document.getElementById("signalBadge");
const signalText = document.getElementById("signalText");

// Price Cards
const currentPriceEl = document.getElementById("currentPrice");
const predictedPriceEl = document.getElementById("predictedPrice");
const returnPill = document.getElementById("returnPill");
const returnText = document.getElementById("returnText");

const predicted5dPriceEl = document.getElementById("predicted5dPrice");
const return5dPill = document.getElementById("return5dPill");
const return5dText = document.getElementById("return5dText");

// Fundamentals
const marketCapText = document.getElementById("marketCapText");
const peRatioText = document.getElementById("peRatioText");
const betaText = document.getElementById("betaText");
const divYieldText = document.getElementById("divYieldText");
const low52Text = document.getElementById("low52Text");
const high52Text = document.getElementById("high52Text");
const range52Bar = document.getElementById("range52Bar");

// Corridor & Edge
const rangeLowerText = document.getElementById("rangeLowerText");
const rangeUpperText = document.getElementById("rangeUpperText");
const hitRateText = document.getElementById("hitRateText");
const hitRateBar = document.getElementById("hitRateBar");
const mapeText = document.getElementById("mapeText");
const volatilityText = document.getElementById("volatilityText");
const atrText = document.getElementById("atrText");

// Consensus
const consensusBadge = document.getElementById("consensusBadge");
const bullishCount = document.getElementById("bullishCount");
const neutralCount = document.getElementById("neutralCount");
const bearishCount = document.getElementById("bearishCount");

// Technical Indicators
const rsiValue = document.getElementById("rsiValue");
const rsiStatus = document.getElementById("rsiStatus");
const stochValue = document.getElementById("stochValue");
const stochStatus = document.getElementById("stochStatus");
const resistanceR2 = document.getElementById("resistanceR2");
const resistanceR1 = document.getElementById("resistanceR1");
const pivotPoint = document.getElementById("pivotPoint");
const supportS1 = document.getElementById("supportS1");
const supportS2 = document.getElementById("supportS2");
const swingLow20d = document.getElementById("swingLow20d");
const swingHigh20d = document.getElementById("swingHigh20d");

// Chat Elements
const chatHistory = document.getElementById("chatHistory");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

/**
 * Initialize Application
 */
document.addEventListener("DOMContentLoaded", () => {
  fetchSystemStatus();
  setupEventListeners();
  // Default to Reliance Industries (NSE)
  analyzeStock("Reliance", "in");
});

/**
 * Fetch Backend Status
 */
async function fetchSystemStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    const statusText = document.getElementById("aiStatusText");
    if (data.gemini_connected) {
      statusText.textContent = "Gemini AI Connected";
    } else {
      statusText.textContent = "Local Quant Ensemble";
    }
  } catch (err) {
    console.warn("Status check failed", err);
  }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Search submit
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = tickerInput.value.trim();
    if (query) {
      hideSuggestions();
      analyzeStock(query, marketFilter.value);
    }
  });

  // Quick Chips
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const ticker = chip.getAttribute("data-ticker");
      const market = chip.getAttribute("data-market") || marketFilter.value;
      if (market) marketFilter.value = market;
      tickerInput.value = ticker;
      analyzeStock(ticker, market);
    });
  });

  // Timeframe buttons
  document.querySelectorAll(".timeframe-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".timeframe-btn").forEach((b) => {
        b.className = "timeframe-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition font-medium";
      });
      btn.className = "timeframe-btn px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40";
      currentTimeframe = btn.getAttribute("data-tf");
      if (fullChartData && activeStockData) {
        renderFilteredChart(fullChartData, activeStockData.currency_sym || "$", currentTimeframe);
      }
    });
  });

  // Autocomplete debounced input
  let debounceTimeout = null;
  tickerInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    const q = tickerInput.value.trim();
    if (q.length < 2) {
      hideSuggestions();
      return;
    }
    debounceTimeout = setTimeout(() => fetchSuggestions(q), 220);
  });

  // Close suggestions on outside click
  document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Chat submit
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) {
      sendMessage(msg);
      chatInput.value = "";
    }
  });

  // Chat Prompt Pills
  document.querySelectorAll(".chat-prompt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.textContent.trim();
      sendMessage(prompt);
    });
  });
}

/**
 * Fetch Auto-complete Suggestions
 */
async function fetchSuggestions(q) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.suggestions && data.suggestions.length > 0) {
      renderSuggestions(data.suggestions);
    } else {
      hideSuggestions();
    }
  } catch (e) {
    hideSuggestions();
  }
}

function renderSuggestions(list) {
  suggestionsDropdown.innerHTML = "";
  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "suggestion-item flex items-center justify-between text-xs";
    div.innerHTML = `
      <div>
        <span class="font-bold text-slate-100">${escapeHtml(item.name)}</span>
        <span class="font-mono text-slate-400 ml-1">(${escapeHtml(item.symbol)})</span>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">${escapeHtml(item.market)}</span>
    `;
    div.addEventListener("click", () => {
      tickerInput.value = item.name;
      const mkt = item.market && item.market.includes("India") ? "in" : "us";
      marketFilter.value = mkt;
      hideSuggestions();
      analyzeStock(item.symbol, mkt);
    });
    suggestionsDropdown.appendChild(div);
  });
  suggestionsDropdown.classList.remove("hidden");
}

function hideSuggestions() {
  suggestionsDropdown.classList.add("hidden");
}

/**
 * Core Stock Analysis API Call
 */
async function analyzeStock(query, market = null) {
  showLoading();
  hideError();

  try {
    let url = `/api/predict?query=${encodeURIComponent(query)}`;
    if (market) url += `&market=${encodeURIComponent(market)}`;

    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.success) {
      showError(result.error || `Unable to analyze stock "${query}". Please verify the symbol.`);
      hideLoading();
      return;
    }

    activeStockData = result.data;
    fullChartData = activeStockData.chart_data;
    renderStockData(activeStockData);
    hideLoading();
    resultsSection.classList.remove("hidden");

  } catch (err) {
    showError("A network error occurred while connecting to the quantitative backend. Please check server status.");
    hideLoading();
  }
}

/**
 * Render Stock Data on Dashboard
 */
function renderStockData(data) {
  const cs = data.currency_sym || "$";
  const isUp = data.predicted_return_pct >= 0;
  const is5dUp = (data.predicted_5d_return_pct || 0) >= 0;

  // Header tags
  tickerBadge.textContent = data.ticker;
  currencyBadge.textContent = `${data.currency_code} (${cs})`;
  sectorBadge.textContent = `${data.sector} • ${data.industry}`;
  companyName.textContent = data.company_name;

  // Signal Badge
  signalText.textContent = data.signal;
  if (data.signal.includes("BUY")) {
    signalBadge.className = "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
  } else if (data.signal.includes("SELL")) {
    signalBadge.className = "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg bg-rose-500/20 text-rose-300 border border-rose-500/40";
  } else {
    signalBadge.className = "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg bg-amber-500/20 text-amber-300 border border-amber-500/40";
  }

  // Prices (1-Day)
  currentPriceEl.textContent = `${cs}${formatNumber(data.current_price)}`;
  predictedPriceEl.textContent = `${cs}${formatNumber(data.predicted_price)}`;

  const sign = isUp ? "+" : "";
  returnText.textContent = `${sign}${data.predicted_return_pct.toFixed(2)}%`;
  if (isUp) {
    returnPill.className = "px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1";
    returnPill.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> <span>+${data.predicted_return_pct.toFixed(2)}%</span>`;
    predictedPriceEl.className = "text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400";
  } else {
    returnPill.className = "px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1";
    returnPill.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> <span>${data.predicted_return_pct.toFixed(2)}%</span>`;
    predictedPriceEl.className = "text-2xl sm:text-3xl font-extrabold font-mono text-rose-400";
  }

  // Prices (5-Day Swing)
  if (data.predicted_5d_price) {
    predicted5dPriceEl.textContent = `${cs}${formatNumber(data.predicted_5d_price)}`;
    const sign5d = is5dUp ? "+" : "";
    return5dText.textContent = `${sign5d}${data.predicted_5d_return_pct.toFixed(2)}%`;
    if (is5dUp) {
      return5dPill.className = "px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1";
      predicted5dPriceEl.className = "text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400";
    } else {
      return5dPill.className = "px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1";
      predicted5dPriceEl.className = "text-2xl sm:text-3xl font-extrabold font-mono text-rose-400";
    }
  }

  // Fundamentals
  marketCapText.textContent = formatMarketCap(data.market_cap, data.currency_code);
  peRatioText.textContent = data.pe_ratio ? data.pe_ratio.toFixed(2) : "N/A";
  betaText.textContent = data.beta !== null && data.beta !== undefined ? Number(data.beta).toFixed(2) : "N/A";
  divYieldText.textContent = data.dividend_yield ? `${(data.dividend_yield * (data.dividend_yield > 1 ? 1 : 100)).toFixed(2)}%` : "N/A";

  // 52-Week Range Bar
  const high52 = data.week_52_high;
  const low52 = data.week_52_low;
  if (high52 && low52 && high52 > low52) {
    high52Text.textContent = `${cs}${formatNumber(high52)}`;
    low52Text.textContent = `${cs}${formatNumber(low52)}`;
    const rangePct = Math.max(0, Math.min(100, ((data.current_price - low52) / (high52 - low52)) * 100));
    range52Bar.style.width = `${rangePct}%`;
  } else {
    high52Text.textContent = "--";
    low52Text.textContent = "--";
    range52Bar.style.width = "50%";
  }

  // Corridor (1-Day)
  rangeLowerText.textContent = `${cs}${formatNumber(data.confidence_range_lower)}`;
  rangeUpperText.textContent = `${cs}${formatNumber(data.confidence_range_upper)}`;

  // Quantitative Edge
  hitRateText.textContent = `${data.directional_hit_rate.toFixed(1)}%`;
  hitRateBar.style.width = `${Math.min(100, Math.max(10, data.directional_hit_rate))}%`;
  mapeText.textContent = `${data.mape.toFixed(2)}%`;
  volatilityText.textContent = `${data.annualized_volatility_pct.toFixed(1)}%`;
  atrText.textContent = `${cs}${formatNumber(data.atr)}`;

  // Technical Consensus
  bullishCount.textContent = data.bullish_count || 0;
  neutralCount.textContent = data.neutral_count || 0;
  bearishCount.textContent = data.bearish_count || 0;

  const score = (data.bullish_count || 0) - (data.bearish_count || 0);
  if (score >= 3) {
    consensusBadge.textContent = "Strong Bullish";
    consensusBadge.className = "font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300";
  } else if (score >= 1) {
    consensusBadge.textContent = "Bullish Setup";
    consensusBadge.className = "font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400";
  } else if (score <= -3) {
    consensusBadge.textContent = "Strong Bearish";
    consensusBadge.className = "font-bold text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300";
  } else if (score <= -1) {
    consensusBadge.textContent = "Bearish Setup";
    consensusBadge.className = "font-bold text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400";
  } else {
    consensusBadge.textContent = "Neutral / Mixed";
    consensusBadge.className = "font-bold text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300";
  }

  // Technical Indicators (RSI)
  rsiValue.textContent = data.rsi.toFixed(1);
  if (data.rsi < 30) {
    rsiStatus.textContent = "Oversold";
    rsiStatus.className = "text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300";
  } else if (data.rsi > 70) {
    rsiStatus.textContent = "Overbought";
    rsiStatus.className = "text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300";
  } else {
    rsiStatus.textContent = "Neutral";
    rsiStatus.className = "text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300";
  }

  // Stochastic
  if (data.stoch_k !== undefined && data.stoch_d !== undefined) {
    stochValue.textContent = `${data.stoch_k.toFixed(1)} / ${data.stoch_d.toFixed(1)}`;
    if (data.stoch_k > data.stoch_d && data.stoch_k < 80) {
      stochStatus.textContent = "Bullish Cross";
      stochStatus.className = "text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300";
    } else if (data.stoch_k < data.stoch_d && data.stoch_k > 20) {
      stochStatus.textContent = "Bearish Cross";
      stochStatus.className = "text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300";
    } else {
      stochStatus.textContent = "Neutral";
      stochStatus.className = "text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300";
    }
  }

  // Pivot Ladder
  pivotPoint.textContent = `${cs}${formatNumber(data.pivot || data.current_price)}`;
  resistanceR1.textContent = `${cs}${formatNumber(data.resistance_r1)}`;
  resistanceR2.textContent = `${cs}${formatNumber(data.resistance_r2 || (data.resistance_r1 * 1.02))}`;
  supportS1.textContent = `${cs}${formatNumber(data.support_s1)}`;
  supportS2.textContent = `${cs}${formatNumber(data.support_s2 || (data.support_s1 * 0.98))}`;

  swingLow20d.textContent = `${cs}${formatNumber(data.swing_low_20d)}`;
  swingHigh20d.textContent = `${cs}${formatNumber(data.swing_high_20d)}`;

  // Render Multi-Timeframe Chart
  if (fullChartData) {
    renderFilteredChart(fullChartData, cs, currentTimeframe);
  }
}

/**
 * Filter Chart Data by Timeframe and Render
 */
function renderFilteredChart(chartData, currencySym, timeframe) {
  let sliceCount = 126; // default 6M
  if (timeframe === "1M") sliceCount = 21;
  else if (timeframe === "3M") sliceCount = 63;
  else if (timeframe === "6M") sliceCount = 126;
  else if (timeframe === "1Y") sliceCount = 252;
  else if (timeframe === "ALL") sliceCount = chartData.dates.length;

  const totalLen = chartData.dates.length;
  const startIdx = Math.max(0, totalLen - sliceCount);

  const dates = [...chartData.dates.slice(startIdx), chartData.next_date];
  const histPrices = [...chartData.prices.slice(startIdx), null];
  const sma20 = [...chartData.sma20.slice(startIdx), null];
  const sma50 = [...chartData.sma50.slice(startIdx), null];
  const volume = [...chartData.volume.slice(startIdx), null];

  // Target Point
  const targetData = new Array(dates.length).fill(null);
  targetData[dates.length - 2] = chartData.prices[totalLen - 1]; // connect anchor
  targetData[dates.length - 1] = chartData.predicted_price; // next close point

  renderChart(dates, histPrices, sma20, sma50, targetData, volume, currencySym);
}

/**
 * Render Chart.js Chart with Volume Sub-chart
 */
function renderChart(dates, histPrices, sma20, sma50, targetData, volume, currencySym) {
  const ctx = document.getElementById("priceChart").getContext("2d");

  if (priceChartInstance) {
    priceChartInstance.destroy();
  }

  // Volume bar colors: green for up sessions, red for down sessions
  const volumeColors = [];
  for (let i = 0; i < histPrices.length - 1; i++) {
    if (i === 0 || histPrices[i] >= histPrices[i - 1]) {
      volumeColors.push("rgba(16, 185, 129, 0.25)");
    } else {
      volumeColors.push("rgba(244, 63, 94, 0.25)");
    }
  }
  volumeColors.push("rgba(6, 182, 212, 0.25)");

  priceChartInstance = new Chart(ctx, {
    data: {
      labels: dates,
      datasets: [
        {
          type: "line",
          label: "Close Price",
          data: histPrices,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.06)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10b981",
          pointHoverBorderColor: "#fff",
          yAxisID: "y",
        },
        {
          type: "line",
          label: "SMA 20",
          data: sma20,
          borderColor: "#f59e0b",
          borderWidth: 1.5,
          borderDash: [4, 4],
          fill: false,
          pointRadius: 0,
          tension: 0.1,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "SMA 50",
          data: sma50,
          borderColor: "#a855f7",
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0,
          tension: 0.1,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Next Target",
          data: targetData,
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6, 182, 212, 0.2)",
          borderWidth: 2.5,
          borderDash: [3, 3],
          fill: false,
          pointRadius: (ctx) => (ctx.dataIndex === dates.length - 1 ? 6 : 0),
          pointBackgroundColor: "#06b6d4",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          yAxisID: "y",
        },
        {
          type: "bar",
          label: "Volume",
          data: volume,
          backgroundColor: volumeColors,
          borderWidth: 0,
          yAxisID: "yVolume",
          barPercentage: 0.6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#f8fafc",
          bodyColor: "#cbd5e1",
          borderColor: "#334155",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              const val = context.raw;
              if (val === null || val === undefined) return null;
              if (context.dataset.label === "Volume") {
                return `Volume: ${Number(val).toLocaleString()}`;
              }
              return `${context.dataset.label}: ${currencySym}${formatNumber(val)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(51, 65, 85, 0.25)" },
          ticks: { color: "#64748b", font: { size: 10 }, maxTicksLimit: 10 }
        },
        y: {
          position: "right",
          grid: { color: "rgba(51, 65, 85, 0.25)" },
          ticks: {
            color: "#94a3b8",
            font: { size: 11, family: "JetBrains Mono" },
            callback: (val) => `${currencySym}${formatNumber(val)}`
          }
        },
        yVolume: {
          position: "left",
          display: false,
          max: (ctx) => {
            const vals = volume.filter((v) => v !== null && !isNaN(v));
            return vals.length ? Math.max(...vals) * 4 : 1000;
          }
        }
      }
    }
  });
}

/**
 * AI Chat Interaction
 */
async function sendMessage(msg) {
  appendChatMessage(msg, "user");
  const tempAiId = appendChatMessage("Analyzing quantitative metrics...", "ai", true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: msg,
        stock_data: activeStockData
      })
    });
    const data = await res.json();
    updateChatMessage(tempAiId, data.reply || "No response received.");
  } catch (err) {
    updateChatMessage(tempAiId, "Could not connect to the analyst backend.");
  }
}

function appendChatMessage(text, sender, isPending = false) {
  const id = "msg-" + Date.now() + Math.random().toString(36).substring(2, 6);
  const bubble = document.createElement("div");

  if (sender === "user") {
    bubble.className = "chat-bubble-user p-3 text-slate-100 text-xs sm:text-sm";
    bubble.innerHTML = `<span class="text-cyan-400 font-bold text-xs block mb-1">You:</span> ${escapeHtml(text)}`;
  } else {
    bubble.id = id;
    bubble.className = "chat-bubble-ai p-3 text-slate-200 text-xs sm:text-sm";
    bubble.innerHTML = `<span class="text-emerald-400 font-bold text-xs block mb-1">AI Analyst:</span> ${isPending ? `<i class="fa-solid fa-spinner fa-spin text-emerald-400"></i> ${escapeHtml(text)}` : formatMarkdown(text)}`;
  }

  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return id;
}

function updateChatMessage(id, newText) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<span class="text-emerald-400 font-bold text-xs block mb-1">AI Analyst:</span> ${formatMarkdown(newText)}`;
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

/**
 * Helpers
 */
function showLoading() {
  loadingState.classList.remove("hidden");
  resultsSection.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-50");
}

function hideLoading() {
  loadingState.classList.add("hidden");
  submitBtn.disabled = false;
  submitBtn.classList.remove("opacity-50");
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.classList.add("hidden");
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  return Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMarketCap(mcap, currencyCode) {
  if (!mcap || isNaN(mcap)) return "N/A";
  const num = Number(mcap);
  if (currencyCode === "INR") {
    if (num >= 1e12) return `₹${(num / 1e12).toFixed(2)} Lakh Cr`;
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
    return `₹${num.toLocaleString()}`;
  } else {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/\n/g, "<br>");
}
