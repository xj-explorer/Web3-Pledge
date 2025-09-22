// 考虑初始供应量的代币测试
const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

// 使用require导入替代import

describe("FixedTokenTestWithInitialSupply", function () {
  let bep20Token, btcToken;
  let deployer, user1;
  let initialSupply;

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

    // 获取代币的初始供应量
    initialSupply = await bep20Token.totalSupply();
    console.log(`初始供应量: ${initialSupply.toString()}`);
  });

  it("应该能够验证合约部署成功并有初始供应量", async function () {
    // 验证合约部署成功
    expect(bep20Token.address).to.not.be.undefined;
    expect(btcToken.address).to.not.be.undefined;

    // 验证totalSupply
    const busdTotalSupply = await bep20Token.totalSupply();
    const btcTotalSupply = await btcToken.totalSupply();
    
    // 检查初始供应量是否是一个有效数值
    expect(busdTotalSupply).to.be.not.undefined;
    expect(btcTotalSupply).to.be.not.undefined;
    
    // 验证deployer拥有所有初始代币
    const deployerBusdBalance = await bep20Token.balanceOf(deployer.address);
    const deployerBtcBalance = await btcToken.balanceOf(deployer.address);
    
    expect(deployerBusdBalance).to.equal(busdTotalSupply);
    expect(deployerBtcBalance).to.equal(btcTotalSupply);
  });

  it("应该能够从deployer转移代币到user1", async function () {
    // 从deployer转移代币到user1
    const transferAmount = ethers.BigNumber.from("100000000000000000000"); // 100代币
    await bep20Token.connect(deployer).transfer(user1.address, transferAmount);
    
    // 验证user1的代币余额
    const user1Balance = await bep20Token.balanceOf(user1.address);
    expect(user1Balance).to.equal(transferAmount);
    
    // 验证deployer剩余的代币余额
    const deployerBalance = await bep20Token.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(initialSupply.sub(transferAmount));
  });

  it("应该能够铸造更多代币", async function () {
    // 铸造更多代币到deployer
    const mintAmount = ethers.BigNumber.from("100000000000000000000"); // 100代币
    await bep20Token.connect(deployer).mint(mintAmount);
    
    // 验证totalSupply增加了mintAmount
    const newTotalSupply = await bep20Token.totalSupply();
    expect(newTotalSupply).to.equal(initialSupply.add(mintAmount));
    
    // 验证deployer的代币余额增加了mintAmount
    const deployerBalance = await bep20Token.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(newTotalSupply);
  });
});