const express = require('express');
const ethers = require('ethers');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = 3000;

const artifact = require('./artifacts/contracts/TokenWithSellTax.sol/TokenWithSellTax.json');
const { getHiddenInput, decryptString } = require('./utils/encrypt');
const abi = artifact.abi;
const bytecode = artifact.bytecode;
let PRIVATE_KEY = '';

const getProviderAndWallet = (network) => {
  const configs = {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"
    },
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    }
  };

  const config = configs[network];
  if (!config) throw new Error('Invalid network');

  const provider = new ethers.JsonRpcProvider(config.url);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  return { provider, wallet, config };
};

app.post('/deploy', async (req, res) => {
  try {
    const { tokenName, tokenSymbol, totalSupply, network } = req.body;
    if (!tokenName || !tokenSymbol || !totalSupply || !network) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const { wallet, config } = getProviderAndWallet(network);

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const totalSupplyBig = ethers.parseEther(totalSupply.toString());

    const token = await factory.deploy(tokenName, tokenSymbol, totalSupplyBig, config.router, { gasPrice: ethers.parseUnits("1", "gwei") });
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    const deploymentInfo = {
      network,
      chainId: config.chainId,
      tokenAddress,
      tokenName,
      tokenSymbol,
      totalSupply: totalSupplyBig.toString(),
      taxWallet: wallet.address,
      pancakeRouter: config.router,
      pancakePair: await token.pancakePair(),
      deployer: wallet.address,
      deploymentTime: new Date().toISOString()
    };

    const deploymentsDir = path.join(__dirname, 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    const deploymentFile = path.join(deploymentsDir, `${tokenAddress}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    res.json({ success: true, tokenAddress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/addLiquidity', async (req, res) => {
  try {
    const { tokenAddress, bnbAmount, tokenPercentage, network } = req.body;
    if (!tokenAddress || !bnbAmount || !tokenPercentage || !network) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const { wallet, config } = getProviderAndWallet(network);

    const token = new ethers.Contract(tokenAddress, abi, wallet);

    const tokenBalance = await token.balanceOf(wallet.address);
    const tokenAmount = (tokenBalance * BigInt(Math.floor(parseFloat(tokenPercentage) * 100))) / 10000n;

    if (tokenAmount === 0n) throw new Error('Token amount is zero');

    const bnbAmountBig = ethers.parseEther(bnbAmount.toString());

    const bnbBalance = await wallet.provider.getBalance(wallet.address);
    if (bnbBalance < bnbAmountBig) throw new Error('Insufficient BNB');

    if (tokenBalance < tokenAmount) throw new Error('Insufficient tokens');

    const approvalTx = await token.approve(config.router, tokenAmount);
    await approvalTx.wait();

    const routerABI = [
      "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)"
    ];
    const router = new ethers.Contract(config.router, routerABI, wallet);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const liquidityTx = await router.addLiquidityETH(
      tokenAddress,
      tokenAmount,
      tokenAmount * 95n / 100n,
      bnbAmountBig * 95n / 100n,
      wallet.address,
      deadline,
      { value: bnbAmountBig }
    );
    const receipt = await liquidityTx.wait();

    res.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/removeLiquidity', async (req, res) => {
  try {
    const { tokenAddress, network } = req.body;
    if (!tokenAddress || !network) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const { wallet, config } = getProviderAndWallet(network);

    const token = new ethers.Contract(tokenAddress, abi, wallet);

    const pairAddress = await token.pancakePair();

    const routerABI = [
      "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)",
      "function WETH() external pure returns (address)"
    ];
    const router = new ethers.Contract(config.router, routerABI, wallet);

    const pairABI = [
      "function balanceOf(address owner) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
      "function totalSupply() external view returns (uint256)"
    ];
    const pair = new ethers.Contract(pairAddress, pairABI, wallet);

    const lpBalance = await pair.balanceOf(wallet.address);
    if (lpBalance === 0n) throw new Error('No LP tokens');

    const liquidityAmount = lpBalance;

    const totalSupply = await pair.totalSupply();
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();
    const weth = await router.WETH();

    let reserveToken, reserveWETH;
    if (token0.toLowerCase() === tokenAddress.toLowerCase()) {
      reserveToken = reserves[0];
      reserveWETH = reserves[1];
      if ((await pair.token1()).toLowerCase() !== weth.toLowerCase()) throw new Error("Pair is not token/WETH");
    } else {
      reserveToken = reserves[1];
      reserveWETH = reserves[0];
      if (token0.toLowerCase() !== weth.toLowerCase()) throw new Error("Pair is not token/WETH");
    }

    const expectedToken = (liquidityAmount * reserveToken) / totalSupply;
    const expectedWETH = (liquidityAmount * reserveWETH) / totalSupply;

    const slippage = 5n;
    const amountTokenMin = (expectedToken * (100n - slippage)) / 100n;
    const amountETHMin = (expectedWETH * (100n - slippage)) / 100n;

    const allowance = await pair.allowance(wallet.address, config.router);
    if (allowance < liquidityAmount) {
      const approvalTx = await pair.approve(config.router, liquidityAmount);
      await approvalTx.wait();
    }

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const removeTx = await router.removeLiquidityETH(
      tokenAddress,
      liquidityAmount,
      amountTokenMin,
      amountETHMin,
      wallet.address,
      deadline
    );
    const receipt = await removeTx.wait();

    res.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const main = async () => {
  const password = await getHiddenInput("Enter your password: ");
  PRIVATE_KEY = await decryptString(process.env.PRIVATE_KEY, password);
}

main();