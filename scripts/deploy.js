const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment...");
    
    // Get the contract factory
    const TokenWithSellTax = await ethers.getContractFactory("TokenWithSellTax");
    
    // Configuration
    const tokenName = "TaxToken_1";
    const tokenSymbol = "TAX_1";
    const totalSupply = ethers.parseEther("1000000000"); // 1 billion tokens
    const taxWallet = "0x5bc0a78dbda6603f1943d887e6266db785001dcd"; // Replace with your tax wallet address
    
    // PancakeSwap Router addresses
    const pancakeRouterAddresses = {
        bscTestnet: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // PancakeSwap V2 Router on BSC Testnet
        bscMainnet: "0x10ED43C718714eb63d5aA57B78B54704E256024E"  // PancakeSwap V2 Router on BSC Mainnet
    };
    
    // Get network name
    const network = await ethers.provider.getNetwork();
    const networkName = network.chainId === 97n ? "bscTestnet" : "bscMainnet";
    const pancakeRouter = pancakeRouterAddresses[networkName];
    
    console.log(`Deploying to ${networkName} (Chain ID: ${network.chainId})`);
    console.log(`Using PancakeSwap Router: ${pancakeRouter}`);
    
    // Deploy the contract
    console.log("Deploying TokenWithSellTax...");
    const token = await TokenWithSellTax.deploy(
        tokenName,
        tokenSymbol,
        totalSupply,
        pancakeRouter,
        { gasPrice: ethers.parseUnits("1", "gwei") }
    );
    
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    console.log("Token deployed successfully!");
    console.log("Token Address:", tokenAddress);
    console.log("Token Name:", tokenName);
    console.log("Token Symbol:", tokenSymbol);
    console.log("Total Supply:", ethers.formatEther(totalSupply));
    console.log("Tax Wallet:", taxWallet);
    console.log("PancakeSwap Pair:", await token.pancakePair());
    
    // Get deployment info
    const [deployer] = await ethers.getSigners();
    console.log("Deployed by:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");
    
    // Save deployment info
    const deploymentInfo = {
        network: networkName,
        chainId: network.chainId.toString(),
        tokenAddress: tokenAddress,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        totalSupply: totalSupply.toString(),
        taxWallet: taxWallet,
        pancakeRouter: pancakeRouter,
        pancakePair: await token.pancakePair(),
        deployer: deployer.address,
        deploymentTime: new Date().toISOString()
    };
    
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `${networkName}-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`Deployment info saved to: ${deploymentFile}`);
    
    // Instructions for next steps
    console.log("\n=== NEXT STEPS ===");
    console.log("1. Add liquidity to PancakeSwap:");
    console.log(`   - Go to https://pancakeswap.finance/add/${tokenAddress}/BNB`);
    console.log("2. Enable trading:");
    console.log(`   - Call enableTrading() function on contract ${tokenAddress}`);
    
    return tokenAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
