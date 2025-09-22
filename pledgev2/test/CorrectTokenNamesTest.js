// 验证使用正确的代币合约名称的测试
const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

// 使用require导入替代import

describe("CorrectTokenNamesTest", function () {
  let bep20Token, btcToken;
  let deployer, user1;

  beforeEach(async function () {
    // 获取签名者账户
    const signers = await ethers.getSigners();
    deployer = signers[0];
    user1 = signers[1];

    // 使用正确的合约名称部署代币合约
    const BEP20Token = await ethers.getContractFactory("BEP20Token");
    bep20Token = await BEP20Token.deploy();

    const BtcToken = await ethers.getContractFactory("BtcToken");
    btcToken = await BtcToken.deploy();
  });

  it("应该能够部署代币合约并铸造代币", async function () {
    // 验证合约部署成功
    expect(bep20Token.address).to.not.be.undefined;
    expect(btcToken.address).to.not.be.undefined;

    // 铸造代币到deployer账户
    const mintAmount = ethers.BigNumber.from("100000000000000000000"); // 100 BUSD
    await bep20Token.connect(deployer).mint(mintAmount);
    
    // 注意：BEP20Token合约在构造函数中已经为deployer铸造了31000000000000000000000000代币
    // 所以总余额应该是初始余额加上mint的数量
    const initialSupply = ethers.BigNumber.from("31000000000000000000000000");
    const expectedBalance = initialSupply.add(mintAmount);
    
    // 验证deployer的代币余额
    const deployerBalance = await bep20Token.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(expectedBalance);
  });

  it("应该能够将代币从deployer转移到user1", async function () {
    // 先铸造代币到deployer
    const mintAmount = ethers.BigNumber.from("100000000000000000000"); // 100 BUSD
    await bep20Token.connect(deployer).mint(mintAmount);
    
    // 从deployer转移代币到user1
    const transferAmount = ethers.BigNumber.from("50000000000000000000"); // 50 BUSD
    await bep20Token.connect(deployer).transfer(user1.address, transferAmount);
    
    // 验证user1的代币余额
    const user1Balance = await bep20Token.balanceOf(user1.address);
    expect(user1Balance).to.equal(transferAmount);
    
    // 注意：BEP20Token合约在构造函数中已经为deployer铸造了31000000000000000000000000代币
    // 所以剩余余额应该是初始余额加上(mint的数量 - transfer的数量)
    const initialSupply = ethers.BigNumber.from("31000000000000000000000000");
    const expectedRemainingBalance = initialSupply.add(mintAmount.sub(transferAmount));
    
    // 验证deployer剩余的代币余额
    const deployerBalance = await bep20Token.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(expectedRemainingBalance);
  });
});