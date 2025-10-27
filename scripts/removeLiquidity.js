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
    
    // PancakeSwap Pair ABI
    const pairABI = [
        "function balanceOf(address owner) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function totalSupply() external view returns (uint256)"
    ];
    
    const pair = new ethers.Contract(pairAddress, pairABI, deployer);
    
    // Check LP token balance
    const lpBalance = await pair.balanceOf(deployer.address);
    console.log("LP Token Balance:", ethers.formatEther(lpBalance));
    
    if (lpBalance === 0n) {
        console.error("No LP tokens found. Nothing to remove.");
        process.exit(1);
    }
    
    // Remove all available liquidity
    const liquidityAmount = lpBalance;
    
    console.log("Liquidity Amount to Remove:", ethers.formatEther(liquidityAmount));
    
    // Fetch reserves and calculate expected amounts
    const totalSupply = await pair.totalSupply();
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();
    const weth = await router.WETH();
    
    let reserveToken, reserveWETH;
    if (token0.toLowerCase() === tokenAddress.toLowerCase()) {
        reserveToken = reserves[0];
        reserveWETH = reserves[1];
        if ((await pair.token1()).toLowerCase() !== weth.toLowerCase()) {
            throw new Error("Pair is not token/WETH");
        }
    } else {
        reserveToken = reserves[1];
        reserveWETH = reserves[0];
        if (token0.toLowerCase() !== weth.toLowerCase()) {
            throw new Error("Pair is not token/WETH");
        }
    }
    
    const expectedToken = (liquidityAmount * reserveToken) / totalSupply;
    const expectedWETH = (liquidityAmount * reserveWETH) / totalSupply;
    
    console.log("Expected Token Amount:", ethers.formatEther(expectedToken));
    console.log("Expected BNB Amount:", ethers.formatEther(expectedWETH));
    
    const slippage = 5n; // 5% slippage tolerance
    const amountTokenMin = (expectedToken * (100n - slippage)) / 100n;
    const amountETHMin = (expectedWETH * (100n - slippage)) / 100n;
    
    console.log("Minimum Token Amount:", ethers.formatEther(amountTokenMin));
    console.log("Minimum BNB Amount:", ethers.formatEther(amountETHMin));
    
    // Check allowance
    const allowance = await pair.allowance(deployer.address, routerAddress);
    console.log("Current Allowance:", ethers.formatEther(allowance));
    
    if (allowance < liquidityAmount) {
        console.log("Approving LP tokens for router...");
        const approvalTx = await pair.approve(routerAddress, liquidityAmount);
        await approvalTx.wait();
        console.log("LP token approval successful");
    }
    
    // Remove liquidity
    console.log("Removing liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    const removeLiquidityTx = await router.removeLiquidityETH(
        tokenAddress,
        liquidityAmount,
        amountTokenMin,
        amountETHMin,
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
    const finalLpBalance = await pair.balanceOf(deployer.address);
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
