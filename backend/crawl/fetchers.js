// Fetchers for crawling model data from multiple sources
import fetch from 'node-fetch';

/**
 * Fetch HuggingFace model card and metadata
 */
export async function fetchHuggingFaceModel(modelId) {
  console.log(`[Fetcher] Fetching HuggingFace model: ${modelId}`);
  
  try {
    const url = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'veriAI-crawler/1.0' }
    });
    
    if (!res.ok) {
      throw new Error(`HF API error: ${res.status}`);
    }
    
    const meta = await res.json();
    
    // Extract model card text
    const cardText = meta.cardData?.text || 
                     meta.cardData?.content || 
                     meta.modelCard || 
                     JSON.stringify(meta);
    
    // Get linked repositories
    const repo = meta.cardData?.repo || 
                 meta.cardData?.home_page || 
                 meta.repoUrl || 
                 null;
    
    return {
      success: true,
      modelId,
      source: 'huggingface',
      cardText,
      repo,
      metadata: {
        downloads: meta.downloads || 0,
        likes: meta.likes || 0,
        tags: meta.tags || [],
        pipeline_tag: meta.pipeline_tag || 'unknown',
        library_name: meta.library_name || null,
        datasets: meta.datasets || [],
        languages: meta.languages || [],
        license: meta.license || 'unknown'
      },
      raw: meta
    };
  } catch (error) {
    console.error(`[Fetcher] HuggingFace fetch failed for ${modelId}:`, error.message);
    return {
      success: false,
      modelId,
      source: 'huggingface',
      error: error.message
    };
  }
}

/**
 * Fetch GitHub repository README and metadata
 */
export async function fetchGitHubRepo(repoUrl) {
  console.log(`[Fetcher] Fetching GitHub repo: ${repoUrl}`);
  
  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }
    
    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo.replace('.git', '')}`;
    
    const res = await fetch(apiUrl, {
      headers: { 
        'User-Agent': 'veriAI-crawler/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }
    
    const repoData = await res.json();
    
    // Fetch README
    let readme = '';
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo.replace('.git', '')}/readme`, {
        headers: { 
          'User-Agent': 'veriAI-crawler/1.0',
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      if (readmeRes.ok) {
        readme = await readmeRes.text();
      }
    } catch (e) {
      console.warn(`[Fetcher] Could not fetch README: ${e.message}`);
    }
    
    return {
      success: true,
      repoUrl,
      source: 'github',
      readme,
      metadata: {
        stars: repoData.stargazers_count || 0,
        forks: repoData.forks_count || 0,
        issues: repoData.open_issues_count || 0,
        language: repoData.language || 'unknown',
        description: repoData.description || '',
        topics: repoData.topics || [],
        license: repoData.license?.name || 'unknown',
        created_at: repoData.created_at,
        updated_at: repoData.updated_at
      },
      raw: repoData
    };
  } catch (error) {
    console.error(`[Fetcher] GitHub fetch failed for ${repoUrl}:`, error.message);
    return {
      success: false,
      repoUrl,
      source: 'github',
      error: error.message
    };
  }
}

/**
 * Fetch blockchain data for model
 */
export async function fetchChainData(modelSlug, contract) {
  console.log(`[Fetcher] Fetching blockchain data for: ${modelSlug}`);
  
  try {
    // Get on-chain ratings and stats
    const [totalRatings, trustScore, avgScore] = await Promise.all([
      contract.getTotalRatings(modelSlug),
      contract.getTrustScore(modelSlug),
      contract.getAverageScore(modelSlug)
    ]);
    
    // Get recent rating events (last 10)
    const filter = contract.filters.RatingSubmitted(modelSlug);
    const events = await contract.queryFilter(filter, -50000); // Last ~50k blocks
    
    const ratings = events.slice(-10).map(event => ({
      rater: event.args.rater,
      score: Number(event.args.score),
      stake: event.args.stake?.toString() || '0',
      txHash: event.transactionHash,
      blockNumber: event.blockNumber
    }));
    
    return {
      success: true,
      modelSlug,
      source: 'blockchain',
      stats: {
        totalRatings: Number(totalRatings),
        trustScore: Number(trustScore),
        avgScore: Number(avgScore)
      },
      ratings
    };
  } catch (error) {
    console.error(`[Fetcher] Blockchain fetch failed for ${modelSlug}:`, error.message);
    return {
      success: false,
      modelSlug,
      source: 'blockchain',
      error: error.message
    };
  }
}

/**
 * Orchestrate fetching from all sources
 */
export async function fetchAllSources(modelId, contract) {
  console.log(`[Fetcher] Starting multi-source fetch for: ${modelId}`);
  
  const results = {
    modelId,
    timestamp: new Date().toISOString(),
    sources: {}
  };
  
  // Fetch HuggingFace data
  const hfData = await fetchHuggingFaceModel(modelId);
  results.sources.huggingface = hfData;
  
  // Fetch GitHub if repo link found
  if (hfData.success && hfData.repo) {
    const githubData = await fetchGitHubRepo(hfData.repo);
    results.sources.github = githubData;
  }
  
  // Fetch blockchain data
  if (contract) {
    const chainData = await fetchChainData(modelId, contract);
    results.sources.blockchain = chainData;
  }
  
  // Aggregate all text content for indexing
  const allText = [];
  
  if (hfData.success && hfData.cardText) {
    allText.push({
      source: 'huggingface_card',
      url: `https://huggingface.co/${modelId}`,
      text: hfData.cardText,
      metadata: hfData.metadata
    });
  }
  
  if (results.sources.github?.success && results.sources.github.readme) {
    allText.push({
      source: 'github_readme',
      url: results.sources.github.repoUrl,
      text: results.sources.github.readme,
      metadata: results.sources.github.metadata
    });
  }
  
  results.allText = allText;
  results.success = allText.length > 0;
  
  return results;
}
