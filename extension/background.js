// Background script to handle MetaMask communication

// Hybrid blockchain data fetching (CSP-safe)
async function fetchBlockchainData(modelSlug) {
  try {
    console.log('[Background] Fetching hybrid blockchain data for model:', modelSlug);
    
    // Try to fetch from backend first
    try {
      const response = await fetch(`http://localhost:5000/api/model/${encodeURIComponent(modelSlug)}/stats`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Background] Real blockchain data for', modelSlug, ':', data);
        return data;
      }
    } catch (backendError) {
      console.log('[Background] Backend not available, using mock data:', backendError.message);
    }
    
    // Fallback to mock data if backend is not available
    const modelHash = modelSlug.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const trustScore = Math.abs(modelHash % 100) + 1;
    const totalRatings = Math.abs(modelHash % 20) + 1;
    const averageScore = Math.abs(modelHash % 5) + 1;
    const totalStaked = (Math.abs(modelHash % 1000) / 10000).toFixed(4);
    
    console.log('[Background] Generated mock data for', modelSlug, ':', {
      trustScore, totalRatings, averageScore, totalStaked
    });
    
    return {
      trustScore,
      totalRatings,
      activeRatings: totalRatings,
      averageScore: averageScore * 20,
      totalStaked
    };
  } catch (error) {
    console.error('[Background] Failed to fetch blockchain data:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkMetaMask') {
    // Try to find a suitable tab to check MetaMask
    chrome.tabs.query({}, (tabs) => {
      // Look for any web page tab (not extension pages)
      const isHttpTab = (tab) => tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://')) && !tab.url.includes('chrome-extension://');
      const webTab = tabs.find(tab => tab.active && isHttpTab(tab)) || tabs.find(isHttpTab);
      
      if (webTab) {
        chrome.scripting.executeScript({
          target: {tabId: webTab.id},
          func: checkMetaMaskAvailability,
          world: 'MAIN'
        }, (results) => {
          if (results && results[0]) {
            sendResponse(results[0].result);
          } else {
            // Fallback: assume MetaMask is available if extension is installed
            sendResponse({available: true, isMetaMask: true, fallback: true});
          }
        });
      } else {
        // No suitable tab found, but MetaMask might still be available
        // Let's assume it's available and let the connection attempt handle it
        sendResponse({available: true, isMetaMask: true, fallback: true});
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'connectWallet') {
    // Try to find a suitable tab to connect wallet
    chrome.tabs.query({}, (tabs) => {
      // Look for any web page tab (not extension pages)
      const isHttpTab = (tab) => tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://')) && !tab.url.includes('chrome-extension://');
      const activeWebTab = tabs.find(tab => tab.active && isHttpTab(tab));
      const anyWebTab = tabs.find(isHttpTab);
      
      console.log('[Background] Active tabs:', tabs.map(t => ({id: t.id, url: t.url, active: t.active})));
      console.log('[Background] Active web tab found:', activeWebTab ? activeWebTab.url : 'none');
      console.log('[Background] Any web tab found:', anyWebTab ? anyWebTab.url : 'none');
      
      if (activeWebTab) {
        console.log('[Background] Using active web tab for wallet connection:', activeWebTab.url);
        chrome.scripting.executeScript({
          target: {tabId: activeWebTab.id},
          func: connectMetaMask,
          world: 'MAIN'
        }, (results) => {
          if (results && results[0]) {
            console.log('[Background] Wallet connection result:', results[0].result);
            sendResponse(results[0].result);
          } else {
            console.error('[Background] Failed to execute script on active tab');
            sendResponse({success: false, error: 'Failed to connect wallet - script execution failed'});
          }
        });
      } else if (anyWebTab) {
        console.log('[Background] Using any web tab for wallet connection:', anyWebTab.url);
        chrome.scripting.executeScript({
          target: {tabId: anyWebTab.id},
          func: connectMetaMask,
          world: 'MAIN'
        }, (results) => {
          if (results && results[0]) {
            console.log('[Background] Wallet connection result:', results[0].result);
            sendResponse(results[0].result);
          } else {
            console.error('[Background] Failed to execute script on any tab');
            sendResponse({success: false, error: 'Failed to connect wallet - script execution failed'});
          }
        });
      } else {
        console.log('[Background] No suitable web tab found, creating temporary tab for connection');
        // Create a temporary tab for MetaMask connection
        chrome.tabs.create({
          url: 'https://example.com',
          active: true
        }, (newTab) => {
          console.log('[Background] Created temporary tab:', newTab.id);
          
          // Wait a moment for the tab to load
          setTimeout(() => {
            console.log('[Background] Executing script on temporary tab');
            chrome.scripting.executeScript({
              target: {tabId: newTab.id},
              func: connectMetaMask,
              world: 'MAIN'
            }, (results) => {
              console.log('[Background] Script execution result on temp tab:', results);
              
              // Close the temporary tab after a short delay
              setTimeout(() => {
                chrome.tabs.remove(newTab.id);
                console.log('[Background] Closed temporary tab');
              }, 3000);
              
              if (results && results[0]) {
                console.log('[Background] Wallet connection result from temp tab:', results[0].result);
                sendResponse(results[0].result);
              } else {
                console.error('[Background] Failed to execute script on temporary tab');
                sendResponse({success: false, error: 'Failed to connect wallet - could not access MetaMask'});
              }
            });
          }, 1500); // Wait for tab to load
        });
      }
    });
    return true;
  }

  if (request.action === 'getWalletAccounts') {
    // Get current wallet accounts from any suitable tab
    chrome.tabs.query({}, (tabs) => {
      // Look for any web page tab (not extension pages)
      const isHttpTab = (tab) => tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://')) && !tab.url.includes('chrome-extension://');
      const webTab = tabs.find(tab => tab.active && isHttpTab(tab)) || tabs.find(isHttpTab);
      
      if (webTab) {
        chrome.scripting.executeScript({
          target: {tabId: webTab.id},
          func: getMetaMaskAccounts,
          world: 'MAIN'
        }, (results) => {
          if (results && results[0]) {
            sendResponse(results[0].result);
          } else {
            sendResponse({accounts: [], error: 'Failed to get accounts'});
          }
        });
      } else {
        sendResponse({accounts: [], error: 'No suitable tab found'});
      }
    });
    return true;
  }

  if (request.action === 'getMetadataHash') {
    const { modelSlug, comment, userProfile, context } = request;
    handleGetMetadataHash(modelSlug, comment, userProfile, context)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'submitRating') {
    // Handle rating submission transaction
    chrome.tabs.query({}, (tabs) => {
      // Look for any web page tab (not extension pages)
      const isHttpTab = (tab) => tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://')) && !tab.url.includes('chrome-extension://');
      const activeWebTab = tabs.find(tab => tab.active && isHttpTab(tab));
      const anyWebTab = tabs.find(isHttpTab);
      
      console.log('[Background] Submitting rating transaction');
      console.log('[Background] Active web tab found:', activeWebTab ? activeWebTab.url : 'none');
      console.log('[Background] Any web tab found:', anyWebTab ? anyWebTab.url : 'none');
      
      const targetTab = activeWebTab || anyWebTab;
      if (targetTab) {
        console.log('[Background] Using tab for transaction:', targetTab.url);
        chrome.scripting.executeScript({
          target: {tabId: targetTab.id},
          func: submitRatingTransaction,
          args: [request.modelSlug, request.rating, request.metadataHash, request.stakeAmount],
          world: 'MAIN'
        }, (results) => {
          console.log('[Background] Transaction script execution result:', results);
          if (results && results[0]) {
            console.log('[Background] Transaction result:', results[0].result);
            sendResponse(results[0].result);
          } else {
            console.error('[Background] Failed to execute transaction script');
            sendResponse({success: false, error: 'Failed to execute transaction - no script result'});
          }
        });
      } else {
        console.log('[Background] No suitable web tab found for transaction');
        sendResponse({success: false, error: 'No suitable web tab found. Please open a web page first.'});
      }
    });
    return true;
  }

  // Handle blockchain data requests
  if (request.action === 'getModelStats') {
    console.log('[Background] Received getModelStats request for:', request.modelSlug);
    handleGetModelStats(request.modelSlug)
      .then(data => {
        console.log('[Background] getModelStats success:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('[Background] getModelStats error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  // Handle AI agent requests
  if (request.action === 'getAIInsights') {
    console.log('[Background] Received getAIInsights request for:', request.modelSlug);
    handleGetAIInsights(request.modelSlug)
      .then(data => {
        console.log('[Background] getAIInsights success:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('[Background] getAIInsights error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'triggerAIAnalysis') {
    console.log('[Background] Received triggerAIAnalysis request for:', request.modelSlug);
    handleTriggerAIAnalysis(request.modelSlug)
      .then(data => {
        console.log('[Background] triggerAIAnalysis success:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('[Background] triggerAIAnalysis error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'chatWithAgent') {
    console.log('[Background] Received chatWithAgent request:', request.message);
    handleChatWithAgent(request.message, request.context)
      .then(data => {
        console.log('[Background] chatWithAgent success:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('[Background] chatWithAgent error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'getModelRatings') {
    handleGetModelRatings(request.modelSlug)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'testBackground') {
    console.log('[Background] Test request received');
    fetchBlockchainData('test-model')
      .then((data) => {
        console.log('[Background] Test successful:', data);
        sendResponse({ success: true, message: 'Background script working', data });
      })
      .catch(error => {
        console.error('[Background] Test failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Function to get model stats from blockchain
async function handleGetModelStats(modelSlug) {
  console.log('[Background] Getting model stats for:', modelSlug);
  
  try {
    // Use the simple HTTP-based approach
    const data = await fetchBlockchainData(modelSlug);
    
    console.log('[Background] Successfully got model stats:', data);
    return data;
  } catch (error) {
    console.error('[Background] Failed to get model stats:', error);
    throw error;
  }
}

// New function to prepare metadata and return hash
async function handleGetMetadataHash(modelSlug, comment, userProfile, context) {
  try {
    console.log('[Background] Storing metadata for:', modelSlug);
    
    const metadataResponse = await fetch('http://localhost:5000/api/rating/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelSlug,
        comment,
        userProfile: userProfile || {},
        context: context || {}
      })
    });
    
    if (!metadataResponse.ok) {
      const errorBody = await metadataResponse.text();
      throw new Error(`Failed to store metadata: ${metadataResponse.status} ${errorBody}`);
    }
    
    const { metadataHash } = await metadataResponse.json();
    console.log('[Background] Metadata stored. Hash:', metadataHash);
    
    return { success: true, metadataHash };
  } catch (error) {
    console.error('[Background] Failed to get metadata hash:', error);
    throw error;
  }
}

// Hybrid blockchain data fetching (CSP-safe) - NO MOCK DATA
async function fetchBlockchainData(modelSlug) {
    console.log('[Background] Fetching hybrid blockchain data for model:', modelSlug);
    
    // Try the new trust-score API first (includes benchmark + user ratings)
    try {
        const response = await fetch(`http://localhost:5000/api/trust-score?slug=${encodeURIComponent(modelSlug)}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Background] Trust score API data for', modelSlug, ':', data);
            return {
                trustScore: data.trustScore,
                totalRatings: data.totalRatings,
                activeRatings: data.totalRatings,
                averageScore: data.userRatingScore,
                totalStaked: "0.0",
                benchmarkScore: data.benchmarkScore,
                userRatingScore: data.userRatingScore
            };
        }
    } catch (error) {
        console.log('[Background] Trust score API failed, falling back to model stats:', error.message);
    }
    
    // Fallback to old API
    const response = await fetch(`http://localhost:5000/api/model/stats?slug=${encodeURIComponent(modelSlug)}`);
      
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    console.log('[Background] Real blockchain data for', modelSlug, ':', data);
    return data;
}

// Function to get model ratings from blockchain (no mock data)
async function handleGetModelRatings(modelSlug) {
  console.log('[Background] Getting hybrid model ratings for:', modelSlug);
  
  // Use the query-based endpoint to support slugs with '/'
  const response = await fetch(`http://localhost:5000/api/model/ratings?slug=${encodeURIComponent(modelSlug)}`);
      
  if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  console.log('[Background] Real hybrid ratings for', modelSlug, ':', data);
  return data;
}

// Functions to be injected into web pages
function checkMetaMaskAvailability() {
  return {
    available: typeof window.ethereum !== 'undefined',
    isMetaMask: window.ethereum?.isMetaMask || false
  };
}

function connectMetaMask() {
  console.log('[Injected] connectMetaMask called');
  console.log('[Injected] window.ethereum available:', typeof window.ethereum !== 'undefined');
  
  if (typeof window.ethereum !== 'undefined') {
    console.log('[Injected] MetaMask detected, requesting accounts...');
    
    return window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(accounts => {
        console.log('[Injected] MetaMask connection successful, accounts:', accounts);
        return {
          success: true,
          accounts: accounts
        };
      })
      .catch(error => {
        console.error('[Injected] MetaMask connection failed:', error);
        return {
          success: false,
          error: error.message || 'Connection rejected by user'
        };
      });
  } else {
    console.log('[Injected] MetaMask not available');
    return {
      success: false,
      error: 'MetaMask not available - please install MetaMask extension'
    };
  }
}

function getMetaMaskAccounts() {
  if (typeof window.ethereum !== 'undefined') {
    return window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => ({
        accounts: accounts
      }))
      .catch(error => ({
        accounts: [],
        error: error.message
      }));
  } else {
    return {
      accounts: [],
      error: 'MetaMask not available'
    };
  }
}

function connectMetaMask() {
  console.log('[Injected] connectMetaMask called');
  console.log('[Injected] window.ethereum available:', typeof window.ethereum !== 'undefined');

  if (typeof window.ethereum !== 'undefined') {
    console.log('[Injected] MetaMask detected, requesting accounts...');

    return window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(accounts => {
        console.log('[Injected] MetaMask connection successful, accounts:', accounts);
        return {
          success: true,
          accounts: accounts
        };
      })
      .catch(error => {
        console.error('[Injected] MetaMask connection failed:', error);
        return {
          success: false,
          error: error.message || 'Connection rejected by user'
        };
      });
  } else {
    console.log('[Injected] MetaMask not available');
    return {
      success: false,
      error: 'MetaMask not available - please install MetaMask extension'
    };
  }
}

function submitRatingTransaction(modelSlug, rating, metadataHash, stakeAmount) {
  console.log('[Injected Transaction] submitRatingTransaction called');
  console.log('[Injected Transaction] Params:', { modelSlug, rating, metadataHash, stakeAmount });
  
  if (typeof window.ethereum === 'undefined') {
    console.error('[Injected Transaction] MetaMask not available');
    return Promise.resolve({
      success: false,
      error: 'MetaMask is not available. Please install MetaMask extension.'
    });
  }

  console.log('[Injected Transaction] MetaMask detected, proceeding with transaction');

  // Check current network and switch if needed
  return window.ethereum.request({ method: 'eth_chainId' })
    .then(chainId => {
      console.log('[Injected Transaction] Current chain ID:', chainId);
      if (chainId !== '0xa869') { // Avalanche Fuji
        console.log('[Injected Transaction] Wrong network, switching to Avalanche Fuji...');
        // Switch to Avalanche Fuji
        return window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa869' }],
        }).catch(switchError => {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            console.log('[Injected Transaction] Adding Avalanche Fuji network...');
            return window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xa869',
                chainName: 'Avalanche Fuji',
                nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
                rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                blockExplorerUrls: ['https://testnet.snowtrace.io']
              }],
            });
          }
          throw switchError;
        });
      }
      return Promise.resolve();
    })
    .then(() => {
      // Ensure ethers is available
      if (!window.ethers) {
        throw new Error('Ethers library not loaded. Please refresh the page.');
      }

      return window.ethereum.request({ method: 'eth_requestAccounts' });
    })
    .then(accounts => {
      console.log('[Injected Transaction] Accounts obtained:', accounts);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      // Verify we're on the correct network after switching
      return window.ethereum.request({ method: 'eth_chainId' })
        .then(currentChainId => {
          console.log('[Injected Transaction] Current chain ID after switch:', currentChainId);
          if (currentChainId !== '0xa869') {
            throw new Error('Failed to switch to Avalanche Fuji network. Please switch manually.');
          }
          
          const provider = new window.ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const contractAddress = '0x8a446886a44743e78138a27f359873fe86613dfe';
          const contractAbi = [
            "function submitRating(string calldata slug, uint8 score, bytes32 metadataHash) external payable"
          ];
          const contract = new window.ethers.Contract(contractAddress, contractAbi, signer);

          console.log('[Injected Transaction] Contract created successfully on Avalanche Fuji');
          console.log('[Injected Transaction] Contract address:', contractAddress);
          console.log('[Injected Transaction] Submitting rating with params:', { modelSlug, rating, metadataHash, stakeAmount });

          // Validate parameters
          if (!modelSlug || rating < 1 || rating > 5 || !metadataHash || !stakeAmount) {
            throw new Error('Invalid parameters for rating submission');
          }

          return contract.submitRating(modelSlug, rating, metadataHash, {
            value: window.ethers.utils.parseEther(String(stakeAmount))
          });
        });
    })
    .then(tx => {
      console.log('[Injected Transaction] Transaction sent successfully:', tx.hash);
      console.log('[Injected Transaction] Waiting for confirmation...');
      return tx.wait();
    })
    .then(receipt => {
      console.log('[Injected Transaction] Transaction mined successfully:', receipt.transactionHash);
      console.log('[Injected Transaction] Block number:', receipt.blockNumber);
      console.log('[Injected Transaction] Gas used:', receipt.gasUsed.toString());
      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    })
    .catch(error => {
      console.error('[Injected Transaction] Transaction failed:', error);
      console.error('[Injected Transaction] Error code:', error.code);
      console.error('[Injected Transaction] Error reason:', error.reason);
      console.error('[Injected Transaction] Error data:', error.data);
      
      let errorMessage = error?.message || 'Unknown transaction error';
      if (error.code === 4001) {
        errorMessage = 'User rejected the transaction.';
      } else if (error.code === 4902) {
        errorMessage = 'Please add Avalanche Fuji testnet to MetaMask.';
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
      } else if (error.data && error.data.message) {
        errorMessage = `Contract error: ${error.data.message}`;
      }
      
      return {
        success: false,
        error: errorMessage,
        code: error.code,
        reason: error.reason
      };
    });
}

async function submitRatingInPage(modelSlug, rating, comment, stakeAmount) {
  try {
    if (typeof window.ethereum === 'undefined') {
      return { success: false, error: 'MetaMask not available' };
    }

    // Ensure ethers is available (local UMD injected by background before this call)
    if (!window.ethers) {
      return { success: false, error: 'Failed to load ethers' };
    }

    const FUJI_PARAMS = {
      chainId: '0xA869', // 43113 in hex
      chainName: 'Avalanche Fuji Testnet',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
      blockExplorerUrls: ['https://testnet.snowtrace.io']
    };

    // Switch to Fuji if needed
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== FUJI_PARAMS.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: FUJI_PARAMS.chainId }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [FUJI_PARAMS]
          });
        } else {
          throw switchError;
        }
      }
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No accounts found' };
    }

    const provider = new window.ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const CONTRACT_ADDRESSES = {
      '0x1': '0x8a446886a44743e78138a27f359873fe86613dfe', // mainnet (not used)
      '0xA869': '0x8a446886a44743e78138a27f359873fe86613dfe' // fuji (primary)
    };
    const ABI = [
      'function submitRating(string memory slug, uint8 score, string memory comment) external payable'
    ];
    const activeChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const contractAddress = CONTRACT_ADDRESSES[activeChainId] || CONTRACT_ADDRESSES['0x1'];
    const contract = new window.ethers.Contract(contractAddress, ABI, signer);

    const tx = await contract.submitRating(modelSlug, rating, comment, {
      value: window.ethers.utils.parseEther(String(stakeAmount))
    });
    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, accounts };
  } catch (error) {
    let errorMessage = error?.message || String(error);
    if (error?.code === 4001) {
      errorMessage = 'User rejected request';
    }
    return { success: false, error: errorMessage };
  }
}

// AI Agent API Functions - Using Crawl Agent with RAG
async function handleGetAIInsights(modelSlug) {
  try {
    // First check if crawl analysis exists
    const crawlResponse = await fetch(`http://localhost:5000/api/crawl/${modelSlug}`);
    
    if (crawlResponse.ok) {
      const crawlData = await crawlResponse.json();
      if (crawlData.success && crawlData.data) {
        // Transform crawl analysis to match AI insights format
        const verdict = crawlData.data.verdict;
        return {
          trustScore: Math.round((verdict.confidence || 0) * 100),
          totalRatings: 0,
          avgScore: 0,
          latestInsight: {
            risk_level: verdict.risk_level,
            veracity: verdict.verification?.status || 'UNVERIFIED',
            confidence: verdict.confidence,
            summary: verdict.summary,
            evidence: verdict.findings?.map(f => ({
              type: f.category,
              detail: f.detail,
              severity: f.severity
            })) || [],
            recommended_actions: verdict.recommendations?.map(r => r.action) || [],
            crawlAnalysis: true,
            verification: verdict.verification,
            hallucination: crawlData.data.hallucination
          }
        };
      }
    }
    
    // Fallback to old agent API
    const response = await fetch(`http://localhost:5000/api/agent/trust/${modelSlug}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('[Background] Error fetching AI insights:', error);
    throw error;
  }
}

async function handleTriggerAIAnalysis(modelSlug) {
  try {
    // Use full audit endpoint that combines crawl + RAG analysis + red-team
    const response = await fetch(`http://localhost:5000/api/crawl/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ modelId: modelSlug })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Audit failed');
    }
    
    // Transform audit results to match expected format
    const analysis = data.fullResults?.analysis;
    if (analysis && analysis.verdict) {
      return {
        success: true,
        analyzing: false,
        insight: {
          risk_level: analysis.verdict.risk_level,
          veracity: analysis.verdict.verification?.status || 'UNVERIFIED',
          confidence: analysis.verdict.confidence,
          summary: analysis.verdict.summary,
          evidence: analysis.verdict.findings?.map(f => ({
            type: f.category,
            detail: f.detail,
            severity: f.severity
          })) || [],
          recommended_actions: analysis.verdict.recommendations?.map(r => r.action) || [],
          crawlAnalysis: true,
          verification: analysis.verdict.verification,
          hallucination: analysis.hallucination,
          redTeam: data.fullResults?.redTeam
        }
      };
    }
    
    return data;
  } catch (error) {
    console.error('[Background] Error triggering AI analysis:', error);
    throw error;
  }
}

async function handleChatWithAgent(message, context = {}) {
  try {
    // For now, return a simple response
    // In the future, this could call a chat API endpoint
    return {
      response: "AI Agent chat is coming soon! For now, use the 'Analyze Now' button on model pages to get AI insights.",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Background] Error in agent chat:', error);
    throw error;
  }
}
