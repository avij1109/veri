// Function to load ethers library via script injection to avoid CSP issues
async function loadEthersLibrary() {
  if (typeof window.ethers !== 'undefined') {
    return; // Already loaded
  }
  
  return new Promise((resolve, reject) => {
    // Method: Use script tag with src (more CSP-friendly)
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('vendor/ethers-5.7.2.umd.min.js');
    script.async = true;
    
    script.onload = () => {
      console.log('Ethers.js loaded successfully from extension');
      // Wait a bit for the library to initialize
      setTimeout(() => {
        if (typeof window.ethers !== 'undefined') {
          resolve();
        } else {
          reject(new Error('Ethers not available after loading'));
        }
      }, 100);
    };
    
    script.onerror = () => {
      console.error('Failed to load ethers.js script');
      reject(new Error('Failed to load ethers.js script'));
    };
    
    // Inject script into page
    (document.head || document.documentElement).appendChild(script);
  });
}

function getModelSlug() {
    const path = location.pathname.replace(/^\/+|\/+$/g, "");
    const parts = path.split("/");
    if (parts.length >= 2 && !["models","datasets","spaces","docs","blog"].includes(parts[0])) {
      return parts[0] + "/" + parts[1];
    }
    if (parts[0] === "models" && parts.length >= 3) {
      return parts[1] + "/" + parts[2];
    }
    return null;
  }
  
  async function injectOverlay(modelSlug) {
  if (document.getElementById("model-trust-overlay")) {
    console.log("[ModelDetector] Overlay already exists, skipping injection");
    return; // avoid duplicates
  }

  console.log("[ModelDetector] Injecting overlay for:", modelSlug);

  const overlay = document.createElement("div");
  overlay.id = "model-trust-overlay";
  overlay.innerHTML = `
    <div class="trust-card">
      <div class="trust-title">🔍 Model Detected</div>
      <div class="trust-slug">${modelSlug}</div>
      <div class="trust-score">Trust Score: <span id="trust-score-value">Loading...</span></div>
      <div id="ai-insights-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-weight: 600; font-size: 13px;">🤖 AI Analysis</span>
          <span id="ai-risk-badge" style="font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Loading...</span>
        </div>
        <div id="ai-status" style="font-size: 12px; color: #4b5563; line-height: 1.4; margin-bottom: 8px;">
          Checking analysis status...
        </div>
        <button id="ai-analyze-btn" class="action-btn" style="width: 100%; font-size: 12px; padding: 6px;">
          🔄 Analyze Now
        </button>
      </div>
      <div class="trust-actions" style="margin-top: 12px;">
        <button id="view-details-btn" class="action-btn">View Ratings</button>
        <button id="rate-model-btn" class="action-btn primary">Rate Model</button>
      </div>
    </div>
  `;
  
  // Ensure body exists before appending
  if (!document.body) {
    console.error("[ModelDetector] document.body not available yet");
    return;
  }
  
  document.body.appendChild(overlay);
  console.log("[ModelDetector] Overlay injected successfully");

  // Add event listeners after overlay is in DOM
  setTimeout(() => {
    const viewDetailsBtn = document.getElementById('view-details-btn');
    const rateModelBtn = document.getElementById('rate-model-btn');
    const aiAnalyzeBtn = document.getElementById('ai-analyze-btn');
    
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', () => showModelDetails(modelSlug));
    } else {
      console.error('[ModelDetector] view-details-btn not found');
    }
    
    if (rateModelBtn) {
      rateModelBtn.addEventListener('click', () => showRatingModal(modelSlug));
    } else {
      console.error('[ModelDetector] rate-model-btn not found');
    }
    
    if (aiAnalyzeBtn) {
      aiAnalyzeBtn.addEventListener('click', () => triggerAIAnalysis(modelSlug));
    } else {
      console.error('[ModelDetector] ai-analyze-btn not found');
    }
  }, 100);

  // Load ethers.js dynamically from extension bundle
  if (!window.ethers) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('vendor/ethers-5.7.2.umd.min.js');
    script.onload = () => {
      loadModelData(modelSlug);
      loadAIInsights(modelSlug);
    };
    script.onerror = () => console.error('Failed to load local ethers UMD');
    document.head.appendChild(script);
  } else {
    loadModelData(modelSlug);
    loadAIInsights(modelSlug);
  }
}

async function loadAIInsights(modelSlug) {
  try {
    console.log('[AI Agent] Fetching insights for:', modelSlug);
    
    // Use background script to avoid CORS issues
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getAIInsights',
        modelSlug: modelSlug
      }, (response) => {
        console.log('[AI Agent] Background response:', response);
        resolve(response || { success: false, error: 'No response' });
      });
    });
    
    if (response.success && response.data && response.data.latestInsight) {
      const insight = response.data.latestInsight;
      displayAIInsight(insight);
    } else {
      // No insight yet, show "Analyze Now" button prominently
      document.getElementById('ai-summary').textContent = 'No AI analysis available yet. Click below to analyze.';
      document.getElementById('ai-risk-badge').textContent = 'UNKNOWN';
      document.getElementById('ai-risk-badge').style.background = '#9ca3af';
      document.getElementById('ai-risk-badge').style.color = 'white';
    }
  } catch (error) {
    console.error('[AI Agent] Error fetching insights:', error);
    document.getElementById('ai-summary').textContent = 'AI service unavailable. Make sure backend is running.';
    document.getElementById('ai-risk-badge').textContent = 'OFFLINE';
    document.getElementById('ai-risk-badge').style.background = '#6b7280';
    document.getElementById('ai-risk-badge').style.color = 'white';
  }
}

function displayAIInsight(insight) {
  const riskBadge = document.getElementById('ai-risk-badge');
  const statusDiv = document.getElementById('ai-status');
  
  if (!riskBadge || !statusDiv) return;
  
  // Set risk badge
  riskBadge.textContent = insight.risk_level;
  const riskColors = {
    'LOW': { bg: '#10b981', color: 'white' },
    'MEDIUM': { bg: '#f59e0b', color: 'white' },
    'HIGH': { bg: '#ef4444', color: 'white' },
    'CRITICAL': { bg: '#dc2626', color: 'white' }
  };
  const colors = riskColors[insight.risk_level] || { bg: '#9ca3af', color: 'white' };
  riskBadge.style.background = colors.bg;
  riskBadge.style.color = colors.color;
  
  // Simple status message with red-team badge if available
  let redTeamBadge = '';
  if (insight.redTeam && insight.redTeam.tests) {
    const failedTests = insight.redTeam.tests.filter(t => t.status === 'FAIL').length;
    const totalTests = insight.redTeam.tests.length;
    const badgeColor = failedTests === 0 ? '#10b981' : failedTests === 1 ? '#f59e0b' : '#ef4444';
    redTeamBadge = `<span style="display: inline-block; padding: 2px 6px; background: ${badgeColor}; color: white; border-radius: 4px; font-size: 10px; margin-left: 6px;">🔒 ${totalTests - failedTests}/${totalTests} tests</span>`;
  }
  
  statusDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span>✓ Analysis complete</span>
      ${redTeamBadge}
    </div>
    <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
      Open extension for full details
    </div>
  `;
  
  // Update analyze button text
  const analyzeBtn = document.getElementById('ai-analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.textContent = '🔄 Re-analyze';
  }
}

async function triggerAIAnalysis(modelSlug) {
  const analyzeBtn = document.getElementById('ai-analyze-btn');
  const summary = document.getElementById('ai-summary');
  
  if (!analyzeBtn || !summary) return;
  
  try {
    analyzeBtn.textContent = '⏳ Analyzing...';
    analyzeBtn.disabled = true;
    summary.textContent = 'AI is analyzing the model... This may take 10-15 seconds.';
    
    console.log('[AI Agent] Triggering analysis for:', modelSlug);
    
    // Use background script to avoid CORS issues
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'triggerAIAnalysis',
        modelSlug: modelSlug
      }, (response) => {
        console.log('[AI Agent] Analysis response:', response);
        resolve(response || { success: false, error: 'No response' });
      });
    });
    
    if (response.success && response.data && response.data.insight) {
      displayAIInsight(response.data.insight);
      statusDiv.textContent = 'Analysis complete! Open extension for full details.';
      setTimeout(() => {
        displayAIInsight(response.data.insight);
      }, 1000);
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('[AI Agent] Error triggering analysis:', error);
    statusDiv.textContent = 'Analysis failed. Make sure backend server is running.';
    analyzeBtn.textContent = '🔄 Try Again';
  } finally {
    analyzeBtn.disabled = false;
  }
}

async function loadModelData(modelSlug) {
  try {
    // First attempt: fetch from backend if configured
    const backendUrl = await new Promise((resolve) => {
      chrome.storage.local.get('backendBaseUrl', (d) => resolve(d.backendBaseUrl || ''));
    });
    const candidateBaseUrls = [];
    if (backendUrl) candidateBaseUrls.push(backendUrl);
    candidateBaseUrls.push('http://localhost:5000');
    candidateBaseUrls.push('http://localhost:3000');
    for (const base of candidateBaseUrls) {
      if (!base) continue;
      try {
        const resp = await fetch(`${String(base).replace(/\/$/, '')}/api/trust-score?slug=${encodeURIComponent(modelSlug)}`, { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          const el = document.getElementById('trust-score-value');
          if (el) {
            if (data.totalRatings > 0) {
              el.innerHTML = `<strong>${data.trustScore}/100</strong> (${data.totalRatings} ratings)<br><small style="color: #6b7280;">60% benchmark (${data.benchmarkScore}) + 40% user ratings (${data.userRatingScore})</small>`;
              el.style.color = data.trustScore >= 70 ? '#22c55e' : data.trustScore >= 40 ? '#f59e0b' : '#ef4444';
            } else {
              el.innerHTML = `<strong>${data.trustScore}/100</strong> (no ratings yet)<br><small style="color: #6b7280;">100% benchmark score (${data.benchmarkScore})</small>`;
              el.style.color = data.trustScore >= 70 ? '#22c55e' : data.trustScore >= 40 ? '#f59e0b' : '#ef4444';
            }
          }
          return;
        }
      } catch (_) { /* try next candidate or fall through */ }
    }

    // Use background script to fetch blockchain data (avoids CSP issues)
    console.log('Requesting blockchain data from background script for:', modelSlug);
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getModelStats',
        modelSlug: modelSlug
      }, (response) => {
        console.log('Background script response:', response);
        resolve(response || { success: false, error: 'No response' });
      });
    });

    if (response.success) {
      const { trustScore, totalRatings, benchmarkScore, userRatingScore } = response.data;
      const el = document.getElementById('trust-score-value');
      if (el) {
        // Check if we have benchmark data from the enhanced background response
        if (benchmarkScore !== undefined) {
          // Use the same format as the direct API call
          if (totalRatings > 0) {
            el.innerHTML = `<strong>${trustScore}/100</strong> (${totalRatings} ratings)<br><small style="color: #6b7280;">60% benchmark (${benchmarkScore}) + 40% user ratings (${userRatingScore})</small>`;
            el.style.color = trustScore >= 70 ? '#22c55e' : trustScore >= 40 ? '#f59e0b' : '#ef4444';
          } else {
            el.innerHTML = `<strong>${trustScore}/100</strong> (no ratings yet)<br><small style="color: #6b7280;">100% benchmark score (${benchmarkScore})</small>`;
            el.style.color = trustScore >= 70 ? '#22c55e' : trustScore >= 40 ? '#f59e0b' : '#ef4444';
          }
        } else {
          // Fallback to old format when only blockchain data is available
          if (totalRatings > 0) {
            el.innerHTML = `<strong>${trustScore}/100</strong> (${totalRatings} ratings)<br><small style="color: #6b7280;">User ratings only (backend unavailable)</small>`;
            el.style.color = trustScore >= 70 ? '#22c55e' : trustScore >= 40 ? '#f59e0b' : '#ef4444';
          } else {
            el.innerHTML = `No ratings yet<br><small style="color: #6b7280;">Connect to backend for benchmark scores</small>`;
            el.style.color = '#6b7280';
          }
        }
      }
      console.log('Trust score loaded successfully:', trustScore, 'total ratings:', totalRatings);
    } else {
      console.error('Background script failed:', response.error);
      throw new Error(response.error || 'Failed to get blockchain data');
    }
  } catch (error) {
    console.error('Failed to load model data:', error);
    const el = document.getElementById('trust-score-value');
    if (el) { el.textContent = 'Error loading'; el.style.color = '#ef4444'; }
  }
}

function showModelDetails(modelSlug) {
  showRatingsModal(modelSlug);
}

function showRatingsModal(modelSlug) {
  const modal = document.createElement('div');
  modal.id = 'ratings-modal';
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Ratings: ${modelSlug}</h3>
          <button id="close-ratings" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div id="ratings-container">Loading ratings...</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('close-ratings').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-backdrop').addEventListener('click', (e) => { if (e.target === e.currentTarget) modal.remove(); });

  loadAndRenderRatings(modelSlug).catch(() => {
    const c = document.getElementById('ratings-container');
    if (c) c.textContent = 'Failed to load ratings';
  });
}

async function loadAndRenderRatings(modelSlug) {
  const container = document.getElementById('ratings-container');
  
  try {
    console.log('Requesting ratings from background script...');
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getModelRatings',
        modelSlug: modelSlug
      }, (response) => resolve(response || { success: false, error: 'No response' }));
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get ratings');
    }

    const items = response.data;
    if (!items || items.length === 0) { 
      container.textContent = 'No ratings yet.'; 
      return; 
    }
    
    container.innerHTML = items.map((r) => {
      const addr = r.user;
      const score = r.score;
      const comment = r.comment;
      const stake = r.stakeFormatted;
      const time = new Date(Number(r.timestamp) * 1000).toLocaleString();
      return `<div class="rating-row">
        <div><strong>${score}/5</strong> ⭐ – ${addr.substring(0,6)}...${addr.substring(38)}</div>
        <div style="color:#6b7280">Staked: ${stake} AVAX · ${time}</div>
        <div>${comment ? comment.replace(/</g,'&lt;') : ''}</div>
      </div>`;
    }).join('');
  } catch (error) {
    console.error('Failed to load ratings:', error);
    container.textContent = 'Failed to load ratings: ' + error.message;
  }
}

function showRatingModal(modelSlug) {
  // Create rating modal
  const modal = document.createElement('div');
  modal.id = 'rating-modal';
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Rate Model: ${modelSlug}</h3>
          <button id="close-modal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="rating-input">
            <label>Rating (1-5 stars):</label>
            <div class="star-rating">
              <span class="star" data-rating="1">★</span>
              <span class="star" data-rating="2">★</span>
              <span class="star" data-rating="3">★</span>
              <span class="star" data-rating="4">★</span>
              <span class="star" data-rating="5">★</span>
            </div>
          </div>
          <div class="comment-input">
            <label>Comment (optional):</label>
            <textarea id="rating-comment" placeholder="Share your experience with this model..."></textarea>
          </div>
          <div class="stake-input">
            <label>Stake Amount (AVAX):</label>
            <input type="number" id="stake-amount" value="0.001" min="0.001" step="0.001">
            <small>Higher stakes increase your rating influence</small>
          </div>
        </div>
        <div class="modal-footer">
          <button id="submit-rating" class="action-btn primary">Submit Rating</button>
          <button id="cancel-rating" class="action-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedRating = 0;

  // Star rating interaction
  const stars = modal.querySelectorAll('.star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.rating);
      updateStarDisplay(stars, selectedRating);
    });
    star.addEventListener('mouseover', () => {
      updateStarDisplay(stars, parseInt(star.dataset.rating));
    });
  });

  modal.addEventListener('mouseleave', () => {
    updateStarDisplay(stars, selectedRating);
  });

  // Modal controls
  document.getElementById('close-modal').addEventListener('click', () => modal.remove());
  document.getElementById('cancel-rating').addEventListener('click', () => modal.remove());
  document.getElementById('submit-rating').addEventListener('click', () => submitRating(modelSlug, selectedRating, modal));

  // Click outside to close
  modal.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) modal.remove();
  });
}

function updateStarDisplay(stars, rating) {
  stars.forEach((star, index) => {
    if (index < rating) {
      star.style.color = '#fbbf24';
    } else {
      star.style.color = '#d1d5db';
    }
  });
}

async function submitRating(modelSlug, rating, modal) {
  if (rating === 0) {
    alert('Please select a rating');
    return;
  }

  const comment = document.getElementById('rating-comment').value;
  const stakeAmount = document.getElementById('stake-amount').value;
  const submitButton = document.getElementById('submit-rating');

  try {
    submitButton.textContent = '1/2: Storing comment...';
    submitButton.disabled = true;

    // Step 1: Get metadata hash from the background script
    const userProfile = { userAgent: navigator.userAgent, pageUrl: window.location.href };
    const context = { modelPage: { url: window.location.href, title: document.title } };

    const hashResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getMetadataHash',
        modelSlug,
        comment,
        userProfile,
        context
      }, (response) => resolve(response || { success: false, error: 'No response from background script' }));
    });

    if (!hashResponse.success) {
      throw new Error(hashResponse.error || 'Failed to get metadata hash');
    }
    
    const { metadataHash } = hashResponse;
    console.log('Got metadata hash:', metadataHash);

    // Step 2: Send the actual transaction using background script
    submitButton.textContent = '2/2: Confirm in wallet...';
    
    console.log('Submitting rating with params:', {
      modelSlug,
      rating,
      metadataHash,
      stakeAmount
    });
    
    // Use background script to handle the transaction (similar to wallet connection)
    const txResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'submitRating',
        modelSlug,
        rating,
        metadataHash,
        stakeAmount
      }, (response) => {
        console.log('Background script response:', response);
        resolve(response || { success: false, error: 'No response from background script' });
      });
    });

    if (!txResult.success) {
      throw new Error(txResult.error || 'Transaction failed');
    }

    const txHash = txResult.txHash;
    alert(`Rating submitted successfully!\nTransaction Hash: ${txHash}`);
    modal.remove();
    
    // Wait a bit for blockchain confirmation before refreshing
    setTimeout(() => {
      loadModelData(modelSlug); // Refresh data
    }, 2000); // Wait 2 seconds for transaction to be processed

  } catch (error) {
    console.error('Failed to submit rating:', error);
    let errorMessage = 'Failed to submit rating: ' + (error?.message || String(error));
    if (error.code === 4001) {
        errorMessage = 'User rejected the transaction.';
    }
    alert(errorMessage);
  } finally {
    submitButton.textContent = 'Submit Rating';
    submitButton.disabled = false;
  }
}

async function sendRatingTransaction(modelSlug, rating, metadataHash, stakeAmount) {
    // This function is now handled by the background script
    // Keeping for compatibility but it should not be called directly
    throw new Error('Transaction should be handled by background script');
}


async function ensureAccountAccess() {
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
    }
    return accounts;
  } catch (e) {
    throw e;
  }
}

async function ensureFujiNetwork() {
  const FUJI_PARAMS = {
    chainId: '0xA869', // 43113
    chainName: 'Avalanche Fuji',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io']
  };

  try {
    const current = await window.ethereum.request({ method: 'eth_chainId' });
    if (current === FUJI_PARAMS.chainId) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FUJI_PARAMS.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) { // Chain not added
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [FUJI_PARAMS]
        });
      } else {
        throw switchError;
      }
    }
  } catch (e) {
    throw e;
  }
}
  
// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content Script] Received message:', request);
  
  if (request.action === 'showRatingModal') {
    showRatingModal(request.modelSlug);
    sendResponse({success: true});
  } else if (request.action === 'showRatingsModal') {
    showRatingsModal(request.modelSlug);
    sendResponse({success: true});
  }
  
  return true;
});

// Main execution
(function() {
  console.log("[ModelDetector] Content script loaded on:", window.location.href);

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDetector);
  } else {
    initializeDetector();
  }

  function initializeDetector() {
    console.log("[ModelDetector] Initializing detector...");
    const slug = getModelSlug();
    
    if (slug) {
      console.log("[ModelDetector] Detected model:", slug);

      // Inject overlay after a short delay to ensure DOM is ready
      setTimeout(() => {
        injectOverlay(slug);
      }, 500);

      // Store last detected model with error handling
      try {
        chrome.storage.local.set({
          lastDetectedModel: {
            slug: slug,
            url: location.href,
            detectedAt: new Date().toISOString()
          }
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("[ModelDetector] Failed to store model data:", chrome.runtime.lastError);
          } else {
            console.log("[ModelDetector] Model data stored successfully");
          }
        });
      } catch (error) {
        console.error("[ModelDetector] Error storing model data:", error);
      }
    } else {
      console.log("[ModelDetector] No model detected on this page");
    }
  }
})();
  
  