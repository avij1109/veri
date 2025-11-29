declare global {
  interface Window {
    ethereum?: {
      request: (params: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (param: any) => void) => void;
      removeListener: (event: string, callback: (param: any) => void) => void;
      selectedAddress?: string;
    };
    ethers?: {
      providers: {
        Web3Provider: new (provider: any) => any;
      };
      Contract: new (address: string, abi: any[], provider: any) => any;
      utils: {
        parseEther: (value: string) => any;
        formatEther: (value: any) => string;
        keccak256: (data: any) => string;
        toUtf8Bytes: (str: string) => any;
      };
    };
  }
}

export {};