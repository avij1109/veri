import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Loader2, Wallet, Coins, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/Navigation';
import { ethers } from 'ethers';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Contract configuration
const CONTRACT_ABI = [
  "function purchasePrompts() external payable",
  "function usePrompt(string memory promptHash) external",
  "function getUserData(address user) external view returns (uint256, uint256, uint256, bool, uint256)",
  "function getContractStats() external view returns (uint256, uint256, uint256, uint256)",
  "event PromptsPurchased(address indexed user, uint256 amount, uint256 promptsAdded, uint256 totalPrompts)",
  "event PromptUsed(address indexed user, string promptHash, uint256 remainingPrompts)"
];

const CONTRACT_ADDRESS = "0x9f55cb7dbfca831edb02de95cf78eccb2c78a208"; // Deployed on Avalanche Fuji

const FUJI_NETWORK = {
  chainId: '0xA869', // 43113
  chainName: 'Avalanche Fuji',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io']
};

const Dashboard = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm VeriAI's AI model intelligence specialist. I help with:\n\n• Model recommendations for specific tasks\n• Performance comparisons (accuracy, cost, speed)\n• Technical specifications and limitations\n• Best practices for model selection\n\nTry asking: 'Which model is best for sentiment analysis?' or 'Compare GPT-4 vs Claude-3 for coding tasks'\n\n🔗 Connect your wallet to get 10 prompts for 0.1 AVAX!",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  
  // Wallet and contract states
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [userPrompts, setUserPrompts] = useState(0);
  const [contract, setContract] = useState<any>(null);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-connect if wallet was previously connected
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet();
    }
  }, []);

  const switchToFuji = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FUJI_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [FUJI_NETWORK],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connectWallet = async () => {
    try {
      setWalletError('');

      if (!window.ethereum) {
        setWalletError("MetaMask not detected. Please install MetaMask.");
        return;
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Switch to Fuji network
      await switchToFuji();

      // Initialize ethers provider (ethers v6)
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const address = await signer.getAddress();

      setUserAddress(address);
      setIsConnected(true);

      // Initialize contract
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);

      await loadUserData(contractInstance, address);
      setWalletSuccess("Wallet connected successfully!");

    } catch (error: any) {
      setWalletError(`Connection failed: ${error.message}`);
    }
  };

  const loadUserData = async (contractInstance: any, address: string) => {
    try {
      const userData = await contractInstance.getUserData(address);
      setUserPrompts(Number(userData[0]));
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const buyPrompts = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setWalletError('');

      const tx = await contract.purchasePrompts({
        value: ethers.parseEther("0.1")
      });

      setWalletSuccess("Transaction sent! Waiting for confirmation...");
      await tx.wait();

      setWalletSuccess("Purchase successful! You now have 10 more prompts.");
      await loadUserData(contract, userAddress);

    } catch (error: any) {
      setWalletError(`Purchase failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const usePromptOnChain = async (promptText: string) => {
    if (!contract) return;

    try {
      // Generate prompt hash
      const promptHash = ethers.keccak256(
        ethers.toUtf8Bytes(promptText + Date.now())
      );

      // Record prompt usage on blockchain
      const tx = await contract.usePrompt(promptHash);
      await tx.wait();

      await loadUserData(contract, userAddress);
    } catch (error) {
      console.error("Failed to record prompt usage:", error);
    }
  };

  const generateContent = async (prompt: string, apiKey?: string) => {
    try {
      // Use VeriAI backend agent instead of direct Gemini call
      const response = await fetch('http://localhost:5000/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: messages.map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'Sorry, I could not process your request.';
    } catch (error) {
      console.error('Error calling VeriAI backend:', error);
      
      // Fallback to direct Gemini call if backend is unavailable
      const API_KEY = apiKey || 'AIzaSyAMPK2nc3yTCzGv8UVFt_Ql-QJKmeloWV4';
      
      const VERIAI_AGENT_PROMPT = `You are VeriAI Assistant, THE expert in AI model evaluation and recommendations. You are specialized ONLY in AI models and their performance.

REDIRECT off-topic questions with:
"I'm VeriAI's model intelligence specialist. I focus exclusively on AI model evaluation, recommendations, and comparisons. Try asking: 'Which model is best for [task]?' or 'Compare [model A] vs [model B]'"

USER QUERY: "${prompt}"

Respond as VeriAI's AI model specialist:`;
      
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: VERIAI_AGENT_PROMPT
                  }
                ]
              }
            ]
          })
        });

        if (!geminiResponse.ok) {
          throw new Error(`Gemini API request failed: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
      } catch (geminiError) {
        console.error('Error calling Gemini API:', geminiError);
        throw geminiError;
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Check if user has prompts when wallet is connected
    if (isConnected && userPrompts <= 0) {
      setWalletError("No prompts remaining. Please purchase more prompts to continue.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentPrompt = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // Record prompt usage on blockchain if wallet connected
      if (isConnected && contract) {
        await usePromptOnChain(currentPrompt);
      }

      const aiResponse = await generateContent(currentPrompt, useCustomApiKey ? customApiKey : undefined);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setWalletError(''); // Clear any previous errors
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your request. Please check your connection and try again.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              AI Model <span className="text-gradient">Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Your specialist for AI model evaluation, recommendations, and comparisons
            </p>
            
            {/* Wallet Connection Section */}
            <div className="flex flex-col items-center gap-4">
              {!isConnected ? (
                <Card className="p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-center gap-4">
                    <Wallet className="h-6 w-6 text-orange-500" />
                    <div className="text-left">
                      <p className="font-medium">Connect Wallet for Paid Prompts</p>
                      <p className="text-sm text-gray-600">0.1 AVAX = 10 prompts on Avalanche Fuji</p>
                    </div>
                    <Button 
                      onClick={connectWallet}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Connect MetaMask
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white">
                            {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                          </Badge>
                          <span className="font-medium">{userPrompts} prompts remaining</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={buyPrompts}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      {isLoading ? 'Processing...' : 'Buy 10 Prompts (0.1 AVAX)'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Wallet Status Messages */}
          {walletError && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-red-800">{walletError}</AlertDescription>
            </Alert>
          )}

          {walletSuccess && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <AlertDescription className="text-green-800">{walletSuccess}</AlertDescription>
            </Alert>
          )}

          {/* Chat Interface */}
          <Card className="h-[600px] flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!message.isUser && (
                    <div className="w-8 h-8 bg-electric/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-electric" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <span className="text-xs opacity-70 mt-2 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {message.isUser && (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-electric/10 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-electric" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-6">
              {/* API Key Toggle */}
              {useCustomApiKey && (
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      placeholder="Enter your Gemini API key..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setUseCustomApiKey(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Input
                  placeholder={
                    isConnected 
                      ? `Ask about AI models (${userPrompts} prompts remaining)` 
                      : "Ask about AI models: 'Which model is best for coding?' or 'Compare GPT-4 vs Claude-3'"
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || (isConnected && userPrompts <= 0)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim() || (isConnected && userPrompts <= 0)}
                  className="px-4"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Use API Key Button */}
              {!useCustomApiKey && (
                <div className="mt-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUseCustomApiKey(true)}
                    className="text-xs"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Use API key instead
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;