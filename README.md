# ERC20 Token with 100% Sell Tax for PancakeSwap

This project creates an ERC20 token with a 100% sell tax that can be deployed on Binance Smart Chain (BSC) and paired with PancakeSwap.

## Features

- **100% Sell Tax**: All sell transactions are taxed at 100%
- **0% Buy Tax**: No tax on buy transactions
- **PancakeSwap Integration**: Automatically creates a pair with WBNB
- **Trading Controls**: Owner can enable/disable trading
- **Tax Exclusions**: Certain addresses can be excluded from taxes
- **Max Transaction Limits**: Configurable maximum transaction amounts
- **Emergency Functions**: Owner can withdraw funds in emergencies

## Contract Details

- **Name**: TaxToken
- **Symbol**: TAX
- **Total Supply**: 1,000,000,000 tokens
- **Decimals**: 18
- **Sell Tax**: 100%
- **Buy Tax**: 0%

## Prerequisites

1. Node.js (v16 or higher)
2. A BSC wallet with BNB for gas fees

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp env.example .env
```

3. Update `.env` with your details:
```
PRIVATE_KEY=your_private_key_here
TAX_WALLET=your_tax_wallet_address
```

## Deployment

### Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

### Deploy to BSC Mainnet

```bash
npm run deploy:mainnet
```


## Adding Liquidity

After deployment, add liquidity to PancakeSwap:

1. Set your token address and liquidity settings in `.env`:
```
TOKEN_ADDRESS=your_deployed_token_address
BNB_AMOUNT=1                    # BNB amount to add as liquidity
TOKEN_PERCENTAGE=10             # Percentage of your tokens to add (10% = 10)
```

2. Run the liquidity script:
```bash
npm run add-liquidity:testnet
# or for mainnet
npm run add-liquidity:mainnet
```

**The script will automatically calculate the token amount based on the percentage you specify.**

## Removing Liquidity

To remove liquidity from PancakeSwap:

1. Set your token address in `.env`:
```
TOKEN_ADDRESS=your_deployed_token_address
```

2. Run the remove liquidity script:
```bash
npm run remove-liquidity:testnet
# or for mainnet
npm run remove-liquidity:mainnet
```

**The script will automatically remove ALL available liquidity.**

## Important Notes

⚠️ **WARNING**: This token has a 100% sell tax, meaning users will lose all their tokens when selling. This is typically used for:

- Meme tokens
- Community tokens with anti-whale mechanisms
- Tokens designed to prevent selling

⚠️ **LEGAL DISCLAIMER**: Ensure compliance with local laws and regulations. A 100% sell tax may be considered a rug pull or scam in some jurisdictions.

## Contract Functions

### Owner Functions

- `enableTrading()`: Enable trading (disabled by default)
- `enableSwap()`: Enable swap functionality
- `setTaxWallet(address)`: Set the tax collection wallet
- `setTaxPercentages(uint256, uint256)`: Update sell/buy tax percentages
- `setMaxTxAmount(uint256)`: Set maximum transaction amount
- `excludeFromTax(address, bool)`: Exclude address from taxes
- `excludeFromMaxTx(address, bool)`: Exclude address from max tx limits

### View Functions

- `getTaxInfo()`: Get current tax settings
- `isTradingEnabled()`: Check if trading is enabled
- `isSwapEnabled()`: Check if swap is enabled

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Only owner can call administrative functions
- **Tax Exclusions**: Owner and tax wallet are excluded from taxes
- **Max Transaction Limits**: Prevents large transactions
- **Emergency Withdraw**: Owner can withdraw funds in emergencies

## Network Configuration

### BSC Testnet
- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **PancakeSwap Router**: 0xD99D1c33F9fC3444f8101754aBC90c5c0c8c0c8c

### BSC Mainnet
- **Chain ID**: 56
- **RPC URL**: https://bsc-dataseed.binance.org/
- **PancakeSwap Router**: 0x10ED43C718714eb63d5aA57B78B54704E256024E

## Post-Deployment Steps

1. **Add Liquidity**: Add BNB and tokens to create a trading pair
2. **Enable Trading**: Call `enableTrading()` to allow trading
3. **Test**: Test buy/sell functionality on testnet first

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas limit in deployment
2. **Trading Disabled**: Call `enableTrading()` after deployment
3. **No Liquidity**: Add liquidity before trading

### Getting Help

- Check BSCScan for transaction details
- Verify contract parameters match deployment
- Ensure sufficient BNB for gas fees

## License

MIT License - see LICENSE file for details
