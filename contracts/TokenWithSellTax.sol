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
    uint256 public sellTaxPercent = 99; // 100% sell tax
    uint256 public buyTaxPercent = 0;    // 0% buy tax
    
    // Addresses
    address public taxWallet;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    
    // Trading controls
    
    // Exclusions
    mapping(address => bool) public isExcludedFromTax;
    mapping(address => bool) public isExcludedFromMaxTx;
    
    // Events
    event ExcludedFromTax(address indexed account, bool excluded);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _pancakeRouter
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_pancakeRouter != address(0), "Router cannot be zero address");
        taxWallet = msg.sender;
        pancakeRouter = IPancakeRouter(_pancakeRouter);
        
        // Create PancakeSwap pair
        pancakePair = IPancakeFactory(pancakeRouter.factory()).createPair(
            address(this),
            pancakeRouter.WETH()
        );
        
        // Exclude owner and tax wallet from tax
        isExcludedFromTax[owner()] = true;
        isExcludedFromTax[taxWallet] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[DEAD] = true;
        
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
        
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

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

    
    function excludeFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
        emit ExcludedFromTax(account, excluded);
    }
   
}
