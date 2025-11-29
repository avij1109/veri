# 🔍 VeriAI - Decentralized AI Model Trust & Evaluation Platform

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Avalanche](https://img.shields.io/badge/Avalanche-Fuji-E84142)](https://testnet.snowtrace.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)

**An autonomous AI-powered platform combining GPT-4 agents, blockchain verification, and advanced ML evaluation to establish trustworthy AI model ratings.**

[Live Demo](#) | [Contract on Snowtrace](https://testnet.snowtrace.io/address/0x8a446886a44743e78138a27f359873fe86613dfe)

</div>

---

## 🎯 Problem & Solution

With thousands of AI models on platforms like Hugging Face, users face critical trust and safety challenges. **VeriAI** establishes an autonomous, blockchain-verified trust layer using:

- 🤖 **GPT-4 Autonomous Agents** - Intelligent model analysis and red-team testing
- ⛓️ **Avalanche Blockchain** - Immutable trust scores with staking mechanism
- 🧠 **Advanced ML Evaluation** - BERTScore, ROUGE, BLEU metrics with real datasets

---

## 🤖 Core Innovation: Autonomous AI Agent System

### **GPT-4 Powered Intelligence**
Our autonomous agent system represents the cutting edge of AI evaluation:

- **7-Step Autonomous Pipeline**: Agent independently analyzes models through blockchain data retrieval, statistical analysis, anomaly detection, accuracy verification, historical trends, and explainable reasoning
- **Tool-Using AI**: Agent has access to specialized tools for blockchain queries, model statistics, benchmark data, and historical analysis
- **Real-Time Blockchain Monitoring**: Automatically triggers analysis when new ratings are submitted on Avalanche, creating a self-sustaining evaluation ecosystem
- **Explainable Verdicts**: Every trust score comes with GPT-4 generated insights explaining the "why" behind the rating

### **Red Team Security Testing**
Advanced adversarial testing powered by AI:

- **Prompt Injection Detection**: Tests for system override vulnerabilities
- **Jailbreak Resistance**: Evaluates safety constraint bypass attempts  
- **Bias Detection**: Identifies discrimination patterns in outputs
- **Data Leakage Tests**: Checks for training data exposure
- **Automated Security Reports**: GPT-4 generates comprehensive security verdicts with severity ratings

### **RAG-Powered Knowledge System**
Retrieval-Augmented Generation for intelligent model documentation:

- **Multi-Source Crawling**: Fetches data from HuggingFace API, model cards, research papers, and blockchain
- **Semantic Chunking & Embeddings**: Vector store with sentence transformers for semantic search
- **Hallucination Guard**: Verification layer ensures all claims are citation-backed
- **Intelligent Q&A**: Ask natural language questions about any model's training, capabilities, and limitations

---

## ⛓️ Blockchain Trust Layer (Avalanche)

### **Decentralized Verification**
Smart contracts deployed on Avalanche Fuji provide:

- **Immutable Rating Storage**: All evaluations permanently recorded on-chain
- **AVAX Staking Mechanism**: Users stake AVAX to rate models, ensuring accountability
- **Reputation System**: Track rater credibility over time with on-chain history
- **Slashing for Malicious Actors**: Bad faith ratings result in stake loss
- **Event-Driven Architecture**: Smart contract events trigger autonomous agent analysis

### **Contract Features**
```solidity
- submitRating(modelId, score, stake) → Immutable rating with stake lock
- updateTrustScore(modelId) → Weighted calculation from all ratings  
- slashRating(ratingId) → Penalize malicious raters
- getRaterReputation(address) → On-chain credibility score
```

**Deployed Contract**: `0x8a446886a44743e78138a27f359873fe86613dfe`  
**Network**: Avalanche Fuji Testnet (ChainID: 43113)  
**Explorer**: [View on Snowtrace](https://testnet.snowtrace.io/address/0x8a446886a44743e78138a27f359873fe86613dfe)

---

## 🧠 Advanced ML Evaluation Engine

### **Multi-Metric Analysis**
State-of-the-art NLP evaluation metrics:

- **BERTScore**: Semantic similarity using contextual embeddings (F1, Precision, Recall)
- **ROUGE (1/2/L)**: N-gram overlap and longest common subsequence matching
- **BLEU**: Standard machine translation quality metric
- **Perplexity**: Language model confidence measurement

### **Real Dataset Benchmarking**
Models tested on industry-standard datasets:

- **Text Generation**: CommonGen (commonsense reasoning)
- **Summarization**: XSum (extreme abstractive summarization)
- **Translation**: WMT datasets (multiple language pairs)
- **Question Answering**: SQuAD (reading comprehension)

### **Automated Task Detection**
ML-powered task type classification:

- Analyzes model architecture and metadata
- Automatically selects appropriate benchmarks
- Adapts evaluation metrics to task type
- Supports custom evaluation criteria

### **Model-Agnostic Framework**
Works with any AI model:

- API-based evaluation (HuggingFace, OpenAI, etc.)
- Local model inference support
- Custom output format handling
- Batch processing for efficiency

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VeriAI Ecosystem                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│        ┌─────────────┐           ┌──────────────┐                  │
│        │  GPT-4      │◄─────────►│  Blockchain  │                  │
│        │  Agent      │           │  (Avalanche) │                  │
│        └──────┬──────┘           └──────┬───────┘                  │
│               │                          │                           │
│               ├──── Event Listener ──────┘                          │
│               │                                                      │
│        ┌──────▼──────────────────────────────────┐                 │
│        │         Backend Services                 │                 │
│        │  • ML Evaluation (BERTScore/ROUGE)      │                 │
│        │  • RAG Knowledge Base (Vector Store)    │                 │
│        │  • Red Team Testing                      │                 │
│        │  • MongoDB Analytics                     │◄─────┐          │
│        │  • REST API (Port 5000)                  │      │          │
│        └──────┬────────────────┬──────────────────┘      │          │
│               │                │                          │          │
│               │                │                          │          │
│        ┌──────▼──────┐  ┌──────▼──────────┐      ┌──────┴────────┐│
│        │   Chrome    │  │   Web Dashboard │      │   MetaMask    ││
│        │  Extension  │  │  • Model Compare│◄────►│   Wallet      ││
│        │             │  │  • Analytics    │      └───────────────┘│
│        │  • Overlay  │  │  • Leaderboard  │                        │
│        │  • Rating   │  │  • Real-time    │                        │
│        └─────────────┘  │    Charts       │                        │
│                         └─────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### **Key Components**

#### **1. Autonomous Agent Core** (`/backend/agent/`)
- **agent.js**: Main orchestrator with GPT-4 integration and 7-step analysis pipeline
- **redteam.js**: Adversarial security testing module
- **tools.js**: Specialized functions for blockchain queries, statistics, anomaly detection

#### **2. Blockchain Integration** 
- **contract.js**: ethers.js interface to Avalanche smart contract
- **blockchainListener.js**: Real-time event monitoring with automatic agent triggering
- **ModelTrustRatings.sol**: Solidity smart contract with staking and reputation

#### **3. ML Evaluation Services**
- **bert-score-client.js**: Semantic similarity evaluation
- **local-evaluation-service.js**: Real dataset benchmarking
- **model-agnostic-evaluation.js**: Universal output evaluation

#### **4. RAG Crawl System** (`/backend/crawl/`)
- **crawlAgent.js**: Multi-source data collection orchestrator
- **embeddings.js**: Sentence transformer integration
- **vectorStore.js**: Semantic search with similarity matching
- **hallucinationGuard.js**: Citation verification layer

---

## 🎨 Screenshots

[Add your screenshots here]

---

## 🏆 Technical Highlights

### **Agentic AI Innovation**
✅ **Autonomous Decision Making**: Agent independently decides which tools to use and when  
✅ **Multi-Step Reasoning**: Complex analysis workflows without human intervention  
✅ **Self-Triggering**: Blockchain events automatically initiate agent evaluation  
✅ **Explainable AI**: Every decision includes reasoning and confidence levels  

### **Machine Learning Excellence**
✅ **SOTA Metrics**: BERTScore, ROUGE, BLEU for comprehensive evaluation  
✅ **Real Datasets**: Industry-standard benchmarks (SQuAD, XSum, CommonGen)  
✅ **Task Agnostic**: Automatic task detection and metric selection  
✅ **Vector Embeddings**: Semantic search with sentence transformers  

### **Blockchain Integration**
✅ **Avalanche Deployment**: Live smart contract on Fuji testnet  
✅ **Event-Driven Architecture**: Real-time blockchain monitoring  
✅ **Staking Mechanism**: Economic incentives for honest ratings  
✅ **Immutable Audit Trail**: Transparent trust history  

### **Production Ready**
✅ **Scalable Backend**: MongoDB with connection pooling, caching layer  
✅ **Modern Stack**: React 18, TypeScript, shadcn/ui  
✅ **Chrome Extension**: Seamless HuggingFace integration  
✅ **API-First Design**: RESTful endpoints for external integration  

---

## 🛠️ Technology Stack

### **AI & Machine Learning**
- OpenAI GPT-4 (Autonomous Agent)
- Sentence Transformers (Embeddings)
- BERTScore (Semantic Evaluation)
- ROUGE/BLEU (Text Metrics)
- HuggingFace Inference API

### **Blockchain**
- Avalanche Fuji Testnet
- Solidity 0.8.30
- ethers.js 6
- Hardhat
- OpenZeppelin Contracts

### **Backend**
- Node.js 18+ / Express.js 5
- MongoDB 6 (Vector Store + Cache)
- OpenAI API
- node-cron (Automation)

### **Frontend**
- React 18 / TypeScript
- Vite / Tailwind CSS
- shadcn/ui Components
- Chrome Extension API (Manifest V3)

---

## 🚀 Future Roadmap

### **Enhanced Agent Intelligence**
- Multi-agent consensus systems
- Fine-tuned security models
- Automated vulnerability patching

### **Mainnet Launch**
- Avalanche C-Chain deployment
- VeriAI token economics
- Staking rewards program

### **Ecosystem Expansion**
- Mobile apps (iOS/Android)
- Support for more model platforms
- Enterprise API with SLAs

---


## 👥 Team

Built by [@avij1109](https://github.com/avij1109) for [Hackathon Name]

---

## 🔗 Links

- **GitHub**: [github.com/avij1109/veriAI](https://github.com/avij1109/veriAI)
- **Smart Contract**: [Snowtrace Explorer](https://testnet.snowtrace.io/address/0x8a446886a44743e78138a27f359873fe86613dfe)
- **Demo Video**: [Coming Soon](#)

---

<div align="center">

**⭐ Star this repo if you find it interesting!**

*Combining GPT-4 Agents + Avalanche Blockchain + Advanced ML for Trustworthy AI*

</div>
npm run deploy:fuji
```

## 🔧 Configuration

### Environment Variables (Backend)
```env
MONGODB_URI=mongodb://localhost:27017/veriai
HUGGINGFACE_API_KEY=your_huggingface_token_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
```

### Smart Contract Configuration
Update `hardhat.config.js` with your Avalanche Fuji RPC and private key:
```javascript
networks: {
  fuji: {
    url: "https://api.avax-test.network/ext/bc/C/rpc",
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

## 🎯 Usage

### For Developers
1. **Install the browser extension** to see model ratings on Hugging Face
2. **Rate models** directly on model pages with blockchain-backed ratings
3. **Compare models** using the web dashboard
4. **Access APIs** for automated model evaluation

### For Researchers
1. **Evaluate models** using standardized benchmarks
2. **Track model performance** over time
3. **Discover new models** through the recommendation engine
4. **Export evaluation data** for research purposes

## 📊 API Endpoints

### Model Evaluation
- `GET /api/evaluate-model` - Evaluate a specific model
- `GET /api/model/:slug/stats` - Get model statistics
- `GET /api/trust-score?slug=:slug` - Get hybrid trust score

### Model Discovery
- `GET /api/models/popular` - Get popular models
- `GET /api/models/search?q=:query` - Search models
- `GET /api/models/recommendations` - Get personalized recommendations

### Ratings & Reviews
- `POST /api/rating/metadata` - Store rating metadata
- `GET /api/model/ratings?slug=:slug` - Get model ratings

## 🔗 Contract Addresses

### Avalanche Fuji Testnet
- **ModelTrustRatings**: `0x8a446886a44743e78138a27f359873fe86613dfe`
- **Network**: Avalanche Fuji (Chain ID: 43113)
- **Explorer**: [Snowtrace](https://testnet.snowtrace.io)

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Extension Testing
Load the extension in Chrome developer mode and test on any Hugging Face model page.

### Contract Testing
```bash
npx hardhat test
```

## 📈 Metrics & Analytics

VeriAI tracks various performance metrics:
- **Model Accuracy**: BLEU, ROUGE, BERTScore evaluations
- **User Ratings**: Community-driven scoring system
- **Trust Scores**: Hybrid blockchain-based reputation
- **Usage Analytics**: Model popularity and adoption rates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [VeriAI Dashboard](http://localhost:3000)
- **API Documentation**: [API Docs](http://localhost:5000/docs)
- **Contract Explorer**: [Avalanche Fuji](https://testnet.snowtrace.io/address/0x8a446886a44743e78138a27f359873fe86613dfe)

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact the development team
- Check the [documentation](./docs/)

---

Built with ❤️ for the AI community