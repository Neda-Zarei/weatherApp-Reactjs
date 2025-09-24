const OpenAI = require('openai');
const apiKeys = require('../apiKeys');

class OpenAIService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    try {
      if (!apiKeys.openaiApiKey || apiKeys.openaiApiKey === 'your-openai-api-key-here') {
        throw new Error('OpenAI API key not configured. Please set REACT_APP_OPENAI_API_KEY environment variable or update apiKeys.js');
      }

      this.client = new OpenAI({
        apiKey: apiKeys.openaiApiKey,
        dangerouslyAllowBrowser: true
      });

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error.message);
      this.initialized = false;
      return false;
    }
  }

  async testConnection() {
    if (!this.initialized) {
      const success = this.initialize();
      if (!success) {
        throw new Error('OpenAI client not initialized');
      }
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello! Please respond with 'Connection successful'" }],
        model: "gpt-3.5-turbo",
        max_tokens: 10
      });

      return completion.choices[0]?.message?.content || 'Connection test completed';
    } catch (error) {
      console.error('OpenAI API test failed:', error);
      throw new Error(`OpenAI API connection failed: ${error.message}`);
    }
  }

  async getClothingRecommendations(weatherData, userPreferences = {}) {
    if (!this.initialized) {
      const success = this.initialize();
      if (!success) {
        throw new Error('OpenAI client not initialized');
      }
    }

    try {
      const prompt = this.buildClothingPrompt(weatherData, userPreferences);

      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 200,
        temperature: 0.7
      });

      return this.parseClothingResponse(completion.choices[0]?.message?.content || '');
    } catch (error) {
      console.error('Failed to get clothing recommendations:', error);
      throw new Error(`Clothing recommendations failed: ${error.message}`);
    }
  }

  buildClothingPrompt(weatherData, userPreferences) {
    const { temperature, description, humidity } = weatherData;
    const tempUnit = userPreferences.temperatureUnit || 'Celsius';

    return `Based on the current weather conditions:
- Temperature: ${temperature}°${tempUnit}
- Weather: ${description}
- Humidity: ${humidity}%

Please provide clothing recommendations that are appropriate for these conditions. Include:
1. Essential clothing items (top, bottom, outerwear if needed)
2. Footwear suggestions
3. Accessories (umbrella, hat, sunglasses, etc.)

Keep the response concise and practical. Format as a simple list.`;
  }

  parseClothingResponse(response) {
    return {
      recommendations: response.trim(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new OpenAIService();