import React from 'react';

class ClothingRecommendation extends React.Component {
  getTemperatureRange = (temp) => {
    if (temp < 0) return 'freezing';
    if (temp < 10) return 'cold';
    if (temp < 20) return 'cool';
    if (temp < 25) return 'mild';
    if (temp < 30) return 'warm';
    return 'hot';
  };

  getClothingRecommendations = () => {
    const { temperatureC, main, humidity } = this.props.weatherData;
    const tempRange = this.getTemperatureRange(temperatureC);
    const weatherCondition = main ? main.toLowerCase() : '';

    let recommendations = {
      essentials: [],
      footwear: '',
      accessories: [],
      tip: ''
    };

    // Base clothing by temperature
    switch (tempRange) {
      case 'freezing':
        recommendations.essentials = ['Heavy winter coat', 'Thermal underwear', 'Warm sweater', 'Insulated pants'];
        recommendations.footwear = 'Insulated winter boots';
        recommendations.accessories = ['Warm hat', 'Insulated gloves', 'Scarf'];
        recommendations.tip = 'Layer up and cover exposed skin to prevent frostbite';
        break;
      case 'cold':
        recommendations.essentials = ['Warm jacket', 'Long-sleeve shirt', 'Jeans or warm pants'];
        recommendations.footwear = 'Closed-toe shoes or boots';
        recommendations.accessories = ['Light hat', 'Gloves'];
        recommendations.tip = 'Layers are key - you can remove them as you warm up';
        break;
      case 'cool':
        recommendations.essentials = ['Light jacket or cardigan', 'Long-sleeve shirt', 'Comfortable pants'];
        recommendations.footwear = 'Comfortable walking shoes';
        recommendations.accessories = [];
        recommendations.tip = 'Perfect weather for layering - bring a light jacket';
        break;
      case 'mild':
        recommendations.essentials = ['Light shirt or t-shirt', 'Comfortable pants or shorts'];
        recommendations.footwear = 'Sneakers or comfortable shoes';
        recommendations.accessories = ['Sunglasses'];
        recommendations.tip = 'Great weather for outdoor activities';
        break;
      case 'warm':
        recommendations.essentials = ['Light t-shirt', 'Shorts or light pants'];
        recommendations.footwear = 'Breathable shoes or sandals';
        recommendations.accessories = ['Sunglasses', 'Light hat'];
        recommendations.tip = 'Stay cool and hydrated';
        break;
      case 'hot':
        recommendations.essentials = ['Lightweight breathable shirt', 'Shorts', 'Tank top (optional)'];
        recommendations.footwear = 'Breathable sandals or lightweight shoes';
        recommendations.accessories = ['Sun hat', 'Sunglasses', 'Sunscreen'];
        recommendations.tip = 'Stay hydrated and seek shade during peak sun hours';
        break;
      default:
        recommendations.essentials = ['Comfortable clothing'];
        recommendations.footwear = 'Comfortable shoes';
        recommendations.tip = 'Dress comfortably for the weather';
    }

    // Weather-specific modifications
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
      recommendations.accessories = [...recommendations.accessories, 'Umbrella', 'Rain jacket'];
      recommendations.footwear = 'Waterproof shoes or boots';
      recommendations.tip = 'Stay dry and watch for slippery surfaces';
    } else if (weatherCondition.includes('snow')) {
      recommendations.accessories = [...recommendations.accessories.filter(item => !item.includes('hat')), 'Warm hat', 'Waterproof gloves'];
      recommendations.footwear = 'Waterproof winter boots with good traction';
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

  render() {
    if (!this.props.isVisible) return null;

    const recommendations = this.getClothingRecommendations();
    const { temperatureC, city, main } = this.props.weatherData;

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

          <div className="recommendations-content">
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
              <p>{recommendations.footwear}</p>
            </div>

            {recommendations.accessories.length > 0 && (
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