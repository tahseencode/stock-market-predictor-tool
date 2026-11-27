/**
 * MarketPulse Terminal — Application Logic
 * Institutional Multi-Timeframe Quantitative Analytics
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

// Price Elements
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
  setupTabNavigation();
  setupKeyboardShortcuts();

  // Default to Reliance Industries (NSE) on boot
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
    if (statusText) {
      if (data.gemini_connected) {
        statusText.textContent = "Gemini Analyst Online";
      } else {
        statusText.textContent = "Ensemble Engine Active";
      }
    }
  } catch (err) {
    console.warn("Status check failed", err);
  }
}

/**
 * Setup Tab Navigation
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }

      // Re-trigger chart layout if switching to chart tab
      if (targetId === "tab-chart" && priceChartInstance) {
        priceChartInstance.resize();
      }
    });
  });
}

/**
 * Setup Global Keyboard Shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Pressing '/' focuses search unless already typing in an input
    if (e.key === "/" && document.activeElement !== tickerInput && document.activeElement !== chatInput) {
      e.preventDefault();
      tickerInput.focus();
      tickerInput.select();
    }
  });
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

  // Watchlist Quick Chips
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".quick-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

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
      document.querySelectorAll(".timeframe-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
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
    div.className = "suggestion-item";
    div.innerHTML = `
      <div class="suggestion-left">
        <span class="suggestion-ticker">${escapeHtml(item.symbol)}</span>
        <span class="suggestion-name">${escapeHtml(item.name)}</span>
      </div>
      <span class="suggestion-badge">${escapeHtml(item.market)}</span>
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
  suggestionsDropdown.style.display = "flex";
}

function hideSuggestions() {
  suggestionsDropdown.style.display = "none";
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
      showError(result.error || `Unable to analyze stock "${query}". Please verify the symbol or company name.`);
      hideLoading();
      return;
    }

    activeStockData = result.data;
    fullChartData = activeStockData.chart_data;
    renderStockData(activeStockData);
    hideLoading();
    resultsSection.style.display = "flex";

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

  // Header meta tags
  tickerBadge.textContent = data.ticker;
  currencyBadge.textContent = `${data.currency_code} (${cs})`;
  sectorBadge.textContent = `${data.sector || "Equity"} • ${data.industry || "General"}`;
  companyName.textContent = data.company_name;

  // Signal Badge
  signalText.textContent = data.signal.replace(/🟢|🔴|🟡/g, "").trim();
  signalBadge.className = "signal-pill";
  if (data.signal.includes("BUY")) {
    signalBadge.classList.remove("bearish", "neutral");
  } else if (data.signal.includes("SELL")) {
    signalBadge.classList.add("bearish");
  } else {
    signalBadge.classList.add("neutral");
  }

  // Prices (1-Day Model Target)
  currentPriceEl.textContent = `${cs}${formatNumber(data.current_price)}`;
  predictedPriceEl.textContent = `${cs}${formatNumber(data.predicted_price)}`;

  const sign = isUp ? "+" : "";
  returnText.textContent = `${sign}${data.predicted_return_pct.toFixed(2)}%`;
  if (isUp) {
    returnPill.className = "change-pill";
    returnPill.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> <span>+${data.predicted_return_pct.toFixed(2)}%</span>`;
    predictedPriceEl.style.color = "var(--green)";
  } else {
    returnPill.className = "change-pill negative";
    returnPill.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> <span>${data.predicted_return_pct.toFixed(2)}%</span>`;
    predictedPriceEl.style.color = "var(--red)";
  }

  // Prices (5-Day Swing Target)
  if (data.predicted_5d_price) {
    predicted5dPriceEl.textContent = `${cs}${formatNumber(data.predicted_5d_price)}`;
    const sign5d = is5dUp ? "+" : "";
    return5dText.textContent = `${sign5d}${data.predicted_5d_return_pct.toFixed(2)}%`;
    if (is5dUp) {
      return5dPill.className = "change-pill";
      return5dPill.innerHTML = `<span>+${data.predicted_5d_return_pct.toFixed(2)}%</span>`;
      predicted5dPriceEl.style.color = "var(--cyan)";
    } else {
      return5dPill.className = "change-pill negative";
      return5dPill.innerHTML = `<span>${data.predicted_5d_return_pct.toFixed(2)}%</span>`;
      predicted5dPriceEl.style.color = "var(--red)";
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
    range52Bar.style.left = "0%";
    range52Bar.style.width = `${rangePct}%`;
  } else {
    high52Text.textContent = "--";
    low52Text.textContent = "--";
    range52Bar.style.width = "50%";
  }

  // Corridor (1-Day 95% Confidence Band)
  rangeLowerText.textContent = `${cs}${formatNumber(data.confidence_range_lower)}`;
  rangeUpperText.textContent = `${cs}${formatNumber(data.confidence_range_upper)}`;

  // Quantitative Edge & Validation
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
    consensusBadge.style.color = "var(--green)";
  } else if (score >= 1) {
    consensusBadge.textContent = "Bullish Setup";
    consensusBadge.style.color = "var(--green)";
  } else if (score <= -3) {
    consensusBadge.textContent = "Strong Bearish";
    consensusBadge.style.color = "var(--red)";
  } else if (score <= -1) {
    consensusBadge.textContent = "Bearish Setup";
    consensusBadge.style.color = "var(--red)";
  } else {
    consensusBadge.textContent = "Neutral / Consolidation";
    consensusBadge.style.color = "var(--amber)";
  }

  // Technical Indicators: RSI
  rsiValue.textContent = data.rsi.toFixed(1);
  if (data.rsi < 30) {
    rsiStatus.textContent = "Oversold";
    rsiStatus.style.color = "var(--green)";
  } else if (data.rsi > 70) {
    rsiStatus.textContent = "Overbought";
    rsiStatus.style.color = "var(--red)";
  } else {
    rsiStatus.textContent = "Neutral";
    rsiStatus.style.color = "var(--text-secondary)";
  }

  // Stochastic Oscillator
  if (data.stoch_k !== undefined && data.stoch_d !== undefined) {
    stochValue.textContent = `${data.stoch_k.toFixed(1)} / ${data.stoch_d.toFixed(1)}`;
    if (data.stoch_k > data.stoch_d && data.stoch_k < 80) {
      stochStatus.textContent = "Bullish Cross";
      stochStatus.style.color = "var(--green)";
    } else if (data.stoch_k < data.stoch_d && data.stoch_k > 20) {
      stochStatus.textContent = "Bearish Cross";
      stochStatus.style.color = "var(--red)";
    } else {
      stochStatus.textContent = "Neutral";
      stochStatus.style.color = "var(--text-secondary)";
    }
  }

  // Pivot Point Ladder
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

  // Target Point Projection
  const targetData = new Array(dates.length).fill(null);
  targetData[dates.length - 2] = chartData.prices[totalLen - 1]; // Anchor to last close
  targetData[dates.length - 1] = chartData.predicted_price; // Next close projection

  renderChart(dates, histPrices, sma20, sma50, targetData, volume, currencySym);
}

/**
 * Render Chart.js Chart
 */
function renderChart(dates, histPrices, sma20, sma50, targetData, volume, currencySym) {
  const canvas = document.getElementById("priceChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (priceChartInstance) {
    priceChartInstance.destroy();
  }

  // Volume Bar Colors: Green for up sessions, Red for down sessions
  const volumeColors = [];
  for (let i = 0; i < histPrices.length - 1; i++) {
    if (i === 0 || histPrices[i] >= histPrices[i - 1]) {
      volumeColors.push("rgba(16, 185, 129, 0.22)");
    } else {
      volumeColors.push("rgba(244, 63, 94, 0.22)");
    }
  }
  volumeColors.push("rgba(6, 182, 212, 0.22)");

  priceChartInstance = new Chart(ctx, {
    data: {
      labels: dates,
      datasets: [
        {
          type: "line",
          label: "Close Price",
          data: histPrices,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#10b981",
          pointHoverBorderColor: "#ffffff",
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
          borderColor: "#8b5cf6",
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0,
          tension: 0.1,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Model Target",
          data: targetData,
          borderColor: "#06b6d4",
          borderWidth: 2,
          borderDash: [3, 3],
          fill: false,
          pointRadius: (ctx) => (ctx.dataIndex === dates.length - 1 ? 6 : 0),
          pointBackgroundColor: "#06b6d4",
          pointBorderColor: "#ffffff",
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
          backgroundColor: "rgba(18, 21, 30, 0.95)",
          titleColor: "#f8fafc",
          bodyColor: "#94a3b8",
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: "bold" },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
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
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#64748b", font: { size: 11, family: "'JetBrains Mono', monospace" }, maxTicksLimit: 8 }
        },
        y: {
          position: "right",
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: {
            color: "#94a3b8",
            font: { size: 11, family: "'JetBrains Mono', monospace" },
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
 * Analyst Chat Interaction
 */
async function sendMessage(msg) {
  appendChatMessage(msg, "user");
  const tempMsgId = appendChatMessage("Reviewing quantitative matrices and order levels...", "assistant", true);

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
    updateChatMessage(tempMsgId, data.reply || "No response received.");
  } catch (err) {
    updateChatMessage(tempMsgId, "Unable to connect to the quantitative analyst service.");
  }
}

function appendChatMessage(text, role, isPending = false) {
  const id = "msg-" + Date.now() + Math.random().toString(36).substring(2, 6);
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.id = id;

  if (role === "user") {
    bubble.innerHTML = escapeHtml(text);
  } else {
    bubble.innerHTML = `
      <span class="chat-sender">Market Desk Analyst</span>
      ${isPending ? `<i class="fa-solid fa-spinner fa-spin" style="color: var(--blue); margin-right: 6px;"></i> ${escapeHtml(text)}` : formatMarkdown(text)}
    `;
  }

  wrapper.appendChild(bubble);
  chatHistory.appendChild(wrapper);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return id;
}

function updateChatMessage(id, newText) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `
      <span class="chat-sender">Market Desk Analyst</span>
      ${formatMarkdown(newText)}
    `;
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

/**
 * Loading & Error Helpers
 */
function showLoading() {
  loadingState.style.display = "flex";
  resultsSection.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.6";
}

function hideLoading() {
  loadingState.style.display = "none";
  submitBtn.disabled = false;
  submitBtn.style.opacity = "1";
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.style.display = "flex";
}

function hideError() {
  errorBanner.style.display = "none";
}

/**
 * Format Helpers
 */
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
