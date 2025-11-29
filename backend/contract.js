import { ethers } from 'ethers';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'abi.json'), 'utf8'));

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc');

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS || '0x8a446886a44743e78138a27f359873fe86613dfe',
  contractABI,
  provider
);

export { provider, contract };

export function getExplorerUrl(txHash) {
  const chainId = process.env.CHAIN_ID || '43113';
  if (chainId === '43113') {
    return `https://testnet.snowtrace.io/tx/${txHash}`;
  }
  return `https://snowtrace.io/tx/${txHash}`;
}
