const { ethers } = require("hardhat");

async function main() {
    console.log("Removing liquidity from PancakeSwap...");
    
    // Configuration
    const tokenAddress = process.env.TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000"; // Replace with your token address
    
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        console.error("Please set TOKEN_ADDRESS environment variable or update the script");
        process.exit(1);
    }
    
    // Get the contract
    const token = await ethers.getContractAt("TokenWithSellTax", tokenAddress);
    const [deployer] = await ethers.getSigners();
    
    console.log("Deployer:", deployer.address);
    console.log("Token Address:", tokenAddress);
    
    // Get PancakeSwap pair address
    const pairAddress = await token.pancakePair();
    console.log("Pair Address:", pairAddress);
    
    // Get PancakeSwap router address
    const routerAddress = await token.pancakeRouter();
    console.log("Router Address:", routerAddress);
    
    // PancakeSwap Router ABI for removeLiquidityETH
    const routerABI = [
        "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)",
        "function WETH() external pure returns (address)"
    ];
    
    const router = new ethers.Contract(routerAddress, routerABI, deployer);
    
    // Get LP token contract
    const lpTokenABI = [
        "function balanceOf(address owner) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    
    const lpToken = new ethers.Contract(pairAddress, lpTokenABI, deployer);
    
    // Check LP token balance
    const lpBalance = await lpToken.balanceOf(deployer.address);
    console.log("LP Token Balance:", ethers.formatEther(lpBalance));
    
    if (lpBalance === 0n) {
        console.error("No LP tokens found. Nothing to remove.");
        process.exit(1);
    }
    
    // Remove all available liquidity
    const liquidityAmount = lpBalance;
    
    console.log("Liquidity Amount to Remove:", ethers.formatEther(liquidityAmount));
    
    // Check allowance
    const allowance = await lpToken.allowance(deployer.address, routerAddress);
    console.log("Current Allowance:", ethers.formatEther(allowance));
    
    if (allowance < liquidityAmount) {
        console.log("Approving LP tokens for router...");
        const approvalTx = await lpToken.approve(routerAddress, liquidityAmount);
        await approvalTx.wait();
        console.log("LP token approval successful");
    }
    
    // Remove liquidity
    console.log("Removing liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    // Calculate minimum amounts (with 5% slippage tolerance)
    const minTokenAmount = liquidityAmount * 95n / 100n;
    const minETHAmount = liquidityAmount * 95n / 100n;
    
    const removeLiquidityTx = await router.removeLiquidityETH(
        tokenAddress,
        liquidityAmount,
        minTokenAmount,
        minETHAmount,
        deployer.address,
        deadline
    );
    
    const receipt = await removeLiquidityTx.wait();
    console.log("Liquidity removed successfully!");
    console.log("Transaction Hash:", receipt.hash);
    
    // Get the returned amounts from the transaction logs
    const logs = receipt.logs;
    console.log("Removed amounts:");
    console.log("- LP Tokens Removed:", ethers.formatEther(liquidityAmount));
    
    // Check final balances
    const finalLpBalance = await lpToken.balanceOf(deployer.address);
    const finalTokenBalance = await token.balanceOf(deployer.address);
    const finalEthBalance = await deployer.provider.getBalance(deployer.address);
    
    console.log("\n=== LIQUIDITY REMOVED SUCCESSFULLY ===");
    console.log(`Transaction Hash: https://bscscan.com/tx/${receipt.hash}`);
    console.log(`Remaining LP Balance: ${ethers.formatEther(finalLpBalance)}`);
    console.log(`Your Token Balance: ${ethers.formatEther(finalTokenBalance)}`);
    console.log(`Your BNB Balance: ${ethers.formatEther(finalEthBalance)}`);
    
    if (finalLpBalance === 0n) {
        console.log("✅ All liquidity has been successfully removed!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Remove liquidity failed:", error);
        process.exit(1);
    });
