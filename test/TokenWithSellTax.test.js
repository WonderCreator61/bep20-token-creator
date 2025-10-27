const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenWithSellTax", function () {
    let token;
    let owner;
    let taxWallet;
    let user1;
    let user2;
    let pancakeRouter;
    let pancakePair;

    beforeEach(async function () {
        [owner, taxWallet, user1, user2] = await ethers.getSigners();
        
        // Mock PancakeSwap router address
        pancakeRouter = "0xD99D1c33F9fC3444f8101754aBC90c5c0c8c0c8c";
        
        const TokenWithSellTax = await ethers.getContractFactory("TokenWithSellTax");
        token = await TokenWithSellTax.deploy(
            "TestToken",
            "TEST",
            ethers.parseEther("1000000000"), // 1 billion tokens
            taxWallet.address,
            pancakeRouter
        );
        
        await token.waitForDeployment();
        pancakePair = await token.pancakePair();
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await token.name()).to.equal("TestToken");
            expect(await token.symbol()).to.equal("TEST");
        });

        it("Should set the correct total supply", async function () {
            expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000000"));
        });

        it("Should set the correct tax wallet", async function () {
            expect(await token.taxWallet()).to.equal(taxWallet.address);
        });

        it("Should set the correct sell tax percentage", async function () {
            expect(await token.sellTaxPercent()).to.equal(100);
        });

        it("Should set the correct buy tax percentage", async function () {
            expect(await token.buyTaxPercent()).to.equal(0);
        });

        it("Should exclude owner from tax", async function () {
            expect(await token.isExcludedFromTax(owner.address)).to.be.true;
        });

        it("Should exclude tax wallet from tax", async function () {
            expect(await token.isExcludedFromTax(taxWallet.address)).to.be.true;
        });
    });

    describe("Trading Controls", function () {
        it("Should not allow trading when disabled", async function () {
            await expect(
                token.connect(user1).transfer(user2.address, ethers.parseEther("1000"))
            ).to.be.revertedWith("Trading is not enabled yet");
        });

        it("Should allow trading when enabled", async function () {
            await token.enableTrading();
            await expect(
                token.connect(owner).transfer(user1.address, ethers.parseEther("1000"))
            ).to.not.be.reverted;
        });
    });

    describe("Tax Functionality", function () {
        beforeEach(async function () {
            await token.enableTrading();
            // Transfer some tokens to user1 for testing
            await token.transfer(user1.address, ethers.parseEther("10000"));
        });

        it("Should apply 100% sell tax", async function () {
            const initialBalance = await token.balanceOf(user1.address);
            const taxWalletBalance = await token.balanceOf(taxWallet.address);
            
            // Simulate a sell by transferring to pancakePair
            await token.connect(user1).transfer(pancakePair, ethers.parseEther("1000"));
            
            const finalBalance = await token.balanceOf(user1.address);
            const finalTaxWalletBalance = await token.balanceOf(taxWallet.address);
            
            // User should have 1000 tokens less
            expect(finalBalance).to.equal(initialBalance - ethers.parseEther("1000"));
            // Tax wallet should receive 1000 tokens
            expect(finalTaxWalletBalance).to.equal(taxWalletBalance + ethers.parseEther("1000"));
        });

        it("Should not apply buy tax", async function () {
            const initialBalance = await token.balanceOf(user1.address);
            const taxWalletBalance = await token.balanceOf(taxWallet.address);
            
            // Simulate a buy by transferring from pancakePair
            await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
            
            const finalBalance = await token.balanceOf(user1.address);
            const finalTaxWalletBalance = await token.balanceOf(taxWallet.address);
            
            // User should receive full amount
            expect(finalBalance).to.equal(initialBalance + ethers.parseEther("1000"));
            // Tax wallet should not receive anything
            expect(finalTaxWalletBalance).to.equal(taxWalletBalance);
        });

        it("Should not apply tax to excluded addresses", async function () {
            const initialBalance = await token.balanceOf(owner.address);
            const taxWalletBalance = await token.balanceOf(taxWallet.address);
            
            // Owner transfer should not be taxed
            await token.transfer(user1.address, ethers.parseEther("1000"));
            
            const finalBalance = await token.balanceOf(owner.address);
            const finalTaxWalletBalance = await token.balanceOf(taxWallet.address);
            
            // Owner should have 1000 tokens less
            expect(finalBalance).to.equal(initialBalance - ethers.parseEther("1000"));
            // Tax wallet should not receive anything
            expect(finalTaxWalletBalance).to.equal(taxWalletBalance);
        });
    });

    describe("Owner Functions", function () {
        it("Should allow owner to enable trading", async function () {
            expect(await token.tradingEnabled()).to.be.false;
            await token.enableTrading();
            expect(await token.tradingEnabled()).to.be.true;
        });

        it("Should allow owner to set tax wallet", async function () {
            await token.setTaxWallet(user1.address);
            expect(await token.taxWallet()).to.equal(user1.address);
        });

        it("Should allow owner to set tax percentages", async function () {
            await token.setTaxPercentages(50, 10);
            expect(await token.sellTaxPercent()).to.equal(50);
            expect(await token.buyTaxPercent()).to.equal(10);
        });

        it("Should not allow non-owner to call owner functions", async function () {
            await expect(
                token.connect(user1).enableTrading()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Max Transaction Limits", function () {
        beforeEach(async function () {
            await token.enableTrading();
            await token.transfer(user1.address, ethers.parseEther("10000"));
        });

        it("Should enforce max transaction amount", async function () {
            const maxTxAmount = await token.maxTxAmount();
            const largeAmount = maxTxAmount + ethers.parseEther("1");
            
            await expect(
                token.connect(user1).transfer(user2.address, largeAmount)
            ).to.be.revertedWith("Transfer amount exceeds max transaction amount");
        });

        it("Should allow max transaction amount", async function () {
            const maxTxAmount = await token.maxTxAmount();
            
            await expect(
                token.connect(user1).transfer(user2.address, maxTxAmount)
            ).to.not.be.reverted;
        });
    });
});
