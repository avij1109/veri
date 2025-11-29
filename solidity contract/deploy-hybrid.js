// Deployment script for hybrid ModelTrustRatings contract
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Hybrid ModelTrustRatings Contract...\n");

  // Get the contract factory
  const ModelTrustRatings = await ethers.getContractFactory("ModelTrustRatings");
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const modelTrustRatings = await ModelTrustRatings.deploy();
  
  // Wait for deployment to complete
  await modelTrustRatings.waitForDeployment();
  
  const contractAddress = await modelTrustRatings.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🌐 Network:", (await ethers.provider.getNetwork()).name);
  console.log("⛽ Gas Used:", (await modelTrustRatings.deploymentTransaction().wait()).gasUsed.toString());
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const owner = await modelTrustRatings.owner();
  const maxStake = await modelTrustRatings.MAX_STAKE_PER_RATING();
  const maxReputation = await modelTrustRatings.MAX_REPUTATION_WEIGHT();
  
  console.log("👤 Owner:", owner);
  console.log("💰 Max Stake per Rating:", ethers.formatEther(maxStake), "ETH");
  console.log("⚖️ Max Reputation Weight:", maxReputation.toString());
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    owner,
    maxStakePerRating: ethers.formatEther(maxStake),
    maxReputationWeight: maxReputation.toString(),
    deploymentTime: new Date().toISOString(),
    contractType: "Hybrid ModelTrustRatings v2.0"
  };
  
  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Hybrid contract deployment complete!");
  console.log("💡 Next steps:");
  console.log("1. Update backend server.js with new contract address");
  console.log("2. Update extension contract.js with new address");
  console.log("3. Test the hybrid system");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
