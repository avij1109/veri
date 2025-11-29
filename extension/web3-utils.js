// Web3 utilities for contract interaction
import { contractConfig } from './contract.js';

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.userAddress = null;
  }

  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      this.userAddress = accounts[0];
      
      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Create contract instance
      this.contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        this.signer
      );

      return this.userAddress;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async getModelStats(slug) {
    if (!this.contract) {
      // Create read-only contract instance
      const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc'); // Avalanche Fuji RPC
      const readOnlyContract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
        
      try {
        const stats = await readOnlyContract.getModelStats(slug);
        return {
          trustScore: Number(stats[0]),
          totalRatings: Number(stats[1]),
          activeRatings: Number(stats[2]),
          averageScore: Number(stats[3]),
          totalStaked: ethers.formatEther(stats[4])
        };
      } catch (error) {
        console.error('Failed to get model stats:', error);
        return null;
      }
    }
    
    try {
      const stats = await this.contract.getModelStats(slug);
      return {
        trustScore: Number(stats[0]),
        totalRatings: Number(stats[1]),
        activeRatings: Number(stats[2]),
        averageScore: Number(stats[3]),
        totalStaked: ethers.formatEther(stats[4])
      };
    } catch (error) {
      console.error('Failed to get model stats:', error);
      return null;
    }
  }

  async submitRating(slug, score, comment, stakeAmount = "0.001") {
    if (!this.contract) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.contract.submitRating(slug, score, comment, {
        value: ethers.parseEther(stakeAmount)
      });
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Failed to submit rating:', error);
      throw error;
    }
  }

  async getUserRating(slug, userAddress) {
    if (!this.contract) {
      const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
      const readOnlyContract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      try {
        const result = await readOnlyContract.getUserRating(slug, userAddress);
        if (result[0]) { // found
          return {
            found: true,
            score: result[1][1],
            comment: result[1][2],
            stake: ethers.formatEther(result[1][3]),
            timestamp: new Date(Number(result[1][4]) * 1000),
            slashed: result[1][5]
          };
        }
        return { found: false };
      } catch (error) {
        console.error('Failed to get user rating:', error);
        return { found: false };
      }
    }

    try {
      const result = await this.contract.getUserRating(slug, userAddress);
      if (result[0]) { // found
        return {
          found: true,
          score: result[1][1],
          comment: result[1][2],
          stake: ethers.formatEther(result[1][3]),
          timestamp: new Date(Number(result[1][4]) * 1000),
          slashed: result[1][5]
        };
      }
      return { found: false };
    } catch (error) {
      console.error('Failed to get user rating:', error);
      return { found: false };
    }
  }

  async getModelRatings(slug, limit = 10) {
    if (!this.contract) {
      const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
      const readOnlyContract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      try {
        const totalRatings = await readOnlyContract.getRatingCount(slug);
        const count = Math.min(Number(totalRatings), limit);
        
        if (count === 0) return [];
        
        const ratings = await readOnlyContract.getRatingsRange(slug, 0, count - 1);
        
        return ratings.map(rating => ({
          user: rating[0],
          score: rating[1],
          comment: rating[2],
          stake: ethers.formatEther(rating[3]),
          timestamp: new Date(Number(rating[4]) * 1000),
          slashed: rating[5]
        }));
      } catch (error) {
        console.error('Failed to get model ratings:', error);
        return [];
      }
    }

    try {
      const totalRatings = await this.contract.getRatingCount(slug);
      const count = Math.min(Number(totalRatings), limit);
      
      if (count === 0) return [];
      
      const ratings = await this.contract.getRatingsRange(slug, 0, count - 1);
      
      return ratings.map(rating => ({
        user: rating[0],
        score: rating[1],
        comment: rating[2],
        stake: ethers.formatEther(rating[3]),
        timestamp: new Date(Number(rating[4]) * 1000),
        slashed: rating[5]
      }));
    } catch (error) {
      console.error('Failed to get model ratings:', error);
      return [];
    }
  }

  isConnected() {
    return this.userAddress !== null;
  }

  getAddress() {
    return this.userAddress;
  }
}

export { Web3Manager };
