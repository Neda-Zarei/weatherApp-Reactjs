import React from 'react';
import openaiService from './services/openaiService';

class ClothingRecommendation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: null,
      recommendations: null
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleEscapeKey);
    if (this.props.isVisible) {
      this.disableBackgroundScroll();
      this.fetchRecommendations();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.isVisible !== prevProps.isVisible) {
      if (this.props.isVisible) {
        this.disableBackgroundScroll();
        this.fetchRecommendations();
      } else {
        this.enableBackgroundScroll();
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleEscapeKey);
    this.enableBackgroundScroll();
  }

  disableBackgroundScroll = () => {
    document.body.style.overflow = 'hidden';
  };

  enableBackgroundScroll = () => {
    document.body.style.overflow = 'unset';
  };

  handleEscapeKey = (e) => {
    if (e.key === 'Escape' && this.props.isVisible) {
      this.props.onClose();
    }
  };

  fetchRecommendations = async () => {
    this.setState({ loading: true, error: null });

    try {
      const weatherData = {
        temperature: this.props.weatherData.temperatureC,
        description: this.props.weatherData.main || this.props.weatherData.description,
        humidity: this.props.weatherData.humidity || 50,
        location: `${this.props.weatherData.city}, ${this.props.weatherData.country}`
      };

      // Add timeout to the API call
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 30000) // 30 second timeout
      );

      const recommendationsPromise = openaiService.getClothingRecommendations(weatherData);

      const recommendations = await Promise.race([recommendationsPromise, timeoutPromise]);
      this.setState({ recommendations, loading: false });
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);

      const errorMessage = this.getErrorMessage(error);

      this.setState({
        error: errorMessage,
        loading: false,
        recommendations: this.getFallbackRecommendations()
      });
    }
  };

  getErrorMessage = (error) => {
    const errorString = error.message?.toLowerCase() || error.toString().toLowerCase();

    // Rate limit errors
    if (errorString.includes('rate limit') || errorString.includes('429')) {
      return 'Too many requests right now. Please wait a moment and try again.';
    }

    // Authentication errors
    if (errorString.includes('unauthorized') || errorString.includes('401') || errorString.includes('invalid api key')) {
      return 'Service temporarily unavailable. Using quick recommendations instead.';
    }

    // Network/timeout errors
    if (errorString.includes('network') || errorString.includes('timeout') || errorString.includes('fetch')) {
      return 'Connection issue detected. Using offline recommendations.';
    }

    // Quota exceeded
    if (errorString.includes('quota') || errorString.includes('billing')) {
      return 'AI service limit reached. Showing smart recommendations based on weather patterns.';
    }

    // Server errors
    if (errorString.includes('500') || errorString.includes('502') || errorString.includes('503')) {
      return 'Service temporarily down. Using weather-based recommendations.';
    }

    // Generic fallback
    return 'Unable to get AI recommendations right now. Using smart weather-based suggestions.';
  };

  retryRecommendations = () => {
    this.fetchRecommendations();
  };

  getTemperatureRange = (temp) => {
    if (temp < 0) return 'freezing';
    if (temp < 10) return 'cold';
    if (temp < 20) return 'cool';
    if (temp < 25) return 'mild';
    if (temp < 30) return 'warm';
    return 'hot';
  };

  getFallbackRecommendations = () => {
    const { temperatureC, main, humidity } = this.props.weatherData;
    const tempRange = this.getTemperatureRange(temperatureC);
    const weatherCondition = main ? main.toLowerCase() : '';

    let recommendations = {
      essentials: [],
      footwear: [],
      accessories: [],
      tip: ''
    };

    // Base clothing by temperature
    switch (tempRange) {
      case 'freezing':
        recommendations.essentials = ['Heavy winter coat', 'Thermal underwear', 'Warm sweater', 'Insulated pants'];
        recommendations.footwear = ['Insulated winter boots'];
        recommendations.accessories = ['Warm hat', 'Insulated gloves', 'Scarf'];
        recommendations.tip = 'Layer up and cover exposed skin to prevent frostbite';
        break;
      case 'cold':
        recommendations.essentials = ['Warm jacket', 'Long-sleeve shirt', 'Jeans or warm pants'];
        recommendations.footwear = ['Closed-toe shoes or boots'];
        recommendations.accessories = ['Light hat', 'Gloves'];
        recommendations.tip = 'Layers are key - you can remove them as you warm up';
        break;
      case 'cool':
        recommendations.essentials = ['Light jacket or cardigan', 'Long-sleeve shirt', 'Comfortable pants'];
        recommendations.footwear = ['Comfortable walking shoes'];
        recommendations.accessories = [];
        recommendations.tip = 'Perfect weather for layering - bring a light jacket';
        break;
      case 'mild':
        recommendations.essentials = ['Light shirt or t-shirt', 'Comfortable pants or shorts'];
        recommendations.footwear = ['Sneakers or comfortable shoes'];
        recommendations.accessories = ['Sunglasses'];
        recommendations.tip = 'Great weather for outdoor activities';
        break;
      case 'warm':
        recommendations.essentials = ['Light t-shirt', 'Shorts or light pants'];
        recommendations.footwear = ['Breathable shoes or sandals'];
        recommendations.accessories = ['Sunglasses', 'Light hat'];
        recommendations.tip = 'Stay cool and hydrated';
        break;
      case 'hot':
        recommendations.essentials = ['Lightweight breathable shirt', 'Shorts', 'Tank top (optional)'];
        recommendations.footwear = ['Breathable sandals or lightweight shoes'];
        recommendations.accessories = ['Sun hat', 'Sunglasses', 'Sunscreen'];
        recommendations.tip = 'Stay hydrated and seek shade during peak sun hours';
        break;
      default:
        recommendations.essentials = ['Comfortable clothing'];
        recommendations.footwear = ['Comfortable shoes'];
        recommendations.tip = 'Dress comfortably for the weather';
    }

    // Weather-specific modifications
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
      recommendations.accessories = [...recommendations.accessories, 'Umbrella', 'Rain jacket'];
      recommendations.footwear = ['Waterproof shoes or boots'];
      recommendations.tip = 'Stay dry and watch for slippery surfaces';
    } else if (weatherCondition.includes('snow')) {
      recommendations.accessories = [...recommendations.accessories.filter(item => !item.includes('hat')), 'Warm hat', 'Waterproof gloves'];
      recommendations.footwear = ['Waterproof winter boots with good traction'];
      recommendations.tip = 'Dress in layers and watch for icy conditions';
    } else if (weatherCondition.includes('wind')) {
      if (!recommendations.essentials.some(item => item.includes('jacket'))) {
        recommendations.essentials.push('Windbreaker');
      }
      recommendations.tip = 'Secure loose clothing and accessories in windy conditions';
    }

    // High humidity adjustment
    if (humidity > 70) {
      recommendations.tip = 'High humidity - choose breathable, moisture-wicking fabrics';
    }

    return recommendations;
  };

  renderLoadingState() {
    const loadingMessages = [
      'Analyzing weather conditions...',
      'Consulting AI fashion advisor...',
      'Personalizing recommendations...',
      'Almost ready with your outfit suggestions...'
    ];

    // Cycle through messages every 3 seconds
    const messageIndex = Math.floor((Date.now() / 3000) % loadingMessages.length);

    return (
      <div className="recommendations-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="loading-message">{loadingMessages[messageIndex]}</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
          <p className="loading-subtext">This usually takes just a few seconds</p>
        </div>
      </div>
    );
  }

  renderErrorState() {
    return (
      <div className="recommendations-content">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h4>Oops! Something went wrong</h4>
          <p>{this.state.error}</p>
          <button className="retry-btn" onClick={this.retryRecommendations}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  renderRecommendations() {
    const recommendations = this.state.recommendations;
    if (!recommendations) return null;

    return (
      <div className="recommendations-content">
        {this.state.error && !recommendations.fallback && (
          <div className="ai-notice">
            <p>🤖 Using AI-powered recommendations</p>
          </div>
        )}

        {recommendations.fallback && (
          <div className="fallback-notice">
            <p>⚡ Using quick recommendations (AI service unavailable)</p>
          </div>
        )}

        <div className="recommendation-section">
          <h5>👕 Essential Clothing:</h5>
          <ul>
            {recommendations.essentials.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="recommendation-section">
          <h5>👟 Footwear:</h5>
          {Array.isArray(recommendations.footwear) ? (
            <ul>
              {recommendations.footwear.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{recommendations.footwear}</p>
          )}
        </div>

        {recommendations.accessories && recommendations.accessories.length > 0 && (
          <div className="recommendation-section">
            <h5>🎒 Accessories:</h5>
            <ul>
              {recommendations.accessories.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.tip && (
          <div className="recommendation-tip">
            <h5>💡 Tip:</h5>
            <p>{recommendations.tip}</p>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (!this.props.isVisible) return null;

    const { temperatureC, city, main } = this.props.weatherData;
    const { loading, error, recommendations } = this.state;

    return (
      <div className="clothing-recommendation-overlay" onClick={this.props.onClose}>
        <div className="clothing-recommendation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Outfit Recommendation</h3>
            <button className="close-btn" onClick={this.props.onClose} aria-label="Close recommendation">
              ×
            </button>
          </div>

          <div className="weather-summary">
            <h4>{city} - {temperatureC}°C</h4>
            <p>Current conditions: {main}</p>
          </div>

          {loading && this.renderLoadingState()}
          {error && !recommendations && this.renderErrorState()}
          {recommendations && this.renderRecommendations()}

          <div className="modal-footer">
            <button className="got-it-btn" onClick={this.props.onClose}>
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ClothingRecommendation;