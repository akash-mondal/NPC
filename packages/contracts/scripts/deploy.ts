import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Define Somnia Shannon testnet
const somniaShannon = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  network: 'somnia-shannon',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Shannon Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
});

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Setup clients
  const account = privateKeyToAccount(`0x${process.env.WALLET_PRIVATE_KEY}`);
  
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaShannon,
    transport: http()
  });

  console.log("🚀 Deploying contracts to Somnia Shannon Testnet");
  console.log("📍 Deployer address:", account.address);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Account balance:", formatEther(balance), "STT");

  if (balance === 0n) {
    console.log("❌ No balance! Please get STT from the faucet:");
    console.log("🚰 https://cloud.google.com/application/web3/faucet/somnia/shannon");
    return;
  }

  // We'll need to manually deploy since we don't have the hardhat deployment helpers
  console.log("\n⚠️  Manual deployment required - contracts compiled but need deployment via Hardhat Ignition or manual process");
  console.log("📋 Contracts ready for deployment:");
  console.log("  - BehaviorController");
  console.log("  - NPCRegistry");
  console.log("  - Arena");
  console.log("  - Quest");
  console.log("  - GameActionAdapter");
  console.log("  - MockERC20");

  // Create placeholder addresses for now
  const addresses = {
    npcRegistry: "0x0000000000000000000000000000000000000000",
    behaviorController: "0x0000000000000000000000000000000000000000",
    arena: "0x0000000000000000000000000000000000000000",
    quest: "0x0000000000000000000000000000000000000000",
    gameActionAdapter: "0x0000000000000000000000000000000000000000",
    mockToken: "0x0000000000000000000000000000000000000000",
  };

  const addressesPath = path.join(__dirname, "..", "addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n💾 Placeholder addresses saved to:", addressesPath);
  
  console.log("\n✅ Setup completed! Ready to deploy contracts manually or via Hardhat Ignition.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
