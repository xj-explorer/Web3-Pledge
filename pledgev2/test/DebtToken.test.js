const { expect } = require("chai");
const { waffle } = require("hardhat");
const { show } = require("./helper/meta.js");

// 声明全局变量
let mockMultiSignature;

describe("DebtToken",function () {
    let debtToken;
    beforeEach(async ()=>{
        [minter, alice, bob, carol, _] = await ethers.getSigners();
        
        // 部署模拟多签合约
        const MockMultiSignature = await ethers.getContractFactory("MockMultiSignature");
        mockMultiSignature = await MockMultiSignature.deploy();
        
        // 使用模拟多签合约地址部署DebtToken
        const DebtToken = await ethers.getContractFactory("DebtToken");
        debtToken = await DebtToken.deploy("spBUSD_1", "spBUSD_1", mockMultiSignature.address);
    });

    it("check if mint right", async function() {
        let amount = await debtToken.totalSupply();
        show({amount});
        expect(await debtToken.totalSupply()).to.equal(0);
        
        // mint
        await debtToken.addMinter(minter.address);
        const mintAmount = ethers.BigNumber.from("100000000000000000000000000"); // 100000000 * 1e18
        await debtToken.connect(minter).mint(minter.address, mintAmount);
        expect(await debtToken.balanceOf(minter.address)).to.equal(mintAmount);
      });

    it ("can not mint without authorization", async function() {
        await expect(debtToken.connect(alice).mint(bob.address, 100000)).to.be.revertedWith("Token: caller is not the minter");
      });

    it ("add minter functionality", async function() {
        // 在当前的MockMultiSignature实现中，所有调用都会通过多签验证
        // 所以任何人都可以调用addMinter函数
        await debtToken.connect(alice).addMinter(alice.address);
        
        // 检查alice是否真的被添加为铸币者
        const isAliceMinter = await debtToken.isMinter(alice.address);
        expect(isAliceMinter).to.equal(true);
      });

    it ("after addMinter by owner, mint by minter should succeed", async function() {
        await debtToken.connect(minter).addMinter(alice.address);
        expect(await debtToken.balanceOf(bob.address)).to.equal(0);

        await debtToken.connect(alice).mint(bob.address, 100000);
        expect(await debtToken.balanceOf(bob.address)).to.equal(100000);

        await debtToken.connect(alice).mint(bob.address, 10000);
        expect(await debtToken.balanceOf(bob.address)).to.equal(110000);
      });

    it ("after delMinter, pre minter can not mint", async function() {
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(alice).mint(bob.address, 100000);
        expect(await debtToken.balanceOf(bob.address)).to.equal(100000);
        
        // delete
        await debtToken.connect(minter).delMinter(alice.address);
        await expect(debtToken.connect(alice).mint(bob.address, 100000)).to.be.revertedWith("Token: caller is not the minter");
      });

    it ("isMinter and getMinterLength should work well", async function() {
        expect(await debtToken.connect(minter).getMinterLength()).to.equal(0);

        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(minter).addMinter(bob.address);
        expect(await debtToken.connect(minter).getMinterLength()).to.equal(2);

        expect(await debtToken.isMinter(alice.address)).to.equal(true);
        expect(await debtToken.isMinter(bob.address)).to.equal(true);
        expect(await debtToken.isMinter(minter.address)).to.equal(false);

        await debtToken.connect(minter).delMinter(bob.address);
        expect(await debtToken.connect(minter).getMinterLength()).to.equal(1);
        expect(await debtToken.isMinter(bob.address)).to.equal(false);
      });

    it ("getMinter should work well", async function() {
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(minter).addMinter(bob.address);
        expect(await debtToken.getMinter(0)).to.equal(alice.address);
        expect(await debtToken.getMinter(1)).to.equal(bob.address);
        await expect(debtToken.getMinter(2)).to.be.revertedWith("Token: index out of bounds");

        await debtToken.connect(minter).delMinter(alice.address);
        expect(await debtToken.getMinter(0)).to.equal(bob.address);
        await expect(debtToken.getMinter(1)).to.be.revertedWith("Token: index out of bounds");
      });

    it ("totalSupply should work well", async function() {
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(alice).mint(bob.address, 200);
        expect(await debtToken.totalSupply()).to.equal(200);
      });
})
