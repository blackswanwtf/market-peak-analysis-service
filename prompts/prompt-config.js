/**
 * Market Peak Prompt Manager
 * ==========================
 *
 * Author: Muhammad Bilal Motiwala
 * Project: Black Swan
 *
 * This class manages AI prompts for market peak analysis.
 * It handles loading, caching, and template filling for AI analysis prompts.
 */

const fs = require("fs");
const path = require("path");

class MarketPeakPromptManager {
  constructor() {
    this.promptsDir = path.join(__dirname); // Directory containing prompt templates
    this.currentVersion = "v1"; // Current prompt version
    this.promptCache = new Map(); // Cache for loaded prompts to improve performance
  }

  /**
   * Load a prompt template from file system with caching
   * @param {string} promptName - Name of the prompt template (default: "market-peak-analysis")
   * @param {string} version - Version of the prompt (default: current version)
   * @returns {string} The loaded prompt template
   */
  loadPromptTemplate(promptName = "market-peak-analysis", version = null) {
    const promptVersion = version || this.currentVersion;
    const cacheKey = `${promptName}-${promptVersion}`;

    // Return cached template if available
    if (this.promptCache.has(cacheKey)) return this.promptCache.get(cacheKey);

    // Load template from file system
    const promptFile = path.join(
      this.promptsDir,
      `${promptName}-${promptVersion}.md`
    );
    const template = fs.readFileSync(promptFile, "utf8");

    // Cache the template for future use
    this.promptCache.set(cacheKey, template);
    console.log(`📝 [PROMPT] Loaded ${promptName}-${promptVersion}.md`);
    return template;
  }

  /**
   * Fill a template with data by replacing placeholders
   * @param {string} template - The template string with {{placeholder}} syntax
   * @param {Object} data - Data object to fill the template with
   * @returns {string} The filled template
   */
  fillTemplate(template, data) {
    let filled = template;

    // Replace each placeholder with corresponding data
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement =
        typeof value === "object"
          ? JSON.stringify(value, null, 2) // Pretty-print objects as JSON
          : String(value); // Convert other types to string
      filled = filled.replace(new RegExp(placeholder, "g"), replacement);
    });

    return filled;
  }

  /**
   * Get a filled prompt ready for AI analysis
   * @param {Object} templateData - Data to fill the template with
   * @param {string} promptName - Name of the prompt template
   * @param {string} version - Version of the prompt template
   * @returns {string} The complete filled prompt
   */
  getFilledPrompt(
    templateData,
    promptName = "market-peak-analysis",
    version = null
  ) {
    const template = this.loadPromptTemplate(promptName, version);
    return this.fillTemplate(template, templateData);
  }
}

module.exports = MarketPeakPromptManager;
