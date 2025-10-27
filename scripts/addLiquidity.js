const { ethers } = require("hardhat");

async function main() {
    console.log("Adding liquidity to PancakeSwap...");
    
    // Configuration
    const tokenAddress = process.env.TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000"; // Replace with your token address
    const bnbAmount = ethers.parseEther(process.env.BNB_AMOUNT || "1"); // BNB amount (default: 1 BNB)
    const tokenPercentage = parseFloat(process.env.TOKEN_PERCENTAGE || "10"); // Percentage of tokens to add (default: 10%)
    
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        console.error("Please set TOKEN_ADDRESS environment variable or update the script");
        process.exit(1);
    }
    
    // Get the contract
    const token = await ethers.getContractAt("TokenWithSellTax", tokenAddress);
    const [deployer] = await ethers.getSigners();
    
    // Calculate token amount based on percentage
    const tokenBalance = await token.balanceOf(deployer.address);
    const tokenAmount = (tokenBalance * BigInt(Math.floor(tokenPercentage * 100))) / 10000n; // Convert percentage to basis points
    
    console.log("Deployer:", deployer.address);
    console.log("Token Address:", tokenAddress);
    console.log("BNB Amount:", ethers.formatEther(bnbAmount));
    console.log("Token Percentage:", tokenPercentage + "%");
    console.log("Token Amount:", ethers.formatEther(tokenAmount));
    
    // Check balances
    const bnbBalance = await deployer.provider.getBalance(deployer.address);
    
    console.log("Deployer BNB Balance:", ethers.formatEther(bnbBalance));
    console.log("Deployer Token Balance:", ethers.formatEther(tokenBalance));
    
    if (bnbBalance < bnbAmount) {
        console.error("Insufficient BNB balance");
        process.exit(1);
    }
    
    if (tokenBalance < tokenAmount) {
        console.error("Insufficient token balance");
        process.exit(1);
    }
    
    if (tokenAmount === 0n) {
        console.error("Token amount is zero. Check your token percentage setting.");
        process.exit(1);
    }
    
    // Approve tokens for router
    console.log("Approving tokens for PancakeSwap router...");
    const pancakeRouter = await token.pancakeRouter();
    const approvalTx = await token.approve(pancakeRouter, tokenAmount);
    await approvalTx.wait();
    console.log("Token approval successful");
    
    // Get PancakeSwap router contract
    const routerABI = [
        "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)"
    ];
    
    const router = new ethers.Contract(pancakeRouter, routerABI, deployer);
    
    // Add liquidity
    console.log("Adding liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    const liquidityTx = await router.addLiquidityETH(
        tokenAddress,
        tokenAmount,
        tokenAmount * 95n / 100n, // 5% slippage tolerance
        bnbAmount * 95n / 100n,   // 5% slippage tolerance
        deployer.address,
        deadline,
        { value: bnbAmount }
    );
    
    const receipt = await liquidityTx.wait();
    console.log("Liquidity added successfully!");
    console.log("Transaction Hash:", receipt.hash);
    
    // Get pair address
    const pairAddress = await token.pancakePair();
    console.log("Pair Address:", pairAddress);
    
    console.log("\n=== LIQUIDITY ADDED ===");
    console.log(`View on PancakeSwap: https://pancakeswap.finance/swap?inputCurrency=BNB&outputCurrency=${tokenAddress}`);
    console.log(`View on BSCScan: https://bscscan.com/tx/${receipt.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Add liquidity failed:", error);
        process.exit(1);
    });
