const OpenAI = require('openai');
const apiKeys = require('../apiKeys');

class OpenAIService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
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
    // Input validation
    this.validateWeatherData(weatherData);

    if (!this.initialized) {
      const success = this.initialize();
      if (!success) {
        throw new Error('OpenAI client not initialized');
      }
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(weatherData, userPreferences);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const result = await this.makeRecommendationRequest(weatherData, userPreferences);
      // Cache the result
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to get clothing recommendations:', error);
      return this.getFallbackRecommendations(weatherData);
    }
  }

  buildClothingPrompt(weatherData, userPreferences) {
    const { temperature, description, humidity, windSpeed, location } = weatherData;
    const tempUnit = userPreferences.temperatureUnit || 'Celsius';
    const windInfo = windSpeed ? `\n- Wind Speed: ${windSpeed} km/h` : '';
    const locationInfo = location ? `\n- Location: ${location}` : '';

    return `You are a fashion advisor providing practical clothing recommendations. Based on these weather conditions:
- Temperature: ${temperature}°${tempUnit}
- Weather: ${description}
- Humidity: ${humidity}%${windInfo}${locationInfo}

Provide specific clothing recommendations in this exact format:

**ESSENTIALS:**
• [List essential clothing items]

**FOOTWEAR:**
• [Footwear recommendation]

**ACCESSORIES:**
• [List accessories if needed]

**TIP:**
• [One practical tip for the weather]

Be specific about clothing types (e.g., "cotton t-shirt" not just "shirt"). Consider comfort, practicality, and weather protection. Keep recommendations concise but detailed.`;
  }

  parseClothingResponse(response) {
    const sections = {
      essentials: [],
      footwear: [],
      accessories: [],
      tip: ''
    };

    const lines = response.trim().split('\n');
    let currentSection = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('**ESSENTIALS:**')) {
        currentSection = 'essentials';
      } else if (trimmed.includes('**FOOTWEAR:**')) {
        currentSection = 'footwear';
      } else if (trimmed.includes('**ACCESSORIES:**')) {
        currentSection = 'accessories';
      } else if (trimmed.includes('**TIP:**')) {
        currentSection = 'tip';
      } else if (trimmed.startsWith('•') && currentSection) {
        const item = trimmed.substring(1).trim();
        if (currentSection === 'tip') {
          sections.tip = item;
        } else if (sections[currentSection]) {
          sections[currentSection].push(item);
        }
      }
    });

    return {
      essentials: sections.essentials,
      footwear: sections.footwear,
      accessories: sections.accessories,
      tip: sections.tip,
      rawResponse: response.trim(),
      timestamp: new Date().toISOString()
    };
  }

  validateWeatherData(weatherData) {
    if (!weatherData || typeof weatherData !== 'object') {
      throw new Error('Weather data is required and must be an object');
    }

    const { temperature, description, humidity } = weatherData;

    if (temperature === undefined || temperature === null) {
      throw new Error('Temperature is required in weather data');
    }

    if (typeof temperature !== 'number' || temperature < -100 || temperature > 60) {
      throw new Error('Temperature must be a valid number between -100 and 60 degrees Celsius');
    }

    if (!description || typeof description !== 'string') {
      throw new Error('Weather description is required and must be a string');
    }

    if (humidity !== undefined && (typeof humidity !== 'number' || humidity < 0 || humidity > 100)) {
      throw new Error('Humidity must be a number between 0 and 100');
    }
  }

  generateCacheKey(weatherData, userPreferences) {
    const key = {
      temp: Math.round(weatherData.temperature / 5) * 5, // Round to nearest 5 degrees
      desc: weatherData.description?.toLowerCase(),
      humidity: weatherData.humidity ? Math.round(weatherData.humidity / 10) * 10 : 0, // Round to nearest 10%
      tempUnit: userPreferences.temperatureUnit || 'Celsius'
    };
    return JSON.stringify(key);
  }

  getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return {
        ...cached.data,
        fromCache: true
      };
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  setCachedResult(cacheKey, result) {
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }

  async makeRecommendationRequest(weatherData, userPreferences, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    try {
      const prompt = this.buildClothingPrompt(weatherData, userPreferences);

      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 300,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Empty response from OpenAI API');
      }

      return this.parseClothingResponse(response);
    } catch (error) {
      console.error(`API request failed (attempt ${retryCount + 1}):`, error.message);

      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.makeRecommendationRequest(weatherData, userPreferences, retryCount + 1);
      }

      throw error;
    }
  }

  isRetryableError(error) {
    const retryableErrors = [
      'rate_limit_exceeded',
      'timeout',
      'network',
      'temporary',
      'server_error'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError) ||
      errorMessage.includes('429') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502')
    );
  }

  getFallbackRecommendations(weatherData) {
    const { temperature, description } = weatherData;
    const temp = temperature || 20;
    const weather = description?.toLowerCase() || '';

    let essentials = [];
    let footwear = [];
    let accessories = [];
    let tip = '';

    // Temperature-based recommendations
    if (temp < 0) {
      essentials = ['Heavy winter coat', 'Thermal underwear', 'Warm sweater', 'Insulated pants'];
      footwear = ['Insulated winter boots with good grip'];
      accessories = ['Warm hat', 'Insulated gloves', 'Scarf'];
      tip = 'Layer up and cover exposed skin to prevent frostbite';
    } else if (temp < 10) {
      essentials = ['Warm jacket', 'Long-sleeve shirt', 'Jeans or warm pants'];
      footwear = ['Closed-toe shoes or boots'];
      accessories = ['Light hat', 'Gloves if needed'];
      tip = 'Layers are key - you can remove them as you warm up';
    } else if (temp < 20) {
      essentials = ['Light jacket or cardigan', 'Long-sleeve shirt', 'Comfortable pants'];
      footwear = ['Comfortable walking shoes'];
      accessories = [];
      tip = 'Perfect weather for layering - bring a light jacket';
    } else if (temp < 30) {
      essentials = ['Light shirt or t-shirt', 'Comfortable pants or shorts'];
      footwear = ['Breathable sneakers or sandals'];
      accessories = ['Sunglasses', 'Light hat'];
      tip = 'Great weather for outdoor activities';
    } else {
      essentials = ['Lightweight, breathable clothing', 'Shorts', 'Tank top or light shirt'];
      footwear = ['Breathable sandals or lightweight shoes'];
      accessories = ['Sun hat', 'Sunglasses', 'Sunscreen'];
      tip = 'Stay hydrated and seek shade during peak sun hours';
    }

    // Weather-specific additions
    if (weather.includes('rain') || weather.includes('drizzle')) {
      accessories.push('Umbrella or rain jacket');
      footwear = ['Waterproof shoes or boots'];
      tip = 'Stay dry and watch for slippery surfaces';
    } else if (weather.includes('snow')) {
      accessories.push('Warm hat', 'Waterproof gloves');
      footwear = ['Waterproof winter boots with good traction'];
      tip = 'Dress in layers and watch for icy conditions';
    } else if (weather.includes('wind')) {
      accessories.push('Windbreaker or wind-resistant jacket');
      tip = 'Secure loose clothing and accessories in windy conditions';
    }

    return {
      essentials: essentials,
      footwear: footwear,
      accessories: accessories,
      tip: tip,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }
}

module.exports = new OpenAIService();