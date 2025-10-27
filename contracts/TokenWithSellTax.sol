// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPancakeRouter {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

interface IPancakeFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

contract TokenWithSellTax is ERC20, Ownable, ReentrancyGuard {
    IPancakeRouter public pancakeRouter;
    address public pancakePair;
    
    // Tax settings
    uint256 public sellTaxPercent = 100; // 100% sell tax
    uint256 public buyTaxPercent = 0;    // 0% buy tax
    
    // Addresses
    address public taxWallet;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    
    // Trading controls
    bool public tradingEnabled = false;
    bool public swapEnabled = false;
    
    // Exclusions
    mapping(address => bool) public isExcludedFromTax;
    mapping(address => bool) public isExcludedFromMaxTx;
    
    // Max transaction amount (can be set by owner)
    uint256 public maxTxAmount;
    
    // Events
    event TradingEnabled();
    event SwapEnabled();
    event TaxWalletUpdated(address indexed newWallet);
    event TaxPercentagesUpdated(uint256 sellTax, uint256 buyTax);
    event ExcludedFromTax(address indexed account, bool excluded);
    event ExcludedFromMaxTx(address indexed account, bool excluded);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _taxWallet,
        address _pancakeRouter
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_taxWallet != address(0), "Tax wallet cannot be zero address");
        require(_pancakeRouter != address(0), "Router cannot be zero address");
        
        taxWallet = _taxWallet;
        pancakeRouter = IPancakeRouter(_pancakeRouter);
        
        // Create PancakeSwap pair
        pancakePair = IPancakeFactory(pancakeRouter.factory()).createPair(
            address(this),
            pancakeRouter.WETH()
        );
        
        // Set max transaction amount (e.g., 1% of total supply)
        maxTxAmount = totalSupply / 100;
        
        // Exclude owner and tax wallet from tax
        isExcludedFromTax[owner()] = true;
        isExcludedFromTax[taxWallet] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[DEAD] = true;
        
        // Exclude from max tx
        isExcludedFromMaxTx[owner()] = true;
        isExcludedFromMaxTx[taxWallet] = true;
        isExcludedFromMaxTx[address(this)] = true;
        isExcludedFromMaxTx[DEAD] = true;
        
        // Mint total supply to owner
        _mint(owner(), totalSupply);
    }
    
    function _update(address from, address to, uint256 amount) internal override {
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // Skip tax logic for minting (from == address(0))
        if (from == address(0)) {
            super._update(from, to, amount);
            return;
        }
        
        // Skip tax logic for burning (to == address(0))
        if (to == address(0)) {
            super._update(from, to, amount);
            return;
        }
        
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        
        // Check if trading is enabled
        if (!tradingEnabled) {
            require(
                isExcludedFromTax[from] || isExcludedFromTax[to],
                "Trading is not enabled yet"
            );
        }
        
        // Check max transaction amount
        if (!isExcludedFromMaxTx[from] && !isExcludedFromMaxTx[to]) {
            require(amount <= maxTxAmount, "Transfer amount exceeds max transaction amount");
        }
        
        uint256 taxAmount = 0;
        
        // Calculate tax
        if (!isExcludedFromTax[from] && !isExcludedFromTax[to]) {
            if (to == pancakePair) {
                // This is a sell transaction
                taxAmount = (amount * sellTaxPercent) / 100;
            } else if (from == pancakePair) {
                // This is a buy transaction
                taxAmount = (amount * buyTaxPercent) / 100;
            }
        }
        
        uint256 transferAmount = amount - taxAmount;
        
        // Handle tax first (transfer to tax wallet)
        if (taxAmount > 0) {
            super._update(from, taxWallet, taxAmount);
        }
        
        // Transfer remaining tokens to recipient
        if (transferAmount > 0) {
            super._update(from, to, transferAmount);
        }
    }
    
    // Owner functions
    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Trading is already enabled");
        tradingEnabled = true;
        emit TradingEnabled();
    }
    
    function enableSwap() external onlyOwner {
        require(!swapEnabled, "Swap is already enabled");
        swapEnabled = true;
        emit SwapEnabled();
    }
    
    function setTaxWallet(address _taxWallet) external onlyOwner {
        require(_taxWallet != address(0), "Tax wallet cannot be zero address");
        taxWallet = _taxWallet;
        emit TaxWalletUpdated(_taxWallet);
    }
    
    function setTaxPercentages(uint256 _sellTax, uint256 _buyTax) external onlyOwner {
        require(_sellTax <= 100, "Sell tax cannot exceed 100%");
        require(_buyTax <= 100, "Buy tax cannot exceed 100%");
        sellTaxPercent = _sellTax;
        buyTaxPercent = _buyTax;
        emit TaxPercentagesUpdated(_sellTax, _buyTax);
    }
    
    function setMaxTxAmount(uint256 _maxTxAmount) external onlyOwner {
        require(_maxTxAmount >= totalSupply() / 1000, "Max tx amount too low");
        maxTxAmount = _maxTxAmount;
    }
    
    function excludeFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
        emit ExcludedFromTax(account, excluded);
    }
    
    function excludeFromMaxTx(address account, bool excluded) external onlyOwner {
        isExcludedFromMaxTx[account] = excluded;
        emit ExcludedFromMaxTx(account, excluded);
    }
    
    function batchExcludeFromTax(address[] calldata accounts, bool excluded) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            isExcludedFromTax[accounts[i]] = excluded;
            emit ExcludedFromTax(accounts[i], excluded);
        }
    }
    
    function batchExcludeFromMaxTx(address[] calldata accounts, bool excluded) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            isExcludedFromMaxTx[accounts[i]] = excluded;
            emit ExcludedFromMaxTx(accounts[i], excluded);
        }
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function emergencyWithdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // View functions
    function getTaxInfo() external view returns (uint256 sellTax, uint256 buyTax, address taxWalletAddress) {
        return (sellTaxPercent, buyTaxPercent, taxWallet);
    }
    
    function isTradingEnabled() external view returns (bool) {
        return tradingEnabled;
    }
    
    function isSwapEnabled() external view returns (bool) {
        return swapEnabled;
    }
}
