# Market Peak Analysis Service

**Author:** Muhammad Bilal Motiwala  
**Project:** Black Swan  
**Version:** 1.0.0  
**License:** MIT

## Overview

The Market Peak Analysis Service is an AI-powered microservice that determines whether the cryptocurrency market has reached a cycle peak. It combines multiple data sources including bull market peak indicators, real-time price data for BTC/ETH/SOL, and historical price analysis to provide comprehensive market peak assessments.

### Key Features

- **Real-time Data Integration**: Live Firestore listeners for bull market peak indicators
- **Multi-Asset Analysis**: Comprehensive analysis of Bitcoin, Ethereum, and Solana
- **AI-Powered Insights**: Advanced AI analysis using GPT models via OpenRouter
- **Performance Optimized**: Cached daily price data with automatic refresh
- **RESTful API**: Complete API for triggering and retrieving analyses
- **Automated Scheduling**: Hourly automated analysis via cron jobs
- **Production Ready**: Security headers, rate limiting, and graceful shutdown

## Architecture

### Data Sources

1. **Bull Market Peak Indicators** (Firestore)

   - Real-time indicators from CoinGlass-derived data
   - Monitored via Firestore snapshot listeners
   - Updates automatically when new data arrives

2. **Cryptocurrency Price Data** (External Data Service)

   - 24-hour minute-by-minute data for BTC, ETH, SOL
   - ~900 days of daily closing prices (cached)
   - Fetched from external data collection service

3. **AI Analysis** (OpenRouter)
   - GPT-5-mini model for market analysis
   - Comprehensive prompt engineering for peak detection
   - Structured JSON output with scoring and reasoning

### Service Components

```
┌──────────────────────────────────────────────────────────────┐
│                  Market Peak Analysis Service                │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Firestore     │  │  Data Service   │  │  OpenRouter  │  │
│  │   Listeners     │  │   Integration   │  │     AI       │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                     │                    │       │
│           └─────────────────────┼────────────────────┘       │
│                                 │                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 MarketPeakDataAggregator               │  │
│  │  • Real-time data collection                           │  │
│  │  • Data aggregation and formatting                     │  │
│  │  • AI analysis coordination                            │  │
│  │  • Result storage and retrieval                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                 │                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Express API Server                  │  │
│  │  • RESTful endpoints                                   │  │
│  │  • Security middleware                                 │  │
│  │  • Rate limiting                                       │  │
│  │  • Health monitoring                                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Firebase Project**: With Firestore enabled
- **OpenRouter Account**: For AI analysis
- **Data Service**: External service providing crypto price data

### Setup Steps

1. **Clone and Install Dependencies**

   ```bash
   git clone <repository-url>
   cd market-peak-analysis-service
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration values
   ```

3. **Firebase Setup**

   - Download your Firebase service account key
   - Place it as `serviceAccountKey.json` in the root directory
   - Ensure Firestore is enabled in your Firebase project

4. **Start the Service**

   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## Configuration

### Environment Variables

| Variable             | Description                             | Required | Default             |
| -------------------- | --------------------------------------- | -------- | ------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI analysis      | Yes      | -                   |
| `DATA_SERVICE_URL`   | Base URL of the data collection service | Yes      | -                   |
| `PORT`               | Server port number                      | No       | 3010                |
| `ANALYSIS_INTERVAL`  | Cron expression for automated analysis  | No       | "0 \* \* \* \*"     |
| `MODEL`              | AI model to use for analysis            | No       | "openai/gpt-5-mini" |
| `REQUEST_TIMEOUT`    | API request timeout in milliseconds     | No       | 90000               |

### Firebase Collections

The service expects the following Firestore collections:

- **`bull-market-peak-indicators/latest`**: Latest bull market peak indicators
- **`market_peak_analyses`**: Storage for completed analyses

### Data Service Endpoints

The external data service should provide these endpoints:

- `GET /bitcoin?hours=24` - 24h minute data for Bitcoin
- `GET /ethereum?hours=24` - 24h minute data for Ethereum
- `GET /solana?hours=24` - 24h minute data for Solana
- `GET /bitcoin/daily?days=900` - Daily data for Bitcoin
- `GET /ethereum/daily?days=900` - Daily data for Ethereum
- `GET /solana/daily?days=900` - Daily data for Solana

## API Documentation

### Base URL

```
http://localhost:3010
```

### Endpoints

#### Health Check

```http
GET /health
```

Returns service health status and configuration information.

**Response:**

```json
{
  "status": "healthy",
  "service": "market-peak-analysis-service",
  "version": "1.0.0",
  "firestore": true,
  "openrouter": true,
  "data_service_url": "http://localhost:3000",
  "cache_status": {
    "bitcoin_daily": 900,
    "ethereum_daily": 900,
    "solana_daily": 900,
    "last_cached_at": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Service Status

```http
GET /api/status
```

Returns detailed service status including configuration, listeners, and cache information.

**Response:**

```json
{
  "service": "market-peak-analysis-service",
  "version": "1.0.0",
  "status": "running",
  "configuration": {
    "analysisInterval": "0 * * * *",
    "model": "openai/gpt-5-mini",
    "storageCollection": "market_peak_analyses",
    "dataServiceUrl": "http://localhost:3000"
  },
  "listeners": {
    "bull_peak": true
  },
  "cache": {
    "bitcoin_daily": 900,
    "ethereum_daily": 900,
    "solana_daily": 900,
    "last_refreshed": "2024-01-15T10:30:00.000Z"
  },
  "uptime": 3600
}
```

#### Trigger Analysis

```http
POST /api/analysis/trigger
```

Manually triggers a new market peak analysis.

**Response:**

```json
{
  "triggered": true,
  "success": true,
  "analysis": {
    "score": 45,
    "analysis": "The market shows mixed signals with some indicators suggesting elevated risk...",
    "reasoning": "Based on the current cycle position and peak indicators...",
    "key_factors": [
      "Bull market indicators showing 4/12 triggered",
      "BTC trading 15x above cycle lows",
      "Recent parabolic moves in altcoins",
      "High social sentiment and mainstream adoption"
    ],
    "analysis_metadata": {
      "model": "openai/gpt-5-mini",
      "data_sources": ["BULL_PEAK", "BTC", "ETH", "SOL"],
      "collection_duration_ms": 2500
    }
  },
  "storage": {
    "stored": true,
    "id": "analysis_123456789"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Get Latest Analysis

```http
GET /api/analysis/latest
```

Retrieves the most recent market peak analysis.

**Response:**

```json
{
  "latest": {
    "id": "analysis_123456789",
    "score": 45,
    "analysis": "The market shows mixed signals...",
    "reasoning": "Based on the current cycle position...",
    "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
    "timestamp": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "service": "market-peak-analysis-service",
    "serviceVersion": "1.0.0"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Get Recent Analyses

```http
GET /api/analysis/recent?limit=10
```

Retrieves a list of recent market peak analyses.

**Query Parameters:**

- `limit` (optional): Number of analyses to return (max 50, default 10)

**Response:**

```json
{
  "analyses": [
    {
      "id": "analysis_123456789",
      "score": 45,
      "analysis": "The market shows mixed signals...",
      "reasoning": "Based on the current cycle position...",
      "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Analysis Scoring System

The service provides a score from 1-100 indicating market peak likelihood:

### Score Ranges

| Score Range | Interpretation          | Description                                     |
| ----------- | ----------------------- | ----------------------------------------------- |
| 1-9         | Far From Peak           | Early to mid bull market, healthy corrections   |
| 10-19       | Early Warning Signs     | Mid to late bull market, some concerns          |
| 20-34       | Elevated Concerns       | Late bull market, parabolic moves               |
| 35-49       | Peak Formation Possible | Potential peak zone, multiple indicators        |
| 50-69       | Peak Likely             | Clear peak zone, extreme readings               |
| 70-84       | Peak Confirmed          | Nearly all indicators triggered                 |
| 85-100      | Peak Behind Us          | All indicators triggered, bear market beginning |

### Analysis Components

Each analysis includes:

- **Score**: Numerical assessment (1-100)
- **Analysis**: Natural language description of market conditions
- **Reasoning**: Detailed explanation of the assessment
- **Key Factors**: 3-6 most important factors driving the score

## Development

### Project Structure

```
market-peak-analysis-service/
├── index.js                    # Main service file
├── package.json               # Dependencies and scripts
├── .env.example              # Environment configuration template
├── serviceAccountKey.json    # Firebase service account (not in repo)
├── prompts/                  # AI prompt templates
│   ├── prompt-config.js      # Prompt management system
│   └── market-peak-analysis-v1.md  # Main analysis prompt
└── README.md                 # This documentation
```

### Key Classes

#### MarketPeakDataAggregator

Main class that orchestrates data collection and analysis:

- Real-time Firestore listeners
- Data aggregation from multiple sources
- AI analysis coordination
- Result storage and retrieval

#### MarketPeakPromptManager

Manages AI prompts and template filling:

- Prompt loading and caching
- Template variable substitution
- Version management

### Adding New Data Sources

1. **Add Firestore Listener** (if applicable):

   ```javascript
   setupNewDataListener() {
     const ref = db.collection("new-collection").doc("latest");
     const unsubscribe = ref.onSnapshot(/* handler */);
     this.listeners["NEW_DATA"] = unsubscribe;
   }
   ```

2. **Update Data Aggregation**:

   ```javascript
   async buildPromptData() {
     // Add new data source
     const newData = await this.fetchNewData();
     return {
       // ... existing data
       new_data_source: newData
     };
   }
   ```

3. **Update Prompt Template**:
   Add new data placeholders to `prompts/market-peak-analysis-v1.md`

### Customizing Analysis

#### Modifying the AI Model

```javascript
// In CONFIG object
MODEL: "openai/gpt-4"; // or any other OpenRouter model
```

#### Changing Analysis Frequency

```javascript
// In CONFIG object
ANALYSIS_INTERVAL: "0 */2 * * *"; // Every 2 hours
```

#### Custom Scoring Logic

Modify the prompt template in `prompts/market-peak-analysis-v1.md` to adjust scoring criteria and analysis framework.

## Monitoring and Logging

### Log Levels

The service uses structured logging with emojis for easy identification:

- 🔄 **Initialization**: Service startup and configuration
- 📡 **Listeners**: Firestore listener events
- 📈 **Analysis**: Analysis results and scores
- ⏰ **Cron**: Scheduled task execution
- ✅ **Success**: Successful operations
- ⚠️ **Warning**: Non-critical issues
- ❌ **Error**: Critical errors and failures

### Health Monitoring

Monitor these endpoints for service health:

- `GET /health` - Basic health check
- `GET /api/status` - Detailed status information

### Key Metrics to Monitor

- **Analysis Success Rate**: Percentage of successful analyses
- **Data Freshness**: Time since last data update
- **Cache Performance**: Cache hit rates and refresh frequency
- **API Response Times**: Endpoint performance
- **Error Rates**: Failed requests and analysis errors

## Security Considerations

### Environment Security

- Never commit `.env` files to version control
- Use strong, unique API keys
- Rotate credentials regularly
- Monitor API usage for anomalies

### API Security

- Rate limiting enabled (100 requests per 15 minutes)
- Security headers via Helmet middleware
- CORS configuration for cross-origin requests
- Input validation and sanitization

### Data Security

- Firebase service account keys stored securely
- Encrypted data transmission (HTTPS)
- Regular security updates for dependencies

## Troubleshooting

### Common Issues

#### Service Won't Start

1. Check environment variables are set correctly
2. Verify `serviceAccountKey.json` is present and valid
3. Ensure all dependencies are installed
4. Check port availability

#### Analysis Failures

1. Verify OpenRouter API key is valid and has credits
2. Check data service connectivity
3. Review Firestore permissions
4. Check logs for specific error messages

#### Data Not Updating

1. Verify Firestore listeners are active
2. Check data service endpoints are responding
3. Review cache refresh schedule
4. Monitor listener connection status

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

### Performance Issues

1. **Slow Analysis**: Check AI model response times
2. **High Memory Usage**: Monitor cache sizes and data volumes
3. **API Timeouts**: Adjust `REQUEST_TIMEOUT` configuration

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- Use consistent indentation (2 spaces)
- Add comprehensive comments
- Follow existing naming conventions
- Include error handling
- Update documentation

### Testing

```bash
# Run the service in development mode
npm run dev

# Test API endpoints
curl http://localhost:3010/health
curl -X POST http://localhost:3010/api/analysis/trigger
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Contact: Muhammad Bilal Motiwala
- Project: Black Swan

## Changelog

### Version 1.0.0

- Initial release
- Real-time Firestore integration
- AI-powered market peak analysis
- RESTful API endpoints
- Automated scheduling
- Comprehensive documentation
