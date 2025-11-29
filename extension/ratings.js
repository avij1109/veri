(function() {
  const elSlug = document.getElementById('slug');
  const elStatus = document.getElementById('status');
  const elStats = document.getElementById('stats');
  const elRatings = document.getElementById('ratings');

  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }

  async function ensureEthers() {
    if (window.ethers) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('vendor/ethers-5.7.2.umd.min.js');
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ethers'));
      document.head.appendChild(s);
    });
  }

  async function loadStats(slug) {
    const ABI = [
      "function getModelStats(string slug) view returns (uint256,uint256,uint256,uint256,uint256)",
      "function getRatingCount(string slug) view returns (uint256)",
      "function getRatingsRange(string slug, uint256 start, uint256 end) view returns (tuple(address,uint8,string,uint256,uint256,bool)[])"
    ];
    const CONTRACT_ADDRESS = '0x8a446886a44743e78138a27f359873fe86613dfe';
    const FUJI_RPCS = [
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche_fuji',
      'https://endpoints.omniatech.io/v1/avax/fuji/public',
      'https://avalanche-fuji-c-chain.publicnode.com'
    ];

    // Try different Fuji RPC endpoints
    for (const rpc of FUJI_RPCS) {
      try {
        console.log(`Trying Fuji RPC: ${rpc}`);
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        const stats = await c.getModelStats(slug);
        const total = (await c.getRatingCount(slug)).toNumber();
        const count = Math.min(total, 20);
        const items = count > 0 ? await c.getRatingsRange(slug, 0, count - 1) : [];
        console.log(`Successfully loaded data from ${rpc}`);
        return { stats, items };
      } catch (e) {
        console.error(`Failed with RPC ${rpc}:`, e.message);
        continue;
      }
    }
    
    throw new Error('Failed to connect to any Fuji RPC endpoint');
  }

  function render(slug, data) {
    const trust = data.stats[0].toNumber();
    const total = data.stats[1].toNumber();
    const active = data.stats[2].toNumber();
    const avg = data.stats[3].toNumber();
    const staked = ethers.utils.formatEther(data.stats[4]);

    elStats.innerHTML = `
      <div class="card">
        <div>Trust Score: <strong>${trust}/100</strong></div>
        <div>Total Ratings: ${total} (active ${active})</div>
        <div>Average Score: ${avg}/100</div>
        <div>Total Staked: ${parseFloat(staked).toFixed(4)} ETH</div>
      </div>`;

    if (!data.items || data.items.length === 0) {
      elRatings.innerHTML = '<div class="muted">No ratings yet.</div>';
      return;
    }

    elRatings.innerHTML = data.items.map((r) => {
      const addr = r[0];
      const score = r[1];
      const comment = r[2];
      const stake = ethers.utils.formatEther(r[3]);
      const time = new Date(Number(r[4]) * 1000).toLocaleString();
      const slashed = r[5];
      return `<div class="card">
        <div><strong>${score}/5</strong> ⭐ – ${addr.substring(0,6)}...${addr.substring(38)}</div>
        <div class="muted">Staked: ${parseFloat(stake).toFixed(4)} ETH · ${time}${slashed ? ' · slashed' : ''}</div>
        <div>${comment ? comment.replace(/</g,'&lt;') : ''}</div>
      </div>`;
    }).join('');
  }

  (async function init() {
    const slug = getParam('model');
    elSlug.textContent = slug || '(unknown)';
    try {
      await ensureEthers();
      const data = await loadStats(slug);
      elStatus.textContent = '';
      render(slug, data);
    } catch (e) {
      console.error(e);
      elStatus.textContent = 'Failed to load details';
    }
  })();
})();


