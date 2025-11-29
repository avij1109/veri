/**
 * VeriAI Agent Integration for Chrome Extension
 * 
 * This file shows how to integrate the autonomous agent API
 * into the Chrome extension overlay and popup.
 */

// =============================================================================
// AGENT API CLIENT
// =============================================================================

class VeriAIAgentClient {
  constructor(baseUrl = 'http://localhost:5000/api/agent') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get trust score and latest insight for a model
   */
  async getTrustData(modelSlug) {
    try {
      const response = await fetch(`${this.baseUrl}/trust/${modelSlug}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('[Agent Client] Error fetching trust data:', error);
      return null;
    }
  }

  /**
   * Get insights history for a model
   */
  async getInsights(modelSlug, limit = 5) {
    try {
      const response = await fetch(`${this.baseUrl}/insights/${modelSlug}?limit=${limit}`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('[Agent Client] Error fetching insights:', error);
      return [];
    }
  }

  /**
   * Trigger manual analysis for a model
   */
  async analyzeModel(modelSlug) {
    try {
      const response = await fetch(`${this.baseUrl}/analyze/${modelSlug}`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('[Agent Client] Error triggering analysis:', error);
      return null;
    }
  }

  /**
   * Get on-chain ratings for a model
   */
  async getRatings(modelSlug, limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/ratings/${modelSlug}?limit=${limit}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('[Agent Client] Error fetching ratings:', error);
      return null;
    }
  }

  /**
   * Check agent health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('[Agent Client] Health check failed:', error);
      return false;
    }
  }
}

// =============================================================================
// OVERLAY INTEGRATION (content-script.js)
// =============================================================================

async function enhanceOverlayWithAgent(modelSlug, overlay) {
  const agentClient = new VeriAIAgentClient();
  
  // Get trust data
  const trustData = await agentClient.getTrustData(modelSlug);
  
  if (!trustData || !trustData.latestInsight) {
    // No insight yet, trigger analysis
    overlay.innerHTML += `
      <div class="agent-section">
        <button id="veriai-analyze-btn" class="analyze-button">
          🤖 Analyze with AI Agent
        </button>
      </div>
    `;
    
    document.getElementById('veriai-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('veriai-analyze-btn');
      btn.textContent = '⏳ Analyzing...';
      btn.disabled = true;
      
      await agentClient.analyzeModel(modelSlug);
      
      // Refresh overlay after analysis
      setTimeout(() => location.reload(), 2000);
    });
    
    return;
  }
  
  const insight = trustData.latestInsight;
  
  // Add risk badge
  const riskColor = {
    'LOW': '#10b981',
    'MEDIUM': '#f59e0b',
    'HIGH': '#ef4444',
    'CRITICAL': '#dc2626'
  }[insight.risk_level] || '#6b7280';
  
  overlay.innerHTML += `
    <div class="agent-section">
      <div class="risk-badge" style="background: ${riskColor}; color: white; padding: 8px 12px; border-radius: 6px; margin: 10px 0;">
        ⚠️ Risk Level: ${insight.risk_level}
      </div>
      
      <div class="veracity-badge" style="padding: 8px 12px; background: #f3f4f6; border-radius: 6px; margin: 10px 0;">
        🔍 Veracity: ${insight.veracity}
      </div>
      
      <div class="confidence-score" style="padding: 8px 12px; background: #f3f4f6; border-radius: 6px; margin: 10px 0;">
        📊 Confidence: ${(insight.confidence * 100).toFixed(0)}%
      </div>
      
      <div class="insight-summary" style="padding: 12px; background: #fff; border-left: 3px solid ${riskColor}; margin: 10px 0;">
        <strong>AI Analysis:</strong>
        <p style="margin-top: 8px; font-size: 14px; line-height: 1.5;">${insight.summary}</p>
      </div>
      
      ${insight.evidence && insight.evidence.length > 0 ? `
        <details style="margin: 10px 0;">
          <summary style="cursor: pointer; font-weight: 600; padding: 8px;">
            📋 Evidence (${insight.evidence.length})
          </summary>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${insight.evidence.map(e => `
              <li style="margin: 5px 0;">
                <span style="font-weight: 600;">${e.type}:</span> ${e.detail}
                ${e.severity ? `<span style="color: #ef4444;">[${e.severity}]</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </details>
      ` : ''}
      
      ${insight.recommended_actions && insight.recommended_actions.length > 0 ? `
        <div class="recommended-actions" style="margin: 10px 0; padding: 12px; background: #fef3c7; border-radius: 6px;">
          <strong>💡 Recommended Actions:</strong>
          <ul style="margin-top: 8px; padding-left: 20px;">
            ${insight.recommended_actions.map(action => `
              <li>${action.replace(/_/g, ' ').toUpperCase()}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="trust-indicators" style="margin: 10px 0; padding: 12px; background: #f3f4f6; border-radius: 6px;">
        <strong>📈 Trust Indicators:</strong>
        <div style="margin-top: 8px;">
          ${Object.entries(insight.trust_indicators || {}).map(([key, value]) => `
            <div style="margin: 5px 0;">
              <span style="font-size: 12px; color: #6b7280;">${key.replace(/_/g, ' ')}:</span>
              <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; margin-top: 2px;">
                <div style="width: ${value * 100}%; height: 100%; background: ${riskColor}; border-radius: 4px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <button id="veriai-view-details-btn" style="width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">
        📊 View Full Analysis
      </button>
    </div>
  `;
  
  // Add click handler for details button
  document.getElementById('veriai-view-details-btn').addEventListener('click', async () => {
    const insights = await agentClient.getInsights(modelSlug, 10);
    // Open popup or modal with full history
    console.log('Full insights:', insights);
  });
}

// =============================================================================
// POPUP INTEGRATION (popup.js)
// =============================================================================

async function loadAgentInsights(modelSlug) {
  const agentClient = new VeriAIAgentClient();
  
  // Check if agent is healthy
  const isHealthy = await agentClient.checkHealth();
  if (!isHealthy) {
    console.warn('[VeriAI] Agent service is unavailable');
    return;
  }
  
  // Get trust data
  const trustData = await agentClient.getTrustData(modelSlug);
  if (!trustData) return;
  
  // Get insights history
  const insights = await agentClient.getInsights(modelSlug, 5);
  
  // Get on-chain ratings
  const ratingsData = await agentClient.getRatings(modelSlug, 10);
  
  // Render in popup
  const container = document.getElementById('agent-insights-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="trust-score-card">
      <h3>Trust Score: ${trustData.trustScore}/100</h3>
      <p>Based on ${trustData.totalRatings} ratings</p>
    </div>
    
    ${trustData.latestInsight ? `
      <div class="latest-insight">
        <h4>Latest AI Analysis</h4>
        <div class="risk-badge risk-${trustData.latestInsight.risk_level.toLowerCase()}">
          ${trustData.latestInsight.risk_level}
        </div>
        <p>${trustData.latestInsight.summary}</p>
        <small>Analyzed ${new Date(trustData.latestInsight.createdAt).toLocaleString()}</small>
      </div>
    ` : ''}
    
    <div class="insights-history">
      <h4>Analysis History</h4>
      ${insights.map(insight => `
        <div class="insight-item">
          <span class="risk-${insight.risk_level.toLowerCase()}">${insight.risk_level}</span>
          <span>${insight.veracity}</span>
          <small>${new Date(insight.createdAt).toLocaleString()}</small>
        </div>
      `).join('')}
    </div>
    
    ${ratingsData && ratingsData.ratings.length > 0 ? `
      <div class="on-chain-ratings">
        <h4>On-Chain Ratings</h4>
        ${ratingsData.ratings.map(rating => `
          <div class="rating-item">
            <span>Score: ${rating.score}/100</span>
            <a href="${rating.explorerUrl}" target="_blank">View on Explorer</a>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

// =============================================================================
// CSS STYLES (Add to overlay.css or popup.css)
// =============================================================================

const agentStyles = `
.agent-section {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.risk-badge {
  display: inline-block;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
}

.risk-low { background: #10b981; }
.risk-medium { background: #f59e0b; }
.risk-high { background: #ef4444; }
.risk-critical { background: #dc2626; }

.analyze-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.analyze-button:hover {
  transform: translateY(-2px);
}

.analyze-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.insight-summary {
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.trust-indicators {
  font-size: 13px;
}

.trust-score-card {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 15px;
}
`;

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: In content-script.js
async function initializeVeriAIOverlay() {
  const modelSlug = extractModelSlugFromURL();
  const overlay = createOverlayElement();
  
  // Add agent insights to overlay
  await enhanceOverlayWithAgent(modelSlug, overlay);
  
  document.body.appendChild(overlay);
}

// Example 2: In popup.js
async function initializePopup() {
  const activeTab = await getActiveTab();
  const modelSlug = extractModelSlugFromURL(activeTab.url);
  
  if (modelSlug) {
    await loadAgentInsights(modelSlug);
  }
}

// Example 3: Background auto-analysis (optional)
// When user visits HuggingFace model page, auto-trigger analysis
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('huggingface.co')) {
    const modelSlug = extractModelSlugFromURL(tab.url);
    if (modelSlug) {
      const agentClient = new VeriAIAgentClient();
      const trustData = await agentClient.getTrustData(modelSlug);
      
      // If no recent analysis, trigger one in background
      if (!trustData.latestInsight) {
        await agentClient.analyzeModel(modelSlug);
      }
    }
  }
});

// =============================================================================
// EXPORT
// =============================================================================

// For use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VeriAIAgentClient, enhanceOverlayWithAgent, loadAgentInsights };
}
