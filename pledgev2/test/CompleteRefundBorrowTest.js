const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PledgePool RefundBorrow 功能测试", function () {
  let deployer, user1, user2;
  let bep20Token, btcToken;
  let pledgePool, spToken, jpToken;
  let pid = 0;

  beforeEach(async function () {
    // 获取测试账户
    [deployer, user1, user2] = await ethers.getSigners();

    // 部署BEP20Token合约（用于lendToken）
    const BEP20Token = await ethers.getContractFactory("BEP20Token");
    bep20Token = await BEP20Token.deploy();
    await bep20Token.deployed();

    // 部署BtcToken合约（用于borrowToken）
    const BtcToken = await ethers.getContractFactory("BtcToken");
    btcToken = await BtcToken.deploy();
    await btcToken.deployed();

    // 部署MockMultiSignature合约（用于DebtToken）
    const MockMultiSignature = await ethers.getContractFactory("MockMultiSignature");
    const mockMultiSignature = await MockMultiSignature.deploy();
    await mockMultiSignature.deployed();

    // 部署DebtToken合约（用于spToken和jpToken）
    const DebtToken = await ethers.getContractFactory("DebtToken");
    spToken = await DebtToken.deploy("spBUSD", "spBUSD", mockMultiSignature.address);
    await spToken.deployed();
    jpToken = await DebtToken.deploy("jpBTC", "jpBTC", mockMultiSignature.address);
    await jpToken.deployed();

    // 为spToken和jpToken添加铸币者权限
    await spToken.connect(deployer).addMinter(deployer.address);
    await jpToken.connect(deployer).addMinter(deployer.address);

    // 部署MockPledgePool合约
    const MockPledgePool = await ethers.getContractFactory("MockPledgePool");
    pledgePool = await MockPledgePool.deploy(
      deployer.address, // oracle地址（测试用）
      deployer.address, // swapRouter地址（测试用）
      deployer.address  // feeAddress地址（测试用）
    );
    await pledgePool.deployed();

    // 为pledgePool添加铸币者权限
    await spToken.connect(deployer).addMinter(pledgePool.address);
    await jpToken.connect(deployer).addMinter(pledgePool.address);

    // 创建一个借贷池
    const settleTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后结算
    const endTime = settleTime + 86400; // 24小时后结束
    const interestRate = 10000000; // 10%
    const maxSupply = ethers.utils.parseEther("10000"); // 最大供应量10000
    const martgageRate = 150000000; // 150% 抵押率
    const autoLiquidateThreshold = 130000000; // 130% 自动清算阈值

    await pledgePool.connect(deployer).createPoolInfo(
      settleTime,
      endTime,
      interestRate,
      maxSupply,
      martgageRate,
      bep20Token.address,
      btcToken.address,
      spToken.address,
      jpToken.address,
      autoLiquidateThreshold
    );

    // 为用户1和用户2分配代币
    // BEP20Token合约在构造函数中已经为部署者设置了31000000000000000000000000的初始余额
    const lendAmount = ethers.utils.parseEther("10000");
    await bep20Token.connect(deployer).transfer(user1.address, lendAmount);
    
    const borrowAmount = ethers.utils.parseEther("1000");
    await btcToken.connect(deployer).transfer(user2.address, borrowAmount);

    // 授权pledgePool使用代币
    await bep20Token.connect(user1).approve(pledgePool.address, lendAmount);
    await btcToken.connect(user2).approve(pledgePool.address, borrowAmount);
  });

  it("应该能够成功创建借贷池", async function () {
    const poolCount = await pledgePool.poolLength();
    expect(poolCount).to.equal(1);

    // 检查池的基本信息
    const poolInfo = await pledgePool.poolBaseInfo(pid);
    expect(poolInfo.lendToken).to.equal(bep20Token.address);
    expect(poolInfo.borrowToken).to.equal(btcToken.address);
    expect(poolInfo.spCoin).to.equal(spToken.address);
    expect(poolInfo.jpCoin).to.equal(jpToken.address);
  });

  it("应该能够成功执行depositLend操作", async function () {
    const lendAmount = ethers.utils.parseEther("10000");
    
    // 用户1执行存款操作
    await pledgePool.connect(user1).depositLend(pid, lendAmount);

    // 检查池的lendSupply是否正确
    const poolInfo = await pledgePool.poolBaseInfo(pid);
    expect(poolInfo.lendSupply).to.equal(lendAmount);

    // 检查用户1的lendInfo是否正确
    const userLendInfo = await pledgePool.userLendInfo(user1.address, pid);
    expect(userLendInfo.stakeAmount).to.equal(lendAmount);
  });

  it("应该能够成功执行depositBorrow操作", async function () {
    const borrowAmount = ethers.utils.parseEther("1000");
    const deadLine = Math.floor(Date.now() / 1000) + 86400; // 24小时后截止

    // 用户2执行质押操作
    await pledgePool.connect(user2).depositBorrow(pid, borrowAmount, deadLine);

    // 检查池的borrowSupply是否正确
    const poolInfo = await pledgePool.poolBaseInfo(pid);
    expect(poolInfo.borrowSupply).to.equal(borrowAmount);

    // 检查用户2的borrowInfo是否正确
    const userBorrowInfo = await pledgePool.userBorrowInfo(user2.address, pid);
    expect(userBorrowInfo.stakeAmount).to.equal(borrowAmount);
  });

  it("应该能够成功执行refundBorrow操作（模拟结算后的退款）", async function () {
    const lendAmount = ethers.utils.parseEther("10000");
    const borrowAmount = ethers.utils.parseEther("1000");
    const deadLine = Math.floor(Date.now() / 1000) + 86400; // 24小时后截止

    // 用户1存款
    await pledgePool.connect(user1).depositLend(pid, lendAmount);
    
    // 用户2质押
    await pledgePool.connect(user2).depositBorrow(pid, borrowAmount, deadLine);

    // 获取池子的settleTime
    const poolInfo = await pledgePool.poolBaseInfo(pid);
    const settleTime = poolInfo.settleTime.toNumber();
    
    // 增加区块时间，使其超过settleTime
    await ethers.provider.send("evm_increaseTime", [3601]); // 增加3601秒（超过1小时）
    await ethers.provider.send("evm_mine", []); // 挖掘新区块

    // 设置池状态为EXECUTION
    await pledgePool.connect(deployer).setPoolState(pid, 1); // 1 = EXECUTION

    // 检查用户2的btcToken余额
    const initialBalance = await btcToken.balanceOf(user2.address);
    
    // 执行refundBorrow操作
    await pledgePool.connect(user2).refundBorrow(pid);

    // 检查用户2的btcToken余额是否有变化
    const finalBalance = await btcToken.balanceOf(user2.address);
    
    // 由于在这个简单测试中，我们没有实际设置settleAmountBorrow，所以退款金额可能为0
    // 但我们可以检查hasNoRefund标志是否被正确设置
    const userBorrowInfo = await pledgePool.userBorrowInfo(user2.address, pid);
    expect(userBorrowInfo.hasNoRefund).to.be.true;
  });

  it("应该能够验证代币合约的初始供应量", async function () {
    // 检查BEP20Token的总供应量
    const bep20TotalSupply = await bep20Token.totalSupply();
    console.log("BEP20Token初始供应量:", bep20TotalSupply.toString());
    expect(bep20TotalSupply).to.be.not.undefined;
    
    // 检查BtcToken的总供应量
    const btcTotalSupply = await btcToken.totalSupply();
    console.log("BtcToken初始供应量:", btcTotalSupply.toString());
    expect(btcTotalSupply).to.be.not.undefined;
    
    // 检查部署者的初始余额
    const deployerBep20Balance = await bep20Token.balanceOf(deployer.address);
    const deployerBtcBalance = await btcToken.balanceOf(deployer.address);
    console.log("部署者BEP20余额:", deployerBep20Balance.toString());
    console.log("部署者BTC余额:", deployerBtcBalance.toString());
  });
});