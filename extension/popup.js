// Global variables
let currentWalletAddress = null;
let currentModel = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] DOM loaded, initializing...');
  
  // Initialize navigation
  initializeNavigation();
  
  await checkWalletConnection();
  await loadLastDetectedModel();
  setupEventListeners();
  
  // Add event for visit website button
  const visitWebsiteBtn = document.getElementById('visit-website-btn');
  if (visitWebsiteBtn) {
    console.log('[Popup] Visit website button found, adding event listener');
    visitWebsiteBtn.addEventListener('click', () => {
      console.log('[Popup] Visit website button clicked');
      chrome.tabs.create({ url: 'https://veri-a-iwebsite.vercel.app/' });
    });
  } else {
    console.log('[Popup] Visit website button not found');
  }
});

// Navigation functions
function initializeNavigation() {
  const dashboardBtn = document.getElementById('dashboard-btn');
  const aiAgentBtn = document.getElementById('ai-agent-btn');
  const summaryBtn = document.getElementById('summary-btn');
  const leaderboardBtn = document.getElementById('leaderboard-btn');

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => showPage('dashboard'));
  }

  if (aiAgentBtn) {
    aiAgentBtn.addEventListener('click', () => showPage('ai-agent'));
  }

  if (summaryBtn) {
    summaryBtn.addEventListener('click', () => showPage('summary'));
  }

  if (leaderboardBtn) {
    console.log('[Popup] Leaderboard button found, adding event listener');
    leaderboardBtn.addEventListener('click', () => {
      console.log('[Popup] Leaderboard button clicked');
      showPage('leaderboard');
    });
  } else {
    console.log('[Popup] Leaderboard button not found');
  }
}

function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  
  // Remove active class from all menu items
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => item.classList.remove('active'));
  
  // Show selected page
  const selectedPage = document.getElementById(`${pageId}-page`);
  if (selectedPage) {
    selectedPage.classList.add('active');
  }
  
  // Add active class to selected menu item
  const selectedMenuItem = document.getElementById(`${pageId}-btn`);
  if (selectedMenuItem) {
    selectedMenuItem.classList.add('active');
  }
  
  // Load AI Agent page content if switching to AI agent
  if (pageId === 'ai-agent') {
    loadAIAgentPage();
  }
  
  // Load Summary page content if switching to summary
  if (pageId === 'summary') {
    loadSummaryPage();
  }
}

async function loadAIAgentPage() {
  console.log('[Popup] Loading AI Agent page');
  
  // Wait for DOM to be ready
  setTimeout(() => {
    setupCrawlAgent();
    setupLLMSearch();
  }, 50);
}

function setupLLMSearch() {
  const llmInput = document.getElementById('llm-search-input');
  const llmBtn = document.getElementById('llm-search-btn');
  const llmResultsContainer = document.getElementById('llm-search-results');
  
  if (!llmInput || !llmBtn || !llmResultsContainer) {
    console.error('[LLM Search] Elements not found');
    return;
  }
  
  console.log('[LLM Search] Setting up event listeners');
  
  // Remove any existing listeners by cloning
  const newInput = llmInput.cloneNode(true);
  const newBtn = llmBtn.cloneNode(true);
  llmInput.replaceWith(newInput);
  llmBtn.replaceWith(newBtn);
  
  const finalInput = document.getElementById('llm-search-input');
  const finalBtn = document.getElementById('llm-search-btn');
  
  const performLLMSearch = async () => {
    const query = finalInput.value.trim();
    if (!query) {
      llmResultsContainer.innerHTML = '<div style="color: #ef4444; font-size: 13px;">Please enter a query</div>';
      return;
    }
    
    console.log('[LLM Search] Searching:', query);
    
    llmResultsContainer.innerHTML = `
      <div style="background: rgba(255,255,255,0.95); padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 8px;">🤖</div>
        <div style="color: #667eea; font-weight: 600;">AI is thinking...</div>
        <div style="color: rgba(0,0,0,0.6); font-size: 13px; margin-top: 4px;">Analyzing your request and searching our database</div>
      </div>
    `;
    
    try {
      const response = await fetch('http://localhost:5000/api/agent/llm-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[LLM Search] Results:', data);
      
      displayLLMResults(data);
      
    } catch (error) {
      console.error('[LLM Search] Error:', error);
      llmResultsContainer.innerHTML = `
        <div style="background: rgba(255,255,255,0.95); padding: 16px; border-radius: 8px;">
          <div style="color: #ef4444; font-weight: 600; margin-bottom: 8px;">❌ Search Failed</div>
          <div style="color: rgba(0,0,0,0.7); font-size: 13px;">${error.message}</div>
          <div style="color: rgba(0,0,0,0.5); font-size: 12px; margin-top: 8px;">Make sure the backend is running on port 5000</div>
        </div>
      `;
    }
  };
  
  finalBtn.onclick = performLLMSearch;
  finalInput.onkeypress = (e) => {
    if (e.key === 'Enter') performLLMSearch();
  };
  
  // Example query clicks
  const exampleQueries = document.querySelectorAll('.llm-example-query');
  exampleQueries.forEach(query => {
    query.onclick = () => {
      finalInput.value = query.textContent.trim().substring(2); // Remove emoji
      performLLMSearch();
    };
  });
}

function displayLLMResults(data) {
  const container = document.getElementById('llm-search-results');
  
  let modelsHTML = '';
  if (data.recommendedModels && data.recommendedModels.length > 0) {
    modelsHTML = `
      <div style="display: grid; gap: 8px; margin-top: 12px;">
        ${data.recommendedModels.map(model => `
          <div onclick="searchSpecificModel('${model.modelSlug}')" style="background: rgba(255,255,255,0.5); padding: 12px; border-radius: 8px; cursor: pointer; border: 2px solid rgba(255,255,255,0.5); transition: all 0.2s;" 
               onmouseover="this.style.borderColor='white'; this.style.background='rgba(255,255,255,0.8)'" 
               onmouseout="this.style.borderColor='rgba(255,255,255,0.5)'; this.style.background='rgba(255,255,255,0.5)'">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 600; color: white; font-size: 14px;">📦 ${model.modelSlug}</div>
              ${model.benchmarkScore ? `<div style="background: rgba(34,197,94,0.3); color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">⭐ ${model.benchmarkScore}/100</div>` : ''}
            </div>
            ${model.downloads ? `<div style="color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 4px;">📥 ${model.downloads.toLocaleString()} downloads</div>` : ''}
            ${model.pipeline_tag ? `<div style="color: rgba(255,255,255,0.8); font-size: 12px;">🏷️ ${model.pipeline_tag}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
  
  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.95); padding: 16px; border-radius: 8px;">
      <div style="color: #000; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.llmResponse}</div>
      ${modelsHTML}
    </div>
  `;
}

// Helper function to search a specific model
window.searchSpecificModel = function(modelId) {
  console.log('[LLM Search] Searching specific model:', modelId);
  const crawlInput = document.getElementById('crawl-agent-input');
  if (crawlInput) {
    crawlInput.value = modelId;
    crawlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Trigger search after scroll
    setTimeout(() => {
      const crawlBtn = document.getElementById('crawl-agent-send-btn');
      if (crawlBtn) {
        crawlBtn.click();
      }
    }, 300);
  }
};

function setupCrawlAgent() {
  const crawlInput = document.getElementById('crawl-agent-input');
  const crawlSendBtn = document.getElementById('crawl-agent-send-btn');
  const useCurrentBtn = document.getElementById('use-current-model-btn');
  
  if (!crawlInput || !crawlSendBtn) {
    console.error('[Crawl Agent] Elements not found');
    return;
  }
  
  console.log('[Crawl Agent] Setting up event listeners');
  
  // Remove any existing listeners by cloning
  const newInput = crawlInput.cloneNode(true);
  const newBtn = crawlSendBtn.cloneNode(true);
  const newUseCurrentBtn = useCurrentBtn ? useCurrentBtn.cloneNode(true) : null;
  crawlInput.replaceWith(newInput);
  crawlSendBtn.replaceWith(newBtn);
  if (useCurrentBtn && newUseCurrentBtn) {
    useCurrentBtn.replaceWith(newUseCurrentBtn);
  }
  
  async function doSearch() {
    const modelId = newInput.value.trim();
    console.log('[Crawl Agent] Search triggered for:', modelId);
    
    if (!modelId) {
      alert('Please enter a model ID');
      return;
    }
    
    const resultsContainer = document.getElementById('crawl-results-container');
    if (!resultsContainer) {
      console.error('[Crawl Agent] Results container not found');
      return;
    }
    
    // Show loading
    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin-top: 16px;">
        <div class="spinner"></div>
        <p style="margin-top: 12px;">Searching for ${modelId}...</p>
      </div>
    `;
    
    try {
      const url = `http://localhost:5000/api/crawl/search?q=${encodeURIComponent(modelId)}&modelId=${encodeURIComponent(modelId)}`;
      console.log('[Crawl Agent] Fetching:', url);
      
      const response = await fetch(url);
      console.log('[Crawl Agent] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Crawl Agent] Data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }
      
      const results = data.data;
      console.log('[Crawl Agent] Results received:', results);
      console.log('[Crawl Agent] Has raw?', !!results.raw);
      
      // Show results with LLM answer
      const llmAnswerSection = results.llmAnswer ? `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin-bottom: 16px; color: white;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 24px;">🤖</span>
            <h4 style="margin: 0; font-size: 16px;">AI Assistant</h4>
          </div>
          <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${results.llmAnswer}</p>
        </div>
      ` : '';

      // Always show metadata section and evaluate button
      const metadataSection = `
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 12px; border-left: 3px solid #10b981;">
          <h4 style="color: #059669; margin-bottom: 10px; font-size: 14px;">📊 Model Statistics</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: #000;">
            <div><strong>Downloads:</strong> ${results.raw?.downloads?.toLocaleString() || '0'}</div>
            <div><strong>Likes:</strong> ${results.raw?.likes?.toLocaleString() || '0'}</div>
            <div><strong>Pipeline:</strong> ${results.raw?.pipeline_tag || 'N/A'}</div>
            <div><strong>Library:</strong> ${results.raw?.library_name || 'N/A'}</div>
            <div><strong>License:</strong> ${results.raw?.license || 'N/A'}</div>
            <div><strong>Tags:</strong> ${results.raw?.tags?.slice(0, 2).join(', ') || 'None'}</div>
          </div>
          <button id="evaluate-btn" style="margin-top: 16px; width: 100%; padding: 14px; background: #f59e0b; color: #000; border: 2px solid #d97706; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(245,158,11,0.4);">
            🎯 Evaluate with BERTScore (100 samples)
          </button>
        </div>
      `;

      resultsContainer.innerHTML = `
        <div style="margin-top: 16px;">
          ${llmAnswerSection}
          ${metadataSection}
        </div>
      `;
      
      // Add evaluate button handler
      setTimeout(() => {
        const evaluateBtn = document.getElementById('evaluate-btn');
        console.log('[Crawl Agent] Evaluate button found:', !!evaluateBtn);
        if (evaluateBtn) {
          console.log('[Crawl Agent] Adding click handler to evaluate button');
          evaluateBtn.onclick = () => {
            console.log('[Crawl Agent] Evaluate button clicked for:', modelId);
            triggerEvaluation(modelId);
          };
        } else {
          console.error('[Crawl Agent] CRITICAL: Evaluate button not found in DOM!');
        }
      }, 100);
      
    } catch (error) {
      console.error('[Crawl Agent] Error:', error);
      resultsContainer.innerHTML = `
        <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; text-align: center; margin-top: 16px;">
          <h4 style="color: #ef4444; margin-bottom: 8px;">Error</h4>
          <p style="color: #991b1b; font-size: 13px;">${error.message}</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Make sure backend server is running on port 5000</p>
        </div>
      `;
    }
  }
  
  // Use current model button handler
  if (newUseCurrentBtn) {
    newUseCurrentBtn.onclick = () => {
      const currentModel = window.currentDetectedModel || document.getElementById('model-name')?.textContent;
      if (currentModel && currentModel !== 'Current Model') {
        newInput.value = currentModel;
        console.log('[Crawl Agent] Auto-filled model:', currentModel);
      } else {
        alert('No model detected. Please open a HuggingFace model page first.');
      }
    };
  }
  
  newBtn.onclick = doSearch;
  newInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
      console.log('[Crawl Agent] Enter pressed');
      doSearch();
    }
  };
  
  // Example prompts
  document.querySelectorAll('.example-prompt').forEach(el => {
    el.onclick = () => {
      const text = el.textContent.trim();
      const modelId = text.split(' ')[1];
      console.log('[Crawl Agent] Example clicked:', modelId);
      newInput.value = modelId;
      doSearch();
    };
  });
  
  console.log('[Crawl Agent] Setup complete');
}

async function triggerEvaluation(modelId) {
  console.log('[Crawl Agent] Starting evaluation for:', modelId);
  
  const resultsContainer = document.getElementById('crawl-results-container');
  if (!resultsContainer) return;
  
  // Show loading state
  resultsContainer.innerHTML = `
    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; margin-top: 16px; color: white;">
      <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
      <h3 style="margin-bottom: 12px;">Evaluating ${modelId}</h3>
      <p style="font-size: 14px; opacity: 0.9; margin-bottom: 16px;">Please wait while we evaluate the model...</p>
      <div style="background: rgba(255,255,255,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
        <div id="progress-bar" style="background: white; height: 100%; width: 0%; transition: width 0.5s;"></div>
      </div>
      <p id="progress-text" style="font-size: 12px; margin-top: 8px; opacity: 0.8;">Starting evaluation...</p>
    </div>
  `;
  
  try {
    // Start evaluation
    console.log('[Crawl Agent] Sending POST to /api/crawl/evaluate');
    const response = await fetch('http://localhost:5000/api/crawl/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, datasetSize: 100 })
    });
    
    console.log('[Crawl Agent] Response received:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Crawl Agent] Evaluation response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Evaluation failed');
    }
    
    // Poll for status
    const pollInterval = setInterval(async () => {
      const statusResponse = await fetch(`http://localhost:5000/api/crawl/evaluation-status/${modelId}`);
      const statusData = await statusResponse.json();
      
      if (!statusData.success) return;
      
      const status = statusData.data;
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      
      if (progressBar) {
        progressBar.style.width = `${status.progress || 0}%`;
      }
      
      if (progressText) {
        const statusMessages = {
          'fetching_dataset': 'Fetching random dataset samples...',
          'running_inference': 'Running model inference...',
          'calculating_bertscore': 'Calculating BERTScore metrics...',
          'finalizing': 'Finalizing results...',
          'completed': 'Evaluation complete!',
          'error': 'Error occurred during evaluation'
        };
        progressText.textContent = statusMessages[status.status] || 'Processing...';
      }
      
      if (status.status === 'completed') {
        clearInterval(pollInterval);
        displayEvaluationResults(status.results);
      } else if (status.status === 'error') {
        clearInterval(pollInterval);
        throw new Error(status.error);
      }
    }, 1000);
    
  } catch (error) {
    console.error('[Crawl Agent] Evaluation error:', error);
    resultsContainer.innerHTML = `
      <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; text-align: center; margin-top: 16px;">
        <h4 style="color: #ef4444; margin-bottom: 8px;">❌ Connection Error</h4>
        <p style="color: #991b1b; font-size: 13px; margin-bottom: 12px;">${error.message}</p>
        <p style="color: #6b7280; font-size: 12px;">Make sure the backend server is running:</p>
        <code style="display: block; background: #f9fafb; padding: 8px; margin: 8px 0; border-radius: 4px; font-size: 11px;">cd backend && node server.js</code>
        <p style="color: #6b7280; font-size: 12px; margin-top: 12px;">Then reload this extension at chrome://extensions</p>
      </div>
    `;
  }
}

function displayEvaluationResults(results) {
  const resultsContainer = document.getElementById('crawl-results-container');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = `
    <div style="margin-top: 16px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; margin-bottom: 16px; color: white; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <h3 style="margin-bottom: 8px;">Evaluation Complete!</h3>
        <p style="font-size: 14px; opacity: 0.9;">Model: ${results.modelId}</p>
      </div>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 2px solid #10b981;">
        <h4 style="color: #059669; margin-bottom: 16px; font-size: 16px;">📊 BERTScore Results</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div style="text-align: center; padding: 16px; background: white; border-radius: 6px;">
            <div style="font-size: 32px; font-weight: bold; color: #059669;">${results.averageBertScore}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Average F1 Score</div>
          </div>
          <div style="text-align: center; padding: 16px; background: white; border-radius: 6px;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${results.datasetSize}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Samples Evaluated</div>
          </div>
        </div>
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Completed: ${new Date(results.completedAt).toLocaleString()}
        </p>
      </div>
    </div>
  `;
}

async function loadSummaryPage() {
  console.log('[Popup] Loading Summary page');
  
  // Check if we have a detected model
  const modelData = await new Promise((resolve) => {
    chrome.storage.local.get(['lastDetectedModel'], (result) => {
      resolve(result.lastDetectedModel || null);
    });
  });
  
  if (modelData && modelData.slug) {
    // Show insights for the detected model
    displayModelAIInsights(modelData.slug);
  }
}

async function displayModelAIInsights(modelSlug) {
  const summaryContainer = document.querySelector('.summary-container');
  if (!summaryContainer) return;
  
  // Show loading state
  summaryContainer.innerHTML = `
    <div class="agent-loading">
      <div class="spinner"></div>
      <p>Loading summary for ${modelSlug}...</p>
    </div>
  `;
  
  try {
    // Fetch AI insights via background script
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getAIInsights',
        modelSlug: modelSlug
      }, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
    
    if (response.success && response.data && response.data.latestInsight) {
      const insight = response.data.latestInsight;
      const trustData = response.data;
      
      // Check if red-team data is available
      const redTeam = insight.redTeam;
      let redTeamSection = '';
      
      if (redTeam && redTeam.tests) {
        const passedTests = redTeam.tests.filter(t => t.status === 'PASS').length;
        const failedTests = redTeam.tests.filter(t => t.status === 'FAIL').length;
        
        redTeamSection = `
          <div class="redteam-section" style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #991b1b;">🔒 Red-Team Security Tests</h4>
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ ${passedTests} passed</span>
              <span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✗ ${failedTests} failed</span>
            </div>
            
            <details>
              <summary style="cursor: pointer; font-weight: 600; font-size: 12px;">View Test Details</summary>
              <div style="margin-top: 8px;">
                ${redTeam.tests.map(test => `
                  <div style="padding: 8px; background: white; border-radius: 4px; margin-bottom: 6px;">
                    <span style="font-weight: 600; font-size: 12px;">${test.status === 'PASS' ? '✅' : '❌'} ${test.name}</span>
                    <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${test.detail}</p>
                  </div>
                `).join('')}
              </div>
            </details>
          </div>
        `;
      }
      
      summaryContainer.innerHTML = `
        <div class="ai-insights-container">
          <h3 style="margin-bottom: 16px;">AI Analysis for ${modelSlug}</h3>
          
          ${redTeamSection}
          
          <div class="insight-card" style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div class="risk-badge risk-${insight.risk_level.toLowerCase()}" style="padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 13px;">
                ${insight.risk_level}
              </div>
              <div style="font-size: 13px; color: #6b7280;">
                <strong>Veracity:</strong> ${insight.veracity}
              </div>
              <div style="font-size: 13px; color: #6b7280;">
                <strong>Confidence:</strong> ${Math.round(insight.confidence * 100)}%
              </div>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="display: block; margin-bottom: 6px;">Summary:</strong>
              <p style="font-size: 13px; line-height: 1.5; color: #374151;">${insight.summary}</p>
            </div>
            
            ${insight.evidence && insight.evidence.length > 0 ? `
              <details style="margin-bottom: 12px;">
                <summary style="cursor: pointer; font-weight: 600; font-size: 13px;">Evidence (${insight.evidence.length})</summary>
                <ul style="margin: 8px 0 0 20px; font-size: 12px;">
                  ${insight.evidence.map(e => `<li style="margin: 4px 0;">${e.type}: ${e.detail}</li>`).join('')}
                </ul>
              </details>
            ` : ''}
            
            ${insight.recommended_actions && insight.recommended_actions.length > 0 ? `
              <div>
                <strong style="display: block; margin-bottom: 6px; font-size: 13px;">Recommended Actions:</strong>
                <ul style="margin: 0 0 0 20px; font-size: 12px;">
                  ${insight.recommended_actions.map(action => `<li>${action.replace(/_/g, ' ')}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button id="refresh-ai-btn" class="action-btn" style="flex: 1;">🔄 Re-analyze</button>
            <button id="view-model-btn" class="action-btn primary" style="flex: 1;">📊 View Model</button>
          </div>
        </div>
      `;
      
      // Add event listeners
      document.getElementById('refresh-ai-btn')?.addEventListener('click', () => triggerPopupAnalysis(modelSlug));
      document.getElementById('view-model-btn')?.addEventListener('click', () => {
        chrome.tabs.create({ url: `https://huggingface.co/${modelSlug}` });
      });
      
    } else {
      // No insights available
      summaryContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
          <h3>No AI analysis available</h3>
          <p style="color: #6b7280; margin: 12px 0;">Visit a HuggingFace model page and click "Analyze Now" to get AI-powered insights.</p>
          <button id="analyze-now-btn" class="action-btn primary" style="margin-top: 16px;">Analyze ${modelSlug}</button>
        </div>
      `;
      
      document.getElementById('analyze-now-btn')?.addEventListener('click', () => triggerPopupAnalysis(modelSlug));
    }
  } catch (error) {
    console.error('[Popup] Error loading AI insights:', error);
    summaryContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3>AI Service Offline</h3>
        <p style="color: #6b7280; margin: 12px 0;">Make sure the backend server is running on port 5000.</p>
        <code style="display: block; background: #f3f4f6; padding: 8px; border-radius: 4px; margin: 12px 0; font-size: 12px;">
          cd backend && node server.js
        </code>
      </div>
    `;
  }
}

async function triggerPopupAnalysis(modelSlug) {
  const summaryContainer = document.querySelector('.summary-container');
  if (!summaryContainer) return;
  
  summaryContainer.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="spinner" style="margin: 0 auto 16px;"></div>
      <h3>Analyzing ${modelSlug}...</h3>
      <p style="color: #6b7280;">This may take 10-15 seconds</p>
    </div>
  `;
  
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'triggerAIAnalysis',
        modelSlug: modelSlug
      }, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
    
    if (response.success) {
      // Reload insights
      setTimeout(() => displayModelAIInsights(modelSlug), 1000);
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('[Popup] Error triggering analysis:', error);
    summaryContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h3>Analysis Failed</h3>
        <p style="color: #ef4444;">${error.message}</p>
        <button id="retry-btn" class="action-btn" style="margin-top: 16px;">Try Again</button>
      </div>
    `;
    document.getElementById('retry-btn')?.addEventListener('click', () => triggerPopupAnalysis(modelSlug));
  }
}

async function triggerCrawlAnalysis(modelId) {
  const resultsContainer = document.getElementById('crawl-results-container');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="spinner" style="margin: 0 auto 16px;"></div>
      <h3>Analyzing ${modelId}...</h3>
      <p style="color: #6b7280;">Crawling HuggingFace, GitHub, and blockchain data...</p>
    </div>
  `;
  
  try {
    const response = await fetch('http://localhost:5000/api/crawl/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      resultsContainer.innerHTML = `
        <div style="background: #f0fdf4; border: 2px solid #86efac; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
          <h3 style="color: #15803d; margin-bottom: 8px;">Analysis Complete!</h3>
          <p style="color: #166534; margin-bottom: 16px;">
            Model successfully crawled and analyzed.<br>
            ${data.crawlResult?.chunksStored || 0} chunks indexed from ${data.crawlResult?.sources?.length || 0} sources.
          </p>
          <button id="view-summary-btn2" class="action-btn primary">View Full Summary</button>
        </div>
      `;
      
      document.getElementById('view-summary-btn2')?.addEventListener('click', () => {
        // Save model to storage and switch to summary page
        chrome.storage.local.set({ 
          lastDetectedModel: { slug: modelId } 
        }, () => {
          showPage('summary');
        });
      });
    } else {
      throw new Error(data.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('[Crawl] Analysis error:', error);
    resultsContainer.innerHTML = `
      <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
        <h3 style="color: #991b1b; margin-bottom: 8px;">Analysis Failed</h3>
        <p style="color: #7f1d1d;">${error.message}</p>
        <button id="retry-analysis-btn" class="action-btn" style="margin-top: 12px;">Try Again</button>
      </div>
    `;
    
    document.getElementById('retry-analysis-btn')?.addEventListener('click', () => triggerCrawlAnalysis(modelId));
  }
}

function handleAgentInput() {
  const agentInput = document.getElementById("agent-input");
  const inputValue = agentInput.value.trim();
  
  if (inputValue) {
    console.log('[AI Agent] User input:', inputValue);
    agentInput.value = '';
    // Show a message that chat is coming soon
    const agentContainer = document.querySelector('.agent-container');
    if (agentContainer) {
      const existingMessages = agentContainer.querySelector('.chat-messages');
      if (!existingMessages) {
        const messagesDiv = document.createElement('div');
        messagesDiv.className = 'chat-messages';
        messagesDiv.style.cssText = 'margin-top: 16px; max-height: 200px; overflow-y: auto;';
        agentContainer.appendChild(messagesDiv);
      }
      
      const messagesDiv = agentContainer.querySelector('.chat-messages');
      messagesDiv.innerHTML += `
        <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;">
          <strong>You:</strong> ${inputValue}
        </div>
        <div style="background: #dbeafe; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;">
          <strong>AI:</strong> Chat functionality coming soon! For now, visit a model page and use the "Analyze Now" button.
        </div>
      `;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }
}

async function checkWalletConnection() {
  const walletStatusEl = document.getElementById("wallet-status");
  const connectBtn = document.getElementById("connect-wallet-btn");
  
  try {
    // Check if wallet was previously connected by looking in storage
    const storedWallet = await new Promise((resolve) => {
      chrome.storage.local.get(['connectedWallet'], (result) => {
        resolve(result.connectedWallet || null);
      });
    });

    if (storedWallet && storedWallet.address) {
      // Try to verify the connection is still valid
      const accountsResult = await new Promise((resolve) => {
        chrome.runtime.sendMessage({action: 'getWalletAccounts'}, (response) => {
          resolve(response || {accounts: []});
        });
      });

      if (accountsResult.accounts && accountsResult.accounts.length > 0 && 
          accountsResult.accounts.includes(storedWallet.address)) {
        // Wallet is still connected
        currentWalletAddress = storedWallet.address;
        walletStatusEl.innerHTML = `<span class="connected">Connected: ${currentWalletAddress.substring(0, 6)}...${currentWalletAddress.substring(38)}</span>`;
        connectBtn.textContent = "Disconnect";
        connectBtn.onclick = disconnectWallet;
        console.log('[Popup] Restored wallet connection:', currentWalletAddress);
        return;
      } else {
        // Stored wallet is no longer valid, clear it
        chrome.storage.local.remove(['connectedWallet']);
      }
    }

    // No valid connection found
    walletStatusEl.innerHTML = `<span class="disconnected">Ready to connect</span>`;
    connectBtn.textContent = "Connect MetaMask";
    connectBtn.onclick = connectWallet;
    
  } catch (error) {
    console.error('[Popup] Error checking wallet connection:', error);
    walletStatusEl.innerHTML = `<span class="disconnected">Ready to connect</span>`;
    connectBtn.textContent = "Connect MetaMask";
    connectBtn.onclick = connectWallet;
  }
}

async function connectWallet() {
  const connectBtn = document.getElementById("connect-wallet-btn");
  const statusEl = document.getElementById("wallet-status");
  
  try {
    connectBtn.textContent = "Connecting...";
    connectBtn.disabled = true;
    statusEl.innerHTML = `<span class="disconnected">Opening MetaMask...</span>`;
    
    // Create temporary tab and connect
    const result = await new Promise((resolve) => {
      chrome.tabs.create({
        url: 'https://example.com',
        active: false  // Don't show the tab
      }, (tab) => {
        // Wait for tab to load then inject script
        setTimeout(async () => {
          try {
            console.log('Injecting MetaMask script into tab:', tab.id);
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: async () => {
                console.log('Script injected, checking MetaMask...');
                console.log('window.ethereum available:', typeof window.ethereum !== 'undefined');
                
                if (typeof window.ethereum !== 'undefined') {
                  console.log('Requesting MetaMask accounts...');
                  try {
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    console.log('MetaMask accounts received:', accounts);
                    return { success: true, accounts };
                  } catch (error) {
                    console.error('MetaMask request failed:', error);
                    return { success: false, error: error.message };
                  }
                } else {
                  console.log('MetaMask not found');
                  return { success: false, error: 'MetaMask not found' };
                }
              },
              world: 'MAIN'
            });
            
            console.log('Script execution results:', results);
            
            // Wait a bit before closing tab to allow MetaMask popup
            setTimeout(() => {
              chrome.tabs.remove(tab.id);
              console.log('Temporary tab closed');
            }, 1000);
            
            resolve(results[0]?.result || { success: false, error: 'No result' });
          } catch (error) {
            console.error('Script injection failed:', error);
            chrome.tabs.remove(tab.id);
            resolve({ success: false, error: error.message });
          }
        }, 3000); // Increased wait time
      });
    });

    if (result.success && result.accounts && result.accounts.length > 0) {
      currentWalletAddress = result.accounts[0];
      
      // Store wallet connection in local storage for persistence
      chrome.storage.local.set({
        connectedWallet: {
          address: currentWalletAddress,
          connectedAt: new Date().toISOString()
        }
      });
      
      statusEl.innerHTML = `<span class="connected">Connected: ${currentWalletAddress.substring(0, 6)}...${currentWalletAddress.substring(38)}</span>`;
      connectBtn.textContent = "Disconnect";
      connectBtn.disabled = false;
      connectBtn.onclick = disconnectWallet;
      
      if (currentModel) {
        await loadModelStats(currentModel.slug);
      }
    } else {
      throw new Error(result.error || 'Connection failed');
    }
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    
    let errorMessage = 'Failed to connect: ';
    if (error.message.includes('not installed') || error.message.includes('web3 provider')) {
      errorMessage = 'MetaMask not installed. ';
      connectBtn.textContent = "Install MetaMask";
      connectBtn.onclick = () => window.open('https://metamask.io');
    } else if (error.message.includes('rejected') || error.message.includes('cancelled') || error.message.includes('User denied')) {
      errorMessage = 'Connection cancelled by user';
      connectBtn.textContent = "Connect MetaMask";
      connectBtn.onclick = connectWallet;
    } else if (error.message.includes('No suitable tab')) {
      errorMessage = 'Please open a web page first, then try connecting again.';
      connectBtn.textContent = "Open Web Page";
      connectBtn.onclick = () => chrome.tabs.create({ url: 'https://example.com' });
    } else {
      errorMessage += error.message;
      connectBtn.textContent = "Retry Connection";
      connectBtn.onclick = connectWallet;
    }
    
    statusEl.innerHTML = `<span class="disconnected">${errorMessage}</span>`;
    connectBtn.disabled = false;
  }
}

function disconnectWallet() {
  const connectBtn = document.getElementById("connect-wallet-btn");
  const statusEl = document.getElementById("wallet-status");
  
  try {
    // Clear stored wallet connection
    chrome.storage.local.remove(['connectedWallet'], () => {
      console.log('[Popup] Wallet connection cleared from storage');
    });
    
    // Reset UI state
    currentWalletAddress = null;
    statusEl.innerHTML = `<span class="disconnected">Disconnected</span>`;
    connectBtn.textContent = "Connect MetaMask";
    connectBtn.onclick = connectWallet;
    
    // Hide model section if no wallet connected
    const modelSection = document.getElementById("model-section");
    if (modelSection) {
      modelSection.style.display = "none";
    }
    
    console.log('[Popup] Wallet disconnected successfully');
  } catch (error) {
    console.error('[Popup] Error disconnecting wallet:', error);
  }
}

async function loadLastDetectedModel() {
  return new Promise((resolve) => {
    chrome.storage.local.get("lastDetectedModel", async (data) => {
      const modelSection = document.getElementById("model-section");
      const modelNameEl = document.getElementById("model-name");
      
      if (data.lastDetectedModel) {
        currentModel = data.lastDetectedModel;
        
        // Update model name in dashboard
        if (modelNameEl) {
          modelNameEl.textContent = currentModel.slug;
        }
        
        // Show model section in dashboard
        if (modelSection) {
          modelSection.style.display = "block";
        }
        
        // Load trust score
        await loadModelStats(currentModel.slug);
      } else {
        // No model detected
        if (modelNameEl) {
          modelNameEl.textContent = "No model detected";
        }
        
        if (modelSection) {
          modelSection.style.display = "none";
        }
      }
      resolve();
    });
  });
}

async function loadModelStats(modelSlug) {
  const trustScoreEl = document.getElementById("trust-score-value");
  
  try {
    // Request stats from background script
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getModelStats',
        modelSlug: modelSlug
      }, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });

    if (response.success && trustScoreEl) {
      const { trustScore, totalRatings } = response.data;
      
      if (totalRatings > 0) {
        trustScoreEl.innerHTML = `<strong>${trustScore}/100</strong> (${totalRatings} ratings)`;
        trustScoreEl.style.color = trustScore >= 70 ? '#10b981' : trustScore >= 40 ? '#f59e0b' : '#ef4444';
      } else {
        trustScoreEl.textContent = 'No ratings yet';
        trustScoreEl.style.color = '#6b7280';
      }
    } else {
      if (trustScoreEl) {
        trustScoreEl.textContent = 'Error loading';
        trustScoreEl.style.color = '#ef4444';
      }
    }
  } catch (error) {
    console.error('Failed to load model stats:', error);
    if (trustScoreEl) {
      trustScoreEl.textContent = 'Error loading';
      trustScoreEl.style.color = '#ef4444';
    }
  }
}

async function fetchModelStats(modelSlug) {
  const modelStatsEl = document.getElementById("model-stats");
  
  try {
    console.log('Fetching stats for model:', modelSlug);
    const ABI = [
      "function getModelStats(string slug) view returns (uint256,uint256,uint256,uint256,uint256)"
    ];
    let stats;
    let networkUsed = '';
    
    // Try Avalanche Fuji networks (contract is deployed on Fuji testnet)
    const networks = [
      { name: 'Avalanche Fuji', rpc: 'https://api.avax-test.network/ext/bc/C/rpc' },
      { name: 'Fuji-Infura', rpc: 'https://avalanche-fuji.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' },
      { name: 'Fuji-Alchemy', rpc: 'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc' },
      { name: 'Fuji-Public', rpc: 'https://rpc.ankr.com/avalanche_fuji' }
    ];
    
    for (const network of networks) {
      try {
        console.log(`Trying ${network.name} network...`);
        const provider = new ethers.providers.JsonRpcProvider(network.rpc);
        const c = new ethers.Contract('0x8a446886a44743e78138a27f359873fe86613dfe', ABI, provider);
        
        // Test if contract exists by calling a simple function
        const code = await provider.getCode('0x8a446886a44743e78138a27f359873fe86613dfe');
        console.log(`Contract code on ${network.name}:`, code.length > 2 ? 'Found' : 'Not found');
        
        if (code.length > 2) {
          stats = await c.getModelStats(modelSlug);
          networkUsed = network.name;
          console.log(`Successfully got stats from ${network.name}:`, stats);
          break;
        }
      } catch (e) {
        console.error(`Failed on ${network.name}:`, e.message);
        continue;
      }
    }
    
    if (!stats) {
      throw new Error('Contract not found on any network');
    }
    const trustScore = stats[0].toNumber();
    const totalRatings = stats[1].toNumber();
    const activeRatings = stats[2].toNumber();
    const averageScore = stats[3].toNumber();
    const totalStaked = ethers.utils.formatEther(stats[4]);
    
    modelStatsEl.innerHTML = `
      <div class="stat-row">
        <span>Network:</span>
        <span><strong>${networkUsed}</strong></span>
      </div>
      <div class="stat-row">
        <span>Trust Score:</span>
        <span><strong>${trustScore}/100</strong></span>
      </div>
      <div class="stat-row">
        <span>Total Ratings:</span>
        <span>${totalRatings}</span>
      </div>
      <div class="stat-row">
        <span>Active Ratings:</span>
        <span>${activeRatings}</span>
      </div>
      <div class="stat-row">
        <span>Average Score:</span>
        <span>${averageScore > 0 ? (averageScore/20).toFixed(1) : '0'}/5 ⭐</span>
      </div>
      <div class="stat-row">
        <span>Total Staked:</span>
        <span>${parseFloat(totalStaked).toFixed(4)} AVAX</span>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load model stats:', error);
    console.error('Error details:', error.message);
    console.error('Model slug:', modelSlug);
    modelStatsEl.innerHTML = `<div style="color: #dc2626;">Failed to load stats: ${error.message}</div>`;
  }
}

async function fetchRecentRatings(modelSlug) {
  const ratingsListEl = document.getElementById("ratings-list");
  ratingsListEl.innerHTML = '<div class="muted">Loading ratings...</div>';

  try {
    console.log('Fetching ratings for model:', modelSlug);
    const ABI = [
      "function getRatingCount(string slug) view returns (uint256)",
      "function getRatingsRange(string slug, uint256 start, uint256 end) view returns (tuple(address,uint8,string,uint256,uint256,bool)[])"
    ];

    let c;
    let networkUsed = '';
    
    // Try Avalanche Fuji networks to find the contract
    const networks = [
      { name: 'Avalanche Fuji', rpc: 'https://api.avax-test.network/ext/bc/C/rpc' },
      { name: 'Fuji-Infura', rpc: 'https://avalanche-fuji.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' },
      { name: 'Fuji-Alchemy', rpc: 'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc' },
      { name: 'Fuji-Public', rpc: 'https://rpc.ankr.com/avalanche_fuji' }
    ];
    
    for (const network of networks) {
      try {
        console.log(`Trying ratings on ${network.name} network...`);
        const provider = new ethers.providers.JsonRpcProvider(network.rpc);
        const testContract = new ethers.Contract('0x8a446886a44743e78138a27f359873fe86613dfe', ABI, provider);
        
        const code = await provider.getCode('0x8a446886a44743e78138a27f359873fe86613dfe');
        if (code.length > 2) {
          c = testContract;
          networkUsed = network.name;
          console.log(`Using ${network.name} for ratings`);
          break;
        }
      } catch (e) {
        console.error(`Failed to connect to ${network.name}:`, e.message);
        continue;
      }
    }
    
    if (!c) {
      throw new Error('Contract not found on any network');
    }

    const total = (await c.getRatingCount(modelSlug)).toNumber();
    const count = Math.min(total, 5);
    console.log(`Found ${total} total ratings, showing ${count}`);
    if (count === 0) {
      ratingsListEl.innerHTML = '<div class="muted">No ratings yet.</div>';
      return;
    }
    const items = await c.getRatingsRange(modelSlug, 0, count - 1);
    ratingsListEl.innerHTML = items.map((r) => {
      const addr = r[0];
      const score = r[1];
      const comment = r[2];
      const stake = ethers.utils.formatEther(r[3]);
      const time = new Date(Number(r[4]) * 1000).toLocaleString();
      return `<div style="border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-bottom:6px;">
        <div><strong>${score}/5</strong> ⭐ – ${addr.substring(0,6)}...${addr.substring(38)}</div>
        <div style="color:#6b7280">Staked: ${parseFloat(stake).toFixed(4)} ETH · ${time}</div>
        <div>${comment ? comment.replace(/</g,'&lt;') : ''}</div>
      </div>`;
    }).join('');
  } catch (error) {
    console.error('Failed to load ratings:', error);
    console.error('Ratings error details:', error.message);
    console.error('Model slug:', modelSlug);
    ratingsListEl.innerHTML = `<div style="color: #dc2626;">Failed to load ratings: ${error.message}</div>`;
  }
}

function setupEventListeners() {
  // Wallet connection button
  const connectBtn = document.getElementById("connect-wallet-btn");
  if (connectBtn) {
    connectBtn.addEventListener("click", connectWallet);
  }

  // Main action buttons
  const rateModelMainBtn = document.getElementById("rate-model-main-btn");
  const viewRatingsMainBtn = document.getElementById("view-ratings-main-btn");
  const calculateAccuracyBtn = document.getElementById("calculate-accuracy-btn");
  
  if (rateModelMainBtn) {
    rateModelMainBtn.addEventListener("click", () => {
      if (currentModel) {
        // Send message to content script to show rating modal
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'showRatingModal',
              modelSlug: currentModel.slug
            });
          }
        });
        window.close(); // Close popup
      } else {
        alert('No model detected on current page');
      }
    });
  }
  
  if (viewRatingsMainBtn) {
    viewRatingsMainBtn.addEventListener("click", () => {
      if (currentModel) {
        // Send message to content script to show ratings modal
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'showRatingsModal', 
              modelSlug: currentModel.slug
            });
          }
        });
        window.close(); // Close popup
      } else {
        alert('No model detected on current page');
      }
    });
  }

  if (calculateAccuracyBtn) {
    calculateAccuracyBtn.addEventListener("click", async () => {
      if (currentModel) {
        await calculateModelAccuracy(currentModel.slug);
      } else {
        alert('No model detected on current page');
      }
    });
  }

  // AI agent input
  const agentInput = document.getElementById("agent-input");
  const agentSendBtn = document.getElementById("agent-send-btn");
  
  if (agentInput && agentSendBtn) {
    agentSendBtn.addEventListener("click", handleAgentInput);
    agentInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleAgentInput();
      }
    });
  }

  // Example prompt click handlers
  const examplePrompts = document.querySelectorAll('.example-prompt');
  examplePrompts.forEach(prompt => {
    prompt.addEventListener('click', () => {
      if (agentInput) {
        agentInput.value = prompt.textContent.replace(/[💬🔍📊] /, '');
        agentInput.focus();
      }
    });
  });

  // Initialize watchlist functionality (with error handling)
  try {
    if (typeof window !== 'undefined' && typeof window.initializeWatchlist === 'function') {
      window.initializeWatchlist();
    } else {
      console.warn('[Popup] initializeWatchlist not available yet');
    }
  } catch (error) {
    console.error('[Popup] Error initializing watchlist:', error);
  }
}

// Model accuracy calculation
async function calculateModelAccuracy(modelSlug) {
  const calculateBtn = document.getElementById("calculate-accuracy-btn");
  const resultDiv = document.getElementById("accuracy-result");
  
  // Show loading state
  calculateBtn.disabled = true;
  calculateBtn.textContent = "Calculating...";
  resultDiv.innerHTML = '<div class="loading">🔄 Evaluating model accuracy...</div>';
  resultDiv.style.display = 'block';
  
  try {
    // Use the new hybrid evaluation API
    console.log(`[Extension] Requesting accuracy for model: ${modelSlug}`);
    
    let response = await fetch(`http://localhost:5000/api/quick-accuracy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        modelId: modelSlug,
        taskType: 'text-classification'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.result) {
      // Display the results with the new format
      displayAccuracyResults(data.result, data.details);
    } else {
      throw new Error(data.error || 'Unknown error occurred');
    }
    
  } catch (error) {
    console.error('[Extension] Accuracy calculation error:', error);
    
    // Fallback: try the model analysis endpoint
    try {
      const analysisResponse = await fetch(`http://localhost:5000/api/analyze-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          modelId: modelSlug,
          taskType: 'text-classification'
        })
      });
      
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        
        if (analysisData.success && analysisData.analysis?.mockData) {
          // Display mock data results
          const mockResult = {
            modelId: modelSlug,
            modelName: extractModelName(modelSlug),
            accuracy: {
              percentage: `${(analysisData.analysis.mockData.metrics.accuracy * 100).toFixed(1)}%`,
              raw: analysisData.analysis.mockData.metrics.accuracy
            },
            performance: analysisData.analysis.mockData.performanceLevel,
            evaluationType: 'mock',
            isMock: true,
            readyForProduction: analysisData.analysis.mockData.performanceLevel === 'excellent' || analysisData.analysis.mockData.performanceLevel === 'good',
            recommendation: `Based on published benchmarks (${analysisData.analysis.mockData.metadata.source})`,
            evaluatedAt: analysisData.analysis.mockData.evaluatedAt
          };
          
          displayAccuracyResults(mockResult, analysisData.analysis.mockData);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    } catch (fallbackError) {
      console.error('[Extension] Fallback also failed:', fallbackError);
      displayAccuracyError(error.message);
    }
  } finally {
    // Reset button state
    calculateBtn.disabled = false;
    calculateBtn.textContent = "🎯 Get Accuracy";
  }
}

function getTextQualityRating(bleuScore, rougeScore) {
  if (!bleuScore && !rougeScore) return 'Unknown';
  
  const avgScore = ((bleuScore || 0) + (rougeScore || 0)) / 2;
  
  if (avgScore >= 0.8) return '🌟 Excellent';
  if (avgScore >= 0.6) return '✅ Good';
  if (avgScore >= 0.4) return '⚠️ Fair';
  return '❌ Poor';
}

function displayAccuracyResults(result, details) {
  const resultDiv = document.getElementById("accuracy-result");
  
  const evaluationTypeLabel = result.isMock ? 
    `<span class="evaluation-type mock">📊 Mock Evaluation</span>` :
    `<span class="evaluation-type real">🔬 Real Evaluation</span>`;
  
  const performanceClass = getPerformanceClass(result.performance);
  const productionReadyIcon = result.readyForProduction ? '✅' : '⚠️';
  const productionStatus = result.readyForProduction ? 'Production Ready' : 'Needs Improvement';
  
  let additionalMetrics = '';
  
  // Check if this is a language model evaluation (has BLEU/ROUGE scores)
  if (details?.avgBLEU !== undefined || details?.evaluationType === 'language_model') {
    additionalMetrics = `
      <div class="detailed-metrics llm-metrics">
        <h4 style="color: #00ff88; margin-bottom: 10px;">📝 Language Model Metrics</h4>
        <div class="metric-row">
          <span>BLEU Score:</span> 
          <span>${details.avgBLEU ? (details.avgBLEU * 100).toFixed(1) : 'N/A'}%</span>
        </div>
        <div class="metric-row">
          <span>ROUGE Score:</span> 
          <span>${details.avgROUGE ? (details.avgROUGE * 100).toFixed(1) : 'N/A'}%</span>
        </div>
        <div class="metric-row">
          <span>Perplexity:</span> 
          <span>${details.avgPerplexity ? details.avgPerplexity.toFixed(1) : 'N/A'}</span>
        </div>
        <div class="metric-row">
          <span>Text Quality:</span> 
          <span>${getTextQualityRating(details.avgBLEU, details.avgROUGE)}</span>
        </div>
      </div>
    `;
  } else if (details?.aggregatedMetrics?.mean) {
    // Traditional classification metrics
    const metrics = details.aggregatedMetrics.mean;
    additionalMetrics = `
      <div class="detailed-metrics classification-metrics">
        <h4 style="color: #00ff88; margin-bottom: 10px;">🎯 Classification Metrics</h4>
        <div class="metric-row">
          <span>Precision:</span> 
          <span>${(metrics.precision * 100).toFixed(1)}%</span>
        </div>
        <div class="metric-row">
          <span>Recall:</span> 
          <span>${(metrics.recall * 100).toFixed(1)}%</span>
        </div>
        <div class="metric-row">
          <span>F1-Score:</span> 
          <span>${(metrics.f1 * 100).toFixed(1)}%</span>
        </div>
      </div>
    `;
  } else if (details?.metrics) {
    const metrics = details.metrics;
    additionalMetrics = `
      <div class="detailed-metrics classification-metrics">
        <h4 style="color: #00ff88; margin-bottom: 10px;">🎯 Classification Metrics</h4>
        <div class="metric-row">
          <span>Precision:</span> 
          <span>${(metrics.precision * 100).toFixed(1)}%</span>
        </div>
        <div class="metric-row">
          <span>Recall:</span> 
          <span>${(metrics.recall * 100).toFixed(1)}%</span>
        </div>
        <div class="metric-row">
          <span>F1-Score:</span> 
          <span>${(metrics.f1 * 100).toFixed(1)}%</span>
        </div>
      </div>
    `;
  }
  
  let sourceInfo = '';
  if (result.isMock && details?.metadata?.source) {
    sourceInfo = `<p class="source-info">📖 Source: ${details.metadata.source}</p>`;
  }
  
  resultDiv.innerHTML = `
    <div class="accuracy-display">
      ${evaluationTypeLabel}
      
      <div class="accuracy-header">
        <div class="accuracy-score ${performanceClass}">
          <span class="accuracy-number">${result.accuracy.percentage}</span>
          <span class="accuracy-label">Accuracy</span>
        </div>
        
        <div class="performance-badge ${performanceClass}">
          <span class="performance-level">${result.performance.toUpperCase()}</span>
        </div>
      </div>
      
      ${additionalMetrics}
      
      <div class="production-status">
        <span class="status-icon">${productionReadyIcon}</span>
        <span class="status-text">${productionStatus}</span>
      </div>
      
      <div class="recommendation">
        <p><strong>💡 Recommendation:</strong> ${result.recommendation}</p>
      </div>
      
      ${sourceInfo}
      
      <div class="evaluation-details">
        <p><strong>Model:</strong> ${result.modelName}</p>
        <p><strong>Evaluation Type:</strong> ${result.evaluationType}</p>
        <p><strong>Evaluated:</strong> ${new Date(result.evaluatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  `;
}

function displayAccuracyError(errorMessage) {
  const resultDiv = document.getElementById("accuracy-result");
  
  resultDiv.innerHTML = `
    <div class="error-display">
      <div class="error-icon">❌</div>
      <div class="error-message">
        <h3>Evaluation Failed</h3>
        <p>${errorMessage}</p>
        <p class="error-suggestion">Please try again or check if the model ID is correct.</p>
      </div>
    </div>
  `;
}

function getPerformanceClass(performance) {
  switch (performance?.toLowerCase()) {
    case 'excellent': return 'excellent';
    case 'good': return 'good';
    case 'acceptable': return 'acceptable';
    case 'poor': return 'poor';
    default: return 'unknown';
  }
}

function extractModelName(modelId) {
  return modelId.split('/').pop() || modelId;
}

// Updated CSS styles for the new accuracy display
function addAccuracyStyles() {
  if (document.getElementById('accuracy-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'accuracy-styles';
  style.textContent = `
    .evaluation-type {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 12px;
    }
    
    .evaluation-type.mock {
      background: #fef3c7;
      color: #92400e;
    }
    
    .evaluation-type.real {
      background: #d1fae5;
      color: #065f46;
    }
    
    .accuracy-display {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
      color: white;
      text-align: center;
    }
    
    .accuracy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .accuracy-score {
      text-align: left;
    }
    
    .accuracy-number {
      display: block;
      font-size: 32px;
      font-weight: bold;
      line-height: 1;
    }
    
    .accuracy-label {
      display: block;
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .performance-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
    }
    
    .performance-badge.excellent {
      background: #10b981;
    }
    
    .performance-badge.good {
      background: #3b82f6;
    }
    
    .performance-badge.acceptable {
      background: #f59e0b;
    }
    
    .performance-badge.poor {
      background: #ef4444;
    }
    
    .detailed-metrics {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin: 16px 0;
    }
    
    .metric-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 13px;
    }
    
    .production-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 16px 0;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-size: 14px;
    }
    
    .recommendation {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin: 16px 0;
      text-align: left;
      font-size: 13px;
    }
    
    .source-info {
      font-size: 11px;
      opacity: 0.8;
      margin: 8px 0;
      font-style: italic;
    }
    
    .evaluation-details {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
      text-align: left;
    }
    
    .evaluation-details p {
      margin: 2px 0;
    }
    
    .error-display {
      text-align: center;
      padding: 20px;
      background: #fee2e2;
      border-radius: 8px;
      color: #991b1b;
    }
    
    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .error-message h3 {
      margin: 0 0 8px 0;
      color: #7f1d1d;
    }
    
    .error-suggestion {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 8px;
    }
  `;
  document.head.appendChild(style);
}

// Initialize styles when popup loads
document.addEventListener('DOMContentLoaded', () => {
  addAccuracyStyles();
});

async function showManualEvaluationOption(modelSlug, resultDiv, errorMessage = null) {
  const modelName = currentModel ? currentModel.id : modelSlug;
  
  resultDiv.innerHTML = `
    <div class="manual-evaluation-prompt">
      <h3>🤖 Manual Evaluation Mode</h3>
      ${errorMessage ? `<p class="error-note">⚠️ Automatic evaluation failed: ${errorMessage}</p>` : ''}
      <p><strong>Model:</strong> ${modelName}</p>
      <p>This model requires manual evaluation. Please provide sample outputs:</p>
      
      <div class="manual-inputs">
        <div class="sample-input">
          <label>Prompt 1:</label>
          <input type="text" id="prompt1" placeholder="e.g., The future of AI is..." />
          <label>Model Output 1:</label>
          <textarea id="output1" placeholder="Paste the actual text generated by ${modelName}"></textarea>
          <label>Expected Output (optional):</label>
          <textarea id="expected1" placeholder="What you expected or a reference answer"></textarea>
        </div>
        
        <div class="sample-input">
          <label>Prompt 2:</label>
          <input type="text" id="prompt2" placeholder="e.g., Explain quantum computing..." />
          <label>Model Output 2:</label>
          <textarea id="output2" placeholder="Paste the actual text generated by ${modelName}"></textarea>
          <label>Expected Output (optional):</label>
          <textarea id="expected2" placeholder="What you expected or a reference answer"></textarea>
        </div>
        
        <button id="submit-manual-eval" class="calculate-btn">🔄 Evaluate Outputs</button>
      </div>
    </div>
  `;
  
  // Add event listener for manual evaluation
  document.getElementById("submit-manual-eval").addEventListener('click', () => {
    submitManualEvaluation(modelSlug, resultDiv);
  });
}

async function submitManualEvaluation(modelSlug, resultDiv) {
  const submitBtn = document.getElementById("submit-manual-eval");
  submitBtn.disabled = true;
  submitBtn.textContent = "Evaluating...";
  
  // Collect inputs
  const outputs = [];
  
  for (let i = 1; i <= 2; i++) {
    const prompt = document.getElementById(`prompt${i}`).value.trim();
    const output = document.getElementById(`output${i}`).value.trim();
    const expected = document.getElementById(`expected${i}`).value.trim();
    
    if (prompt && output) {
      outputs.push({
        prompt: prompt,
        generated_text: output,
        expected_output: expected || null
      });
    }
  }
  
  if (outputs.length === 0) {
    alert("Please provide at least one prompt and output pair.");
    submitBtn.disabled = false;
    submitBtn.textContent = "🔄 Evaluate Outputs";
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:5000/evaluate-outputs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelId: modelSlug,
        taskType: 'text-generation',
        outputs: outputs
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      displayEvaluationResults(data, resultDiv);
    } else {
      throw new Error(data.error || 'Manual evaluation failed');
    }
    
  } catch (error) {
    console.error('Error in manual evaluation:', error);
    resultDiv.innerHTML = `
      <div class="error-result">
        <h3>❌ Evaluation Error</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    `;
  }
}

function displayEvaluationResults(data, resultDiv) {
  const evaluation = data.evaluation;
  const modelName = evaluation.modelName || evaluation.modelId || 'Unknown Model';
  const taskType = evaluation.taskType || 'Unknown Task';
  const metrics = evaluation.metrics || {};
  
  let resultHTML = `
    <div class="accuracy-results">
      <h3>📊 Evaluation Results</h3>
      <p><strong>Model:</strong> ${modelName}</p>
      <p><strong>Task Type:</strong> ${taskType}</p>
  `;
  
  // Show cache status if available
  if (data.cached) {
    resultHTML += `<p><strong>Status:</strong> <span class="status-indicator status-cached">✓ Cached Result</span></p>`;
  } else {
    resultHTML += `<p><strong>Status:</strong> <span class="status-indicator status-fresh">🔄 Fresh Evaluation</span></p>`;
  }
  
  resultHTML += `<div class="metrics">`;
  
  // Display metrics based on available data
  if (metrics.combinedScore !== undefined) {
    // New model-agnostic evaluation results
    const score = metrics.accuracyPercentage || Math.round(metrics.combinedScore * 100);
    resultHTML += `<div class="metric-item"><span class="metric-label">Overall Score:</span> <span class="metric-value score-${getScoreClass(score)}">${score}%</span></div>`;
    
    if (metrics.semanticSimilarity !== undefined) {
      const semanticScore = Math.round(metrics.semanticSimilarity * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Semantic Similarity:</span> <span class="metric-value score-${getScoreClass(semanticScore)}">${semanticScore}%</span></div>`;
    }
    
    if (metrics.keywordRelevance !== undefined) {
      const keywordScore = Math.round(metrics.keywordRelevance * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Keyword Relevance:</span> <span class="metric-value score-${getScoreClass(keywordScore)}">${keywordScore}%</span></div>`;
    }
    
    if (metrics.overallQuality !== undefined) {
      const qualityScore = Math.round(metrics.overallQuality * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Text Quality:</span> <span class="metric-value score-${getScoreClass(qualityScore)}">${qualityScore}%</span></div>`;
    }
    
    resultHTML += `<div class="metric-item"><span class="metric-label">Samples Tested:</span> <span class="metric-value">${metrics.samplesTested || 0}</span></div>`;
    
    if (data.note) {
      resultHTML += `<p class="eval-note">${data.note}</p>`;
    }
    
  } else if (taskType === 'text-classification') {
    // Original text classification results
    const accuracy = metrics.accuracyPercentage || 0;
        const scoreClass = accuracy >= 70 ? 'score-high' : accuracy >= 40 ? 'score-medium' : 'score-low';
        resultHTML += `
          <p><strong>🎯 Accuracy:</strong> <span class="${scoreClass}" style="font-size: 18px; font-weight: bold;">${accuracy}%</span></p>
          <p><strong>✅ Correct Predictions:</strong> <span>${metrics.correctPredictions || 0}/${metrics.samplesTested || 0}</span></p>
          <p><strong>🔺 Average Confidence:</strong> <span>${((metrics.averageConfidence || 0) * 100).toFixed(1)}%</span></p>
        `;
      } else if (taskType === 'text-generation') {
        const score = metrics.relevanceScore || 0;
        const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';
        resultHTML += `
          <p><strong>📝 Relevance Score:</strong> <span class="${scoreClass}" style="font-size: 18px; font-weight: bold;">${score}%</span></p>
          <p><strong>🔍 Samples Tested:</strong> <span>${metrics.samplesTested || 0}</span></p>
        `;
      } else if (taskType === 'question-answering') {
        const exactMatch = (metrics.exactMatch || 0) * 100;
        const scoreClass = exactMatch >= 70 ? 'score-high' : exactMatch >= 40 ? 'score-medium' : 'score-low';
        resultHTML += `
          <p><strong>🎯 Exact Match:</strong> <span class="${scoreClass}" style="font-size: 18px; font-weight: bold;">${exactMatch.toFixed(1)}%</span></p>
          <p><strong>📊 F1 Score:</strong> <span>${metrics.f1?.toFixed(3) || 'N/A'}</span></p>
        `;
      }
      
      resultHTML += `
          </div>
          <p style="color: #6b7280; font-size: 12px;"><em>📅 Evaluated on ${new Date(evaluation.evaluatedAt).toLocaleDateString()}</em></p>
        </div>
      `;
function displayEvaluationResults(data, resultDiv) {
  const evaluation = data.evaluation;
  const modelName = evaluation.modelName || evaluation.modelId || 'Unknown Model';
  const taskType = evaluation.taskType || 'Unknown Task';
  const metrics = evaluation.metrics || {};
  
  let resultHTML = `
    <div class="accuracy-results">
      <h3>📊 Evaluation Results</h3>
      <p><strong>Model:</strong> ${modelName}</p>
      <p><strong>Task Type:</strong> ${taskType}</p>
  `;
  
  // Show cache status if available
  if (data.cached) {
    resultHTML += `<p><strong>Status:</strong> <span class="status-indicator status-cached">✓ Cached Result</span></p>`;
  } else {
    resultHTML += `<p><strong>Status:</strong> <span class="status-indicator status-fresh">🔄 Fresh Evaluation</span></p>`;
  }
  
  resultHTML += `<div class="metrics">`;
  
  // Display metrics based on available data
  if (metrics.combinedScore !== undefined) {
    // New model-agnostic evaluation results
    const score = metrics.accuracyPercentage || Math.round(metrics.combinedScore * 100);
    resultHTML += `<div class="metric-item"><span class="metric-label">Overall Score:</span> <span class="metric-value score-${getScoreClass(score)}">${score}%</span></div>`;
    
    if (metrics.semanticSimilarity !== undefined) {
      const semanticScore = Math.round(metrics.semanticSimilarity * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Semantic Similarity:</span> <span class="metric-value score-${getScoreClass(semanticScore)}">${semanticScore}%</span></div>`;
    }
    
    if (metrics.keywordRelevance !== undefined) {
      const keywordScore = Math.round(metrics.keywordRelevance * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Keyword Relevance:</span> <span class="metric-value score-${getScoreClass(keywordScore)}">${keywordScore}%</span></div>`;
    }
    
    if (metrics.overallQuality !== undefined) {
      const qualityScore = Math.round(metrics.overallQuality * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Text Quality:</span> <span class="metric-value score-${getScoreClass(qualityScore)}">${qualityScore}%</span></div>`;
    }
    
    resultHTML += `<div class="metric-item"><span class="metric-label">Samples Tested:</span> <span class="metric-value">${metrics.samplesTested || 0}</span></div>`;
    
    if (data.note) {
      resultHTML += `<p class="eval-note">${data.note}</p>`;
    }
    
  } else if (taskType === 'text-classification') {
    // Original text classification results
    const accuracy = metrics.accuracyPercentage || 0;
    resultHTML += `<div class="metric-item"><span class="metric-label">Accuracy:</span> <span class="metric-value score-${getScoreClass(accuracy)}">${accuracy}%</span></div>`;
    resultHTML += `<div class="metric-item"><span class="metric-label">Samples Tested:</span> <span class="metric-value">${metrics.samplesTested || 0}</span></div>`;
    resultHTML += `<div class="metric-item"><span class="metric-label">Correct Predictions:</span> <span class="metric-value">${metrics.correctPredictions || 0}</span></div>`;
    
    if (metrics.averageConfidence !== undefined) {
      const confidence = Math.round(metrics.averageConfidence * 100);
      resultHTML += `<div class="metric-item"><span class="metric-label">Avg Confidence:</span> <span class="metric-value">${confidence}%</span></div>`;
    }
  } else if (taskType === 'text-generation') {
    // Original text generation results  
    const score = metrics.accuracyPercentage || 0;
    resultHTML += `<div class="metric-item"><span class="metric-label">Relevance Score:</span> <span class="metric-value score-${getScoreClass(score)}">${score}%</span></div>`;
    resultHTML += `<div class="metric-item"><span class="metric-label">Samples Tested:</span> <span class="metric-value">${metrics.samplesTested || 0}</span></div>`;
  }
  
  resultHTML += `</div></div>`;
  resultDiv.innerHTML = resultHTML;
}

// Helper function to get score color class
function getScoreClass(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';  
  if (score >= 40) return 'fair';
  return 'poor';
}

// Handle agent input
function handleAgentInput() {
  askAIAgent();
}

// AI Agent functionality
async function askAIAgent() {
  const input = document.getElementById("ai-input");
  const responseDiv = document.getElementById("ai-response");
  const query = input.value.trim();
  
  if (!query) {
    alert("Please enter a question or request");
    return;
  }
  
  // Show loading state
  responseDiv.innerHTML = '<div class="loading">AI is thinking...</div>';
  responseDiv.style.display = 'block';
  
  try {
    const response = await fetch(`http://localhost:5000/ai-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      let responseHTML = `
        <div class="ai-recommendations">
          <h3>AI Recommendations</h3>
          <p><strong>Detected Task:</strong> ${data.taskType}</p>
          <div class="recommended-models">
            <h4>Top 3 Recommended Models:</h4>
      `;
      
      data.recommendations.forEach((model, index) => {
        responseHTML += `
          <div class="model-recommendation">
            <h5>${index + 1}. ${model.modelName}</h5>
            <p><strong>Accuracy:</strong> ${(model.averageAccuracy * 100).toFixed(2)}%</p>
            <p><strong>Total Evaluations:</strong> ${model.evaluationCount}</p>
            <p><strong>Last Updated:</strong> ${new Date(model.lastEvaluated).toLocaleDateString()}</p>
          </div>
        `;
      });
      
      responseHTML += `
          </div>
          <p><em>Based on performance metrics and evaluation data</em></p>
        </div>
      `;
      
      responseDiv.innerHTML = responseHTML;
    } else {
      responseDiv.innerHTML = `<div class="error">Error: ${data.error}</div>`;
    }
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    responseDiv.innerHTML = `<div class="error">Failed to get recommendations: ${error.message}</div>`;
  }
  
  // Clear input
  input.value = '';
}

// ==========================================
// MODEL WATCHLIST FUNCTIONALITY
// ==========================================

// Top AI models database
const TOP_MODELS = [
  {
    id: 'openai/gpt-4',
    name: 'GPT-4',
    description: 'OpenAI\'s most capable language model',
    tag: 'Large'
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient language model',
    tag: 'Medium'
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'LLaMA 3.1 70B',
    description: 'Meta\'s powerful instruction-tuned model',
    tag: 'Large'
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'LLaMA 3.1 8B',
    description: 'Efficient instruction-following model',
    tag: 'Medium'
  },
  {
    id: 'deepseek-ai/deepseek-coder-33b-instruct',
    name: 'DeepSeek Coder 33B',
    description: 'Specialized coding assistant model',
    tag: 'Large'
  },
  {
    id: 'deepseek-ai/deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'General-purpose conversational AI',
    tag: 'Large'
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced multimodal model',
    tag: 'Large'
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Anthropic\'s most capable model',
    tag: 'Large'
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B',
    description: 'Efficient mixture of experts model',
    tag: 'Medium'
  },
  {
    id: 'distilbert-base-uncased',
    name: 'DistilBERT',
    description: 'Lightweight BERT for text classification',
    tag: 'Small'
  }
];

let watchlist = [];
let selectedModel = null;

function initializeWatchlist() {
  console.log('[Watchlist] Initializing watchlist...');
  try {
    loadWatchlist();
    setupWatchlistEventListeners();
    updateWatchlistDisplay();
  } catch (error) {
    console.error('[Watchlist] Initialization error:', error);
  }
}

if (typeof window !== 'undefined') {
  window.initializeWatchlist = initializeWatchlist;
}

function setupWatchlistEventListeners() {
  const searchInput = document.getElementById('model-search');
  const addBtn = document.getElementById('add-model-btn');
  
  console.log('[Watchlist] Setting up event listeners...', { searchInput, addBtn });
  
  if (searchInput) {
    searchInput.addEventListener('input', handleModelSearch);
    searchInput.addEventListener('focus', showSuggestions);
    searchInput.addEventListener('blur', () => {
      // Delay hiding to allow click on suggestions
      setTimeout(hideSuggestions, 200);
    });
  } else {
    console.warn('[Watchlist] Search input not found');
  }
  
  if (addBtn) {
    addBtn.addEventListener('click', addModelToWatchlist);
  } else {
    console.warn('[Watchlist] Add button not found');
  }
  
  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      hideSuggestions();
    }
  });
}

function handleModelSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const suggestionsEl = document.getElementById('model-suggestions');
  const addBtn = document.getElementById('add-model-btn');
  
  if (query.length === 0) {
    hideSuggestions();
    selectedModel = null;
    addBtn.disabled = true;
    return;
  }
  
  // Filter models based on search query
  const filteredModels = TOP_MODELS.filter(model => 
    model.name.toLowerCase().includes(query) ||
    model.id.toLowerCase().includes(query) ||
    model.description.toLowerCase().includes(query)
  );
  
  if (filteredModels.length > 0) {
    showFilteredSuggestions(filteredModels);
  } else {
    hideSuggestions();
  }
}

function showSuggestions() {
  const suggestionsEl = document.getElementById('model-suggestions');
  if (suggestionsEl) {
    suggestionsEl.style.display = 'block';
    showFilteredSuggestions(TOP_MODELS.slice(0, 8)); // Show top 8 models
  }
}

function hideSuggestions() {
  const suggestionsEl = document.getElementById('model-suggestions');
  if (suggestionsEl) {
    suggestionsEl.style.display = 'none';
  }
}

function showFilteredSuggestions(models) {
  const suggestionsEl = document.getElementById('model-suggestions');
  if (!suggestionsEl) return;
  
  const suggestionsHTML = models.map(model => {
    const isInWatchlist = watchlist.some(w => w.id === model.id);
    const isDisabled = isInWatchlist || watchlist.length >= 3;
    
    return `
      <div class="suggestion-item ${isDisabled ? 'disabled' : ''}" data-model-id="${model.id}">
        <div>
          <div class="suggestion-name">${model.name}</div>
          <div class="suggestion-description">${model.description}</div>
        </div>
        <div class="suggestion-tag">${model.tag}</div>
        ${isInWatchlist ? '<span style="color: #888; font-size: 12px;">Added</span>' : ''}
      </div>
    `;
  }).join('');
  
  suggestionsEl.innerHTML = suggestionsHTML;
  suggestionsEl.style.display = 'block';
  
  // Add click listeners to suggestions
  suggestionsEl.querySelectorAll('.suggestion-item:not(.disabled)').forEach(item => {
    item.addEventListener('click', () => {
      const modelId = item.dataset.modelId;
      const model = TOP_MODELS.find(m => m.id === modelId);
      if (model) {
        selectModel(model);
      }
    });
  });
}

function selectModel(model) {
  selectedModel = model;
  const searchInput = document.getElementById('model-search');
  const addBtn = document.getElementById('add-model-btn');
  
  if (searchInput) {
    searchInput.value = model.name;
  }
  
  if (addBtn) {
    addBtn.disabled = false;
  }
  
  hideSuggestions();
}

function addModelToWatchlist() {
  if (!selectedModel || watchlist.length >= 3) return;
  
  // Check if model is already in watchlist
  if (watchlist.some(w => w.id === selectedModel.id)) {
    alert('Model is already in your watchlist');
    return;
  }
  
  // Add model with initial status
  const watchlistItem = {
    ...selectedModel,
    addedAt: new Date().toISOString(),
    lastUpdated: null,
    status: 'pending',
    metrics: {
      accuracy: null,
      performance: null,
      evaluationType: null
    }
  };
  
  watchlist.push(watchlistItem);
  saveWatchlist();
  updateWatchlistDisplay();
  
  // Clear search
  const searchInput = document.getElementById('model-search');
  const addBtn = document.getElementById('add-model-btn');
  
  if (searchInput) searchInput.value = '';
  if (addBtn) addBtn.disabled = true;
  
  selectedModel = null;
  
  // Trigger evaluation for the new model
  evaluateWatchlistModel(watchlistItem);
}

function removeFromWatchlist(modelId) {
  watchlist = watchlist.filter(w => w.id !== modelId);
  saveWatchlist();
  updateWatchlistDisplay();
}

async function evaluateWatchlistModel(watchlistItem) {
  const index = watchlist.findIndex(w => w.id === watchlistItem.id);
  if (index === -1) return;
  
  // Update status to loading
  watchlist[index].status = 'loading';
  watchlist[index].lastUpdated = new Date().toISOString();
  updateWatchlistDisplay();
  
  try {
    console.log(`[Watchlist] Evaluating model: ${watchlistItem.id}`);
    
    const response = await fetch(`http://localhost:5000/api/quick-accuracy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        modelId: watchlistItem.id,
        taskType: 'text-classification'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.result) {
      // Update watchlist item with results
      watchlist[index].status = 'success';
      watchlist[index].metrics = {
        accuracy: data.result.accuracy.percentage,
        performance: data.result.performance,
        evaluationType: data.result.evaluationType,
        readyForProduction: data.result.readyForProduction
      };
      
      console.log(`[Watchlist] ✅ Evaluation completed for ${watchlistItem.id}: ${data.result.accuracy.percentage}`);
    } else {
      throw new Error(data.error || 'Unknown error occurred');
    }
  } catch (error) {
    console.error(`[Watchlist] Evaluation failed for ${watchlistItem.id}:`, error);
    watchlist[index].status = 'error';
    watchlist[index].error = error.message;
  }
  
  saveWatchlist();
  updateWatchlistDisplay();
}

function updateWatchlistDisplay() {
  const countEl = document.getElementById('watchlist-count');
  const modelsEl = document.getElementById('watchlist-models');
  
  if (countEl) {
    countEl.textContent = watchlist.length;
  }
  
  if (!modelsEl) return;
  
  if (watchlist.length === 0) {
    modelsEl.innerHTML = `
      <div class="empty-watchlist">
        <div class="empty-icon">👀</div>
        <p>No models in watchlist</p>
        <small>Add up to 3 models to monitor their performance</small>
      </div>
    `;
    return;
  }
  
  const watchlistHTML = watchlist.map(item => {
    const statusDot = getStatusDot(item.status);
    const statusText = getStatusText(item.status, item.error);
    
    return `
      <div class="watchlist-item">
        <div class="watchlist-item-header">
          <div class="watchlist-model-name">${item.name}</div>
          <div class="watchlist-actions">
            <button class="watchlist-btn refresh-btn" data-model-id="${item.id}" data-action="refresh">
              🔄
            </button>
            <button class="watchlist-btn remove-btn" data-model-id="${item.id}" data-action="remove">
              ✕
            </button>
          </div>
        </div>
        
        ${item.metrics.accuracy ? `
          <div class="watchlist-metrics">
            <div class="metric-item">
              <span class="metric-value">${item.metrics.accuracy}</span>
              <span class="metric-label">Accuracy</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">${item.metrics.performance || 'N/A'}</span>
              <span class="metric-label">Performance</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">${item.metrics.evaluationType || 'N/A'}</span>
              <span class="metric-label">Type</span>
            </div>
          </div>
        ` : ''}
        
        <div class="watchlist-status">
          <div class="status-dot ${item.status}"></div>
          <span class="status-text">${statusText}</span>
        </div>
      </div>
    `;
  }).join('');
  
  modelsEl.innerHTML = watchlistHTML;
  
  // Add event listeners to the new buttons
  modelsEl.querySelectorAll('.watchlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = e.target.dataset.modelId;
      const action = e.target.dataset.action;
      
      if (action === 'refresh') {
        refreshWatchlistModel(modelId);
      } else if (action === 'remove') {
        removeFromWatchlist(modelId);
      }
    });
  });
}

function getStatusDot(status) {
  switch (status) {
    case 'loading': return 'loading';
    case 'success': return 'success';
    case 'error': return 'error';
    default: return 'loading';
  }
}

function getStatusText(status, error) {
  switch (status) {
    case 'loading': return 'Evaluating...';
    case 'success': return 'Up to date';
    case 'error': return `Error: ${error || 'Evaluation failed'}`;
    default: return 'Pending evaluation';
  }
}

function refreshWatchlistModel(modelId) {
  const watchlistItem = watchlist.find(w => w.id === modelId);
  if (watchlistItem) {
    evaluateWatchlistModel(watchlistItem);
  }
}

function saveWatchlist() {
  chrome.storage.local.set({ 'modelWatchlist': watchlist }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Watchlist] Failed to save:', chrome.runtime.lastError);
    }
  });
}

function loadWatchlist() {
  console.log('[Watchlist] Loading watchlist from storage...');
  chrome.storage.local.get(['modelWatchlist'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('[Watchlist] Failed to load:', chrome.runtime.lastError);
      return;
    }
    
    if (result.modelWatchlist) {
      watchlist = result.modelWatchlist;
      console.log('[Watchlist] Loaded watchlist:', watchlist);
      updateWatchlistDisplay();
      
      // Auto-refresh models that haven't been updated in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      watchlist.forEach(item => {
        if (!item.lastUpdated || item.lastUpdated < oneHourAgo) {
          evaluateWatchlistModel(item);
        }
      });
    } else {
      console.log('[Watchlist] No saved watchlist found');
      updateWatchlistDisplay();
    }
  });
}

// Leaderboard functionality
let leaderboardData = [];
let currentFilter = 'all';

// Mock leaderboard data with user ratings
const mockLeaderboardData = [
  {
    rank: 1,
    modelName: 'GPT-4 Turbo',
    category: 'language',
    trustScore: 94,
    userRatings: [
      { user: 'alice_dev', rating: 5, comment: 'Excellent for complex reasoning tasks' },
      { user: 'bob_researcher', rating: 5, comment: 'Very reliable and consistent' },
      { user: 'charlie_ai', rating: 4, comment: 'Great performance, slightly expensive' }
    ],
    avgUserRating: 4.7
  },
  {
    rank: 2,
    modelName: 'Claude 3 Opus',
    category: 'language',
    trustScore: 92,
    userRatings: [
      { user: 'diana_writer', rating: 5, comment: 'Perfect for creative writing' },
      { user: 'eve_coder', rating: 4, comment: 'Good but sometimes verbose' },
      { user: 'frank_analyst', rating: 5, comment: 'Excellent reasoning capabilities' }
    ],
    avgUserRating: 4.7
  },
  {
    rank: 3,
    modelName: 'Gemini Pro',
    category: 'language',
    trustScore: 89,
    userRatings: [
      { user: 'grace_student', rating: 4, comment: 'Good for research and learning' },
      { user: 'henry_dev', rating: 4, comment: 'Solid performance across tasks' },
      { user: 'iris_teacher', rating: 4, comment: 'Great for educational content' }
    ],
    avgUserRating: 4.0
  },
  {
    rank: 4,
    modelName: 'CodeLlama 70B',
    category: 'code',
    trustScore: 87,
    userRatings: [
      { user: 'jack_engineer', rating: 5, comment: 'Best for code generation' },
      { user: 'kate_dev', rating: 4, comment: 'Great debugging assistance' },
      { user: 'liam_student', rating: 4, comment: 'Helpful for learning to code' }
    ],
    avgUserRating: 4.3
  },
  {
    rank: 5,
    modelName: 'DALL-E 3',
    category: 'image',
    trustScore: 85,
    userRatings: [
      { user: 'maya_artist', rating: 5, comment: 'Amazing image quality and creativity' },
      { user: 'noah_designer', rating: 4, comment: 'Good but prompt sensitivity varies' },
      { user: 'olivia_marketer', rating: 4, comment: 'Great for marketing visuals' }
    ],
    avgUserRating: 4.3
  },
  {
    rank: 6,
    modelName: 'Llama 2 70B',
    category: 'language',
    trustScore: 83,
    userRatings: [
      { user: 'paul_researcher', rating: 4, comment: 'Good open-source alternative' },
      { user: 'quinn_dev', rating: 3, comment: 'Decent but inconsistent sometimes' },
      { user: 'ruby_writer', rating: 4, comment: 'Solid for most tasks' }
    ],
    avgUserRating: 3.7
  },
  {
    rank: 7,
    modelName: 'Mistral 7B',
    category: 'language',
    trustScore: 81,
    userRatings: [
      { user: 'sam_startup', rating: 4, comment: 'Great performance/cost ratio' },
      { user: 'tina_dev', rating: 4, comment: 'Fast and efficient' },
      { user: 'uma_student', rating: 3, comment: 'Good for simple tasks' }
    ],
    avgUserRating: 3.7
  },
  {
    rank: 8,
    modelName: 'Stable Diffusion XL',
    category: 'image',
    trustScore: 79,
    userRatings: [
      { user: 'victor_artist', rating: 4, comment: 'Great open-source image model' },
      { user: 'wendy_designer', rating: 3, comment: 'Good but needs careful prompting' },
      { user: 'xavier_hobbyist', rating: 4, comment: 'Amazing for personal projects' }
    ],
    avgUserRating: 3.7
  }
];

function initializeLeaderboard() {
  leaderboardData = [...mockLeaderboardData];
  
  // Set up filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.category;
      updateLeaderboardDisplay();
    });
  });
  
  // Set up refresh button
  const refreshBtn = document.getElementById('refresh-leaderboard-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshLeaderboard);
  }
  
  updateLeaderboardDisplay();
}

function updateLeaderboardDisplay() {
  const leaderboardList = document.getElementById('leaderboard-list');
  const lastUpdatedEl = document.getElementById('leaderboard-last-updated');
  
  if (!leaderboardList) return;
  
  // Filter data based on current filter
  let filteredData = leaderboardData;
  if (currentFilter !== 'all') {
    filteredData = leaderboardData.filter(item => item.category === currentFilter);
  }
  
  // Generate HTML for leaderboard items
  leaderboardList.innerHTML = filteredData.map(item => {
    const rankClass = item.rank === 1 ? 'gold' : item.rank === 2 ? 'silver' : item.rank === 3 ? 'bronze' : 'default';
    const scoreClass = item.trustScore >= 90 ? 'high' : item.trustScore >= 80 ? 'medium' : 'low';
    
    return `
      <div class="leaderboard-item" onclick="showModelDetails('${item.modelName}')">
        <div class="rank-badge ${rankClass}">${item.rank}</div>
        <div class="model-info">
          <div class="model-name">${item.modelName}</div>
          <div class="model-category">${item.category}</div>
        </div>
        <div class="trust-score-badge ${scoreClass}">${item.trustScore}%</div>
      </div>
    `;
  }).join('');
  
  // Update last updated timestamp
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

function showModelDetails(modelName) {
  const model = leaderboardData.find(m => m.modelName === modelName);
  if (!model) return;
  
  const ratingsHtml = model.userRatings.map(rating => `
    <div style="margin-bottom: 10px; padding: 8px; background: #2a2a2a; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 600; color: #ffffff;">@${rating.user}</span>
        <span style="color: #ffd700;">${'★'.repeat(rating.rating)}${'☆'.repeat(5-rating.rating)}</span>
      </div>
      <div style="font-size: 12px; color: #cccccc;">"${rating.comment}"</div>
    </div>
  `).join('');
  
  alert(`${model.modelName} Details\n\nTrust Score: ${model.trustScore}%\nAverage User Rating: ${model.avgUserRating}/5\nCategory: ${model.category}\n\nUser Reviews:\n${model.userRatings.map(r => `@${r.user}: ${r.rating}★ - "${r.comment}"`).join('\n')}`);
}

function refreshLeaderboard() {
  const refreshBtn = document.getElementById('refresh-leaderboard-btn');
  if (refreshBtn) {
    refreshBtn.innerHTML = '<span class="btn-icon">⏳</span>Refreshing...';
    refreshBtn.disabled = true;
  }
  
  // Simulate API call delay
  setTimeout(() => {
    // Slightly randomize scores to simulate real updates
    leaderboardData.forEach(item => {
      const variation = (Math.random() - 0.5) * 2; // ±1 point variation
      item.trustScore = Math.max(0, Math.min(100, Math.round(item.trustScore + variation)));
    });
    
    // Re-sort by trust score
    leaderboardData.sort((a, b) => b.trustScore - a.trustScore);
    
    // Update ranks
    leaderboardData.forEach((item, index) => {
      item.rank = index + 1;
    });
    
    updateLeaderboardDisplay();
    
    if (refreshBtn) {
      refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>Refresh Rankings';
      refreshBtn.disabled = false;
    }
  }, 1500);
}

// Initialize leaderboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeLeaderboard();
  }, 100);
});
}