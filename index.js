/**
 * Market Peak Analysis Service
 * ============================
 *
 * Author: Muhammad Bilal Motiwala
 * Project: Black Swan
 *
 * This service determines if the crypto market has peaked by combining multiple data sources:
 * - Bull Market Peak Indicators (CoinGlass-derived, via Firestore real-time listeners)
 * - BTC/ETH/SOL: 24h minute-by-minute series (live fetch from data service)
 * - BTC/ETH/SOL: ~900 days of daily closes (cached for performance)
 *
 * The service uses AI analysis via OpenRouter to assess market peak conditions
 * and provides a score from 1-100 indicating peak likelihood.
 *
 * Output Format: { score, analysis, reasoning, key_factors }
 *
 * Architecture:
 * - Real-time Firestore listeners for bull market peak indicators
 * - Cached daily price data with automatic refresh
 * - AI-powered analysis using GPT models via OpenRouter
 * - RESTful API endpoints for triggering and retrieving analyses
 * - Automated hourly analysis via cron jobs
 */

// Core dependencies for the service
require("dotenv").config(); // Load environment variables from .env file
const express = require("express"); // Web framework for REST API
const cors = require("cors"); // Cross-Origin Resource Sharing middleware
const helmet = require("helmet"); // Security headers middleware
const rateLimit = require("express-rate-limit"); // Rate limiting middleware
const compression = require("compression"); // Response compression middleware
const admin = require("firebase-admin"); // Firebase Admin SDK for Firestore
const axios = require("axios"); // HTTP client for external API calls
const cron = require("node-cron"); // Cron job scheduler for automated analysis
const PromptManager = require("./prompts/prompt-config"); // Custom prompt management system

// Initialize Firebase Admin SDK for Firestore access
// This allows the service to read bull market peak indicators and store analysis results
let db = null;
try {
  // Load Firebase service account credentials from local file
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  console.log("✅ [FIRESTORE] Firebase Admin initialized successfully");
} catch (error) {
  console.error(
    "❌ [FIRESTORE] Firebase Admin initialization failed:",
    error.message
  );
  console.log("ℹ️ [FIRESTORE] Service will run without Firestore integration");
}

// Service configuration object containing all environment variables and constants
const CONFIG = {
  // OpenRouter API configuration for AI analysis
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, // API key for OpenRouter service
  OPENROUTER_URL: "https://openrouter.ai/api/v1/chat/completions", // OpenRouter API endpoint
  MODEL: "openai/gpt-5-mini", // AI model to use for market analysis

  // External Data Service configuration
  // This service provides real-time crypto price data (BTC, ETH, SOL)
  DATA_SERVICE_URL: process.env.DATA_SERVICE_URL,

  // Firestore collection paths for data storage and retrieval
  COLLECTIONS: {
    BULL_PEAK_LATEST: "bull-market-peak-indicators/latest", // Real-time bull market peak indicators
    STORAGE: "market_peak_analyses", // Storage for completed market peak analyses
  },

  // Request timeout for external API calls (90 seconds)
  REQUEST_TIMEOUT: 90000,

  // Server port (defaults to 3010 if not specified in environment)
  PORT: process.env.PORT || 3010,

  // Cron schedule for automated analysis (every hour at minute 0)
  ANALYSIS_INTERVAL: "0 * * * *",
};

// Initialize Express application with security and performance middleware
const app = express();

// Security middleware
app.use(helmet()); // Set security headers to protect against common vulnerabilities
app.use(cors()); // Enable Cross-Origin Resource Sharing for API access

// Performance middleware
app.use(compression()); // Compress responses to reduce bandwidth usage

// Body parsing middleware with generous limits for large data payloads
app.use(express.json({ limit: "8mb" })); // Parse JSON bodies up to 8MB
app.use(express.urlencoded({ extended: true, limit: "8mb" })); // Parse URL-encoded bodies up to 8MB

// Rate limiting middleware to prevent API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // Maximum 100 requests per window per IP
  message: { error: "Too many requests", retryAfter: 900 }, // Error message with retry time
});
app.use(limiter);

// Daily price data cache for performance optimization
// This cache stores ~900 days of daily closing prices for BTC, ETH, and SOL
// to avoid repeated API calls and improve analysis speed
const dailyClosesCache = {
  bitcoin: [], // Array of {timestamp, close} objects for Bitcoin
  ethereum: [], // Array of {timestamp, close} objects for Ethereum
  solana: [], // Array of {timestamp, close} objects for Solana
  lastFetchedAt: 0, // Timestamp of last cache refresh
};

/**
 * MarketPeakDataAggregator Class
 * ==============================
 *
 * This class manages real-time data collection and analysis for market peak detection.
 * It combines multiple data sources and provides AI-powered market peak analysis.
 *
 * Key Responsibilities:
 * - Real-time Firestore listeners for bull market peak indicators
 * - Data aggregation from multiple sources (Firestore, external APIs)
 * - AI analysis coordination via OpenRouter
 * - Result storage and retrieval
 * - Cache management for performance optimization
 */
class MarketPeakDataAggregator {
  constructor() {
    // Latest data from various sources
    this.latestData = {
      BULL_PEAK: null, // Latest bull market peak indicators from Firestore
    };

    // Active Firestore listeners for cleanup
    this.listeners = {};

    // Prompt management system for AI analysis
    this.promptManager = new PromptManager();

    // Initialize real-time data listeners
    this.initializeListeners();
  }

  /**
   * Initialize real-time Firestore listeners for data sources
   * Sets up listeners for bull market peak indicators and other data streams
   */
  initializeListeners() {
    if (!db) {
      console.warn(
        "⚠️ [FIRESTORE] Database not available, cannot initialize listeners"
      );
      return;
    }

    console.log("🔄 [FIRESTORE] Initializing snapshot listeners");

    // Set up listener for bull market peak indicators
    this.setupBullPeakLatestListener();
  }

  /**
   * Set up real-time listener for bull market peak indicators
   * This listener monitors the latest bull market peak indicators document
   * and updates the local cache whenever new data is available
   */
  setupBullPeakLatestListener() {
    try {
      console.log(
        `📡 [LISTENER] Setting up Bull Market Peak Indicators (latest)`
      );

      // Reference to the latest bull market peak indicators document
      const latestRef = db
        .collection("bull-market-peak-indicators")
        .doc("latest");

      // Set up real-time listener for document changes
      const unsubscribe = latestRef.onSnapshot(
        (doc) => {
          if (doc.exists) {
            // Document exists - update local cache with new data
            const data = { id: doc.id, ...doc.data() };
            this.latestData.BULL_PEAK = data;
            const ts = data?.timestamp || data?.collected_at || null;
            console.log(
              `✅ [LISTENER] Updated BULL_PEAK latest (${ts || "no timestamp"})`
            );
          } else {
            // Document doesn't exist - clear local cache
            console.warn(
              `⚠️ [LISTENER] No latest Bull Market Peak Indicators document`
            );
            this.latestData.BULL_PEAK = null;
          }
        },
        (error) => {
          // Error occurred - log and clear local cache
          console.error(
            `❌ [LISTENER] Error in BULL_PEAK listener:`,
            error.message
          );
          this.latestData.BULL_PEAK = null;
        }
      );

      // Store unsubscribe function for cleanup
      this.listeners["BULL_PEAK"] = unsubscribe;
    } catch (error) {
      console.error(
        `❌ [LISTENER] Failed to setup BULL_PEAK listener:`,
        error.message
      );
    }
  }

  /**
   * Generate a human-readable summary of bull market peak indicators
   * Converts the raw indicator data into a formatted string for AI analysis
   *
   * @param {Object} latestBullPeakDoc - The latest bull market peak indicators document
   * @returns {string} Formatted summary of all indicators and their status
   */
  generateBullPeakSummary(latestBullPeakDoc) {
    try {
      if (!latestBullPeakDoc || !Array.isArray(latestBullPeakDoc.indicators)) {
        return "No Bull Market Peak Indicators available";
      }

      // Format each indicator into a readable line
      const lines = latestBullPeakDoc.indicators.map((ind) => {
        const name = ind?.indicator_name || "Unknown Indicator";
        const hit = !!ind?.hit_status; // Whether the indicator has been triggered
        const value = ind?.current_value || ind?.value || "N/A";
        const threshold = ind?.threshold || "N/A";
        return `${name}: ${hit} (Value: ${value}, Threshold: ${threshold})`;
      });

      return lines.join("\n");
    } catch (e) {
      return "No Bull Market Peak Indicators available";
    }
  }

  /**
   * Fetch data from the external data service
   * @param {string} path - API endpoint path to fetch data from
   * @returns {Object} Response data from the data service
   */
  async fetchDataServiceJson(path) {
    const url = `${CONFIG.DATA_SERVICE_URL}${path}`;
    const res = await axios.get(url, { timeout: CONFIG.REQUEST_TIMEOUT });
    return res.data;
  }

  /**
   * Fetch 24-hour minute-by-minute price data for BTC, ETH, and SOL
   * This provides recent price action for short-term analysis
   * @returns {Object} Object containing 24h data for each cryptocurrency
   */
  async fetchCryptoMinuteSeries() {
    // Fetch 24h minute-by-minute data for BTC/ETH/SOL in parallel
    const requests = [
      this.fetchDataServiceJson("/bitcoin?hours=24").catch(() => null),
      this.fetchDataServiceJson("/ethereum?hours=24").catch(() => null),
      this.fetchDataServiceJson("/solana?hours=24").catch(() => null),
    ];
    const [btc24, eth24, sol24] = await Promise.all(requests);
    return { btc24, eth24, sol24 };
  }

  formatSeriesForPrompt(arr, label) {
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      return `insufficient_${label}_data`;
    }
    // Keep compact to avoid huge prompts: sample every 5th point for minute data
    const sampled = arr.filter((_, i) => i % 5 === 0);
    return JSON.stringify(sampled.slice(-288));
  }

  /**
   * Build comprehensive data object for AI analysis
   * Aggregates all data sources into a structured format for the AI prompt
   * @returns {Object} Complete data object with all market indicators and price data
   */
  async buildPromptData() {
    // Fetch recent minute-by-minute data for short-term analysis
    const [minuteSeries] = await Promise.all([this.fetchCryptoMinuteSeries()]);

    // Generate summary of bull market peak indicators
    const bullSummary = this.generateBullPeakSummary(this.latestData.BULL_PEAK);

    // Get cached daily closing prices for long-term analysis
    const btcDaily = await getCachedDailyCloses("bitcoin");
    const ethDaily = await getCachedDailyCloses("ethereum");
    const solDaily = await getCachedDailyCloses("solana");

    // Return structured data object for AI analysis
    return {
      timestamp: new Date().toISOString(),
      bull_market_peak_indicators: bullSummary,
      bull_market_peak_raw: this.latestData.BULL_PEAK || {
        note: "no_bull_peak_data",
      },
      // Bitcoin data
      bitcoin_recent_minutes_24h: this.formatSeriesForPrompt(
        minuteSeries.btc24?.prices ||
          minuteSeries.btc24?.data ||
          minuteSeries.btc24,
        "btc24"
      ),
      bitcoin_daily_900d_close: JSON.stringify(btcDaily.slice(-900)),
      // Ethereum data
      ethereum_recent_minutes_24h: this.formatSeriesForPrompt(
        minuteSeries.eth24?.prices ||
          minuteSeries.eth24?.data ||
          minuteSeries.eth24,
        "eth24"
      ),
      ethereum_daily_900d_close: JSON.stringify(ethDaily.slice(-900)),
      // Solana data
      solana_recent_minutes_24h: this.formatSeriesForPrompt(
        minuteSeries.sol24?.prices ||
          minuteSeries.sol24?.data ||
          minuteSeries.sol24,
        "sol24"
      ),
      solana_daily_900d_close: JSON.stringify(solDaily.slice(-900)),
    };
  }

  /**
   * Call the AI model via OpenRouter to analyze market peak conditions
   * @param {Object} templateData - Data object containing all market indicators and price data
   * @returns {string} Raw AI response text
   * @throws {Error} If OpenRouter API key is not configured
   */
  async callLLM(templateData) {
    if (!CONFIG.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured");
    }

    // Generate the complete prompt using the prompt manager
    const prompt = this.promptManager.getFilledPrompt(templateData);

    // Make API call to OpenRouter
    const response = await axios.post(
      CONFIG.OPENROUTER_URL,
      {
        model: CONFIG.MODEL, // AI model to use for analysis
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Low temperature for consistent analysis
        max_tokens: 20000, // Large token limit for comprehensive analysis
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: CONFIG.REQUEST_TIMEOUT, // 90 second timeout
      }
    );

    // Extract the AI response text
    const text = response.data?.choices?.[0]?.message?.content || "";
    return text;
  }

  parseJsonFromText(text) {
    if (!text || typeof text !== "string") throw new Error("Empty AI response");
    const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) return JSON.parse(fenced[1]);
    try {
      return JSON.parse(text);
    } catch (_) {}
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(text.slice(first, last + 1));
    }
    throw new Error("No JSON found in AI response");
  }

  validateOutput(obj) {
    const required = ["score", "analysis", "reasoning", "key_factors"];
    for (const k of required) if (!(k in obj)) throw new Error(`Missing: ${k}`);
    if (
      typeof obj.score !== "number" ||
      obj.score < 1 ||
      obj.score > 100 ||
      !Number.isFinite(obj.score)
    )
      throw new Error("score must be 1..100 number");
    if (!Array.isArray(obj.key_factors))
      throw new Error("key_factors must be array");
  }

  async storeResult(result) {
    if (!db) return { stored: false, reason: "firestore_not_available" };
    const doc = {
      ...result,
      timestamp: new Date().toISOString(),
      createdAt: admin.firestore.Timestamp.now(),
      service: "market-peak-analysis-service",
      serviceVersion: "1.0.0",
    };
    const ref = await db.collection(CONFIG.COLLECTIONS.STORAGE).add(doc);
    return { stored: true, id: ref.id };
  }

  /**
   * Main analysis method that orchestrates the entire market peak analysis process
   * This is the core method that combines all data sources and generates the final analysis
   * @returns {Object} Analysis result with score, reasoning, and metadata
   */
  async analyze() {
    const t0 = Date.now(); // Start timing for performance tracking

    // Step 1: Build comprehensive data object from all sources
    const templateData = await this.buildPromptData();

    // Step 2: Call AI model for analysis
    const aiText = await this.callLLM(templateData);

    // Step 3: Parse AI response into structured JSON
    const parsed = this.parseJsonFromText(aiText);

    // Step 4: Validate the output format
    this.validateOutput(parsed);

    // Step 5: Enrich with metadata
    const enriched = {
      ...parsed,
      analysis_metadata: {
        model: CONFIG.MODEL,
        data_sources: ["BULL_PEAK", "BTC", "ETH", "SOL"],
        collection_duration_ms: Date.now() - t0,
      },
    };

    // Step 6: Store result in Firestore
    const storage = await this.storeResult(enriched);

    // Step 7: Log analysis result with interpretation
    console.log(
      `📈 [ANALYSIS] Market Peak Score: ${parsed.score}/100 (${
        parsed.score >= 60
          ? "Peak Likely"
          : parsed.score >= 25
          ? "Mixed Signals"
          : "Normal"
      })`
    );

    return { success: true, analysis: enriched, storage };
  }

  async getRecent(limit = 10) {
    if (!db) return { analyses: [], error: "firestore_not_available" };
    const snap = await db
      .collection(CONFIG.COLLECTIONS.STORAGE)
      .orderBy("timestamp", "desc")
      .limit(Math.min(limit, 50))
      .get();
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    return { analyses: rows };
  }

  cleanup() {
    console.log("🧹 [CLEANUP] Removing all Firestore listeners");
    Object.values(this.listeners).forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    this.listeners = {};
  }
}

/**
 * Cache Management Functions
 * =========================
 * These functions manage the daily price data cache for performance optimization
 */

/**
 * Refresh the daily closes cache with ~900 days of historical data
 * This function fetches daily closing prices for BTC, ETH, and SOL from the data service
 * and stores them in memory for fast access during analysis
 */
async function refreshDailyClosesCache() {
  try {
    console.log("🔄 [CACHE] Refreshing ~900d daily closes for BTC/ETH/SOL...");

    // Fetch daily data for all three cryptocurrencies in parallel
    const [btcDailyResp, ethDailyResp, solDailyResp] = await Promise.all([
      axios.get(`${CONFIG.DATA_SERVICE_URL}/bitcoin/daily?days=900`, {
        timeout: 30000,
      }),
      axios.get(`${CONFIG.DATA_SERVICE_URL}/ethereum/daily?days=900`, {
        timeout: 30000,
      }),
      axios.get(`${CONFIG.DATA_SERVICE_URL}/solana/daily?days=900`, {
        timeout: 30000,
      }),
    ]);

    // Helper function to normalize and clean daily price data
    const mapDailyClose = (arr) =>
      (arr || [])
        .map((d) => ({
          timestamp: d.timestamp,
          close: d.close ?? d.price ?? d.c ?? null, // Handle different field names
        }))
        .filter((d) => Number.isFinite(d.close)) // Remove invalid data points
        .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp
        .slice(-900); // Keep only the last 900 days

    // Update cache with processed data
    dailyClosesCache.bitcoin = mapDailyClose(btcDailyResp.data?.data);
    dailyClosesCache.ethereum = mapDailyClose(ethDailyResp.data?.data);
    dailyClosesCache.solana = mapDailyClose(solDailyResp.data?.data);
    dailyClosesCache.lastFetchedAt = Date.now();

    console.log(
      `✅ [CACHE] Daily closes ready - BTC: ${dailyClosesCache.bitcoin.length}, ETH: ${dailyClosesCache.ethereum.length}, SOL: ${dailyClosesCache.solana.length}`
    );
  } catch (error) {
    console.error("❌ [CACHE] Failed to refresh daily closes:", error.message);
  }
}

/**
 * Get cached daily closing prices for a specific cryptocurrency
 * If cache is empty, attempts to refresh it before returning
 * @param {string} symbol - Cryptocurrency symbol (bitcoin, ethereum, solana)
 * @returns {Array} Array of daily closing price objects
 */
async function getCachedDailyCloses(symbol) {
  // Map symbol to cache key
  const key =
    symbol === "ethereum"
      ? "ethereum"
      : symbol === "solana"
      ? "solana"
      : "bitcoin";

  const cached = dailyClosesCache[key];

  // Return cached data if available
  if (cached && cached.length > 0) return cached;

  // Fallback: try to refresh cache if empty
  await refreshDailyClosesCache();
  return dailyClosesCache[key] || [];
}

// Initialize the main data aggregator instance
const aggregator = new MarketPeakDataAggregator();

// Initialize daily cache on startup to ensure data is available immediately
refreshDailyClosesCache();

// Schedule daily cache refresh at 2:15 AM UTC to keep data fresh
cron.schedule("15 2 * * *", async () => {
  console.log("⏰ [CRON] Daily cache refresh triggered");
  await refreshDailyClosesCache();
});

/**
 * API Routes
 * ==========
 * RESTful endpoints for interacting with the market peak analysis service
 */

/**
 * Health check endpoint
 * Returns service status, configuration, and cache information
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "market-peak-analysis-service",
    version: "1.0.0",
    firestore: !!db, // Whether Firestore is connected
    openrouter: !!CONFIG.OPENROUTER_API_KEY, // Whether OpenRouter is configured
    data_service_url: CONFIG.DATA_SERVICE_URL,
    cache_status: {
      bitcoin_daily: dailyClosesCache.bitcoin.length,
      ethereum_daily: dailyClosesCache.ethereum.length,
      solana_daily: dailyClosesCache.solana.length,
      last_cached_at: new Date(dailyClosesCache.lastFetchedAt).toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Trigger manual market peak analysis
 * POST /api/analysis/trigger
 * Manually triggers a new market peak analysis and returns the results
 */
app.post("/api/analysis/trigger", async (req, res) => {
  try {
    const result = await aggregator.analyze();
    res.json({
      triggered: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("❌ [API] trigger failed:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * Get the latest market peak analysis
 * GET /api/analysis/latest
 * Returns the most recent market peak analysis result
 */
app.get("/api/analysis/latest", async (req, res) => {
  try {
    const { analyses } = await aggregator.getRecent(1);
    res.json({
      latest: analyses[0] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get recent market peak analyses
 * GET /api/analysis/recent?limit=10
 * Returns a list of recent market peak analyses (max 50)
 */
app.get("/api/analysis/recent", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const { analyses } = await aggregator.getRecent(limit);
    res.json({
      analyses,
      count: analyses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get detailed service status and configuration
 * GET /api/status
 * Returns comprehensive service information including configuration, listeners, and cache status
 */
app.get("/api/status", (req, res) => {
  res.json({
    service: "market-peak-analysis-service",
    version: "1.0.0",
    status: "running",
    configuration: {
      analysisInterval: CONFIG.ANALYSIS_INTERVAL,
      model: CONFIG.MODEL,
      storageCollection: CONFIG.COLLECTIONS.STORAGE,
      dataServiceUrl: CONFIG.DATA_SERVICE_URL,
    },
    listeners: {
      bull_peak: !!aggregator.listeners["BULL_PEAK"],
    },
    cache: {
      bitcoin_daily: dailyClosesCache.bitcoin.length,
      ethereum_daily: dailyClosesCache.ethereum.length,
      solana_daily: dailyClosesCache.solana.length,
      last_refreshed: new Date(dailyClosesCache.lastFetchedAt).toISOString(),
    },
    uptime: process.uptime(),
  });
});

/**
 * Automated Analysis Scheduling
 * =============================
 * Schedule automated market peak analysis to run every hour
 */
cron.schedule(CONFIG.ANALYSIS_INTERVAL, async () => {
  try {
    console.log("⏰ [CRON] Starting scheduled market peak analysis");
    await aggregator.analyze();
  } catch (e) {
    console.error("❌ [CRON] Scheduled analysis failed:", e.message);
  }
});

/**
 * Server Startup and Graceful Shutdown
 * ====================================
 * Initialize the Express server and handle graceful shutdown
 */
const server = app.listen(CONFIG.PORT, () => {
  console.log("📈 [SERVER] Market Peak Analysis Service started");
  console.log(`📍 [SERVER] Port ${CONFIG.PORT}`);
  console.log(`🔗 [CONFIG] Data Service: ${CONFIG.DATA_SERVICE_URL}`);
  console.log(`⏰ [CONFIG] Analysis every hour at minute 0`);
  console.log(`📡 [CONFIG] Real-time Firestore listeners enabled`);
});

// Graceful shutdown handlers
process.on("SIGINT", () => {
  console.log("🛑 [SERVER] SIGINT received, shutting down gracefully");
  aggregator.cleanup(); // Clean up Firestore listeners
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  console.log("🛑 [SERVER] SIGTERM received, shutting down gracefully");
  aggregator.cleanup(); // Clean up Firestore listeners
  server.close(() => process.exit(0));
});

// Export the Express app for testing purposes
module.exports = { app };
