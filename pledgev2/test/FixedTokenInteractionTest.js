// 修正的代币交互测试文件，正确使用mint和transfer方法
const { expect } = require('chai');

// 直接使用全局的hre对象
const hre = require('hardhat');

// 避免使用解构赋值，直接使用hre.ethers

describe('FixedTokenInteractionTest', function() {
  let busdContract, btcContract;
  let deployer, user1;
  
  beforeEach(async function() {
    try {
      // 获取签名者
      const signers = await hre.ethers.getSigners();
      deployer = signers[0];
      user1 = signers[1];

      // 部署代币合约
      const BUSDTokenFactory = await hre.ethers.getContractFactory('BEP20Token');
      busdContract = await BUSDTokenFactory.deploy();

      const BTCTokenFactory = await hre.ethers.getContractFactory('BtcToken');
      btcContract = await BTCTokenFactory.deploy();

      console.log('代币合约部署成功');
    } catch (error) {
      console.error('部署代币合约时出错：', error.message);
      throw error;
    }
  });

  it('测试正确使用mint和transfer方法', async function() {
    try {
      // 使用字符串作为参数
      const tokenAmount = '1000000000000000000000000'; // 1,000,000 * 1e18 作为字符串
      
      // 注意：mint方法只接受一个参数(amount)，并且自动mint到调用者地址
      console.log('使用deployer账户mint代币...');
      await busdContract.connect(deployer).mint(tokenAmount);
      await btcContract.connect(deployer).mint(tokenAmount);
      
      // 验证deployer的余额 (初始供应量31000000000000000000000000 + mint的1000000000000000000000000 = 32000000000000000000000000)
      const deployerBusdBalance = await busdContract.balanceOf(deployer.address);
      const deployerBtcBalance = await btcContract.balanceOf(deployer.address);
      
      expect(deployerBusdBalance.toString()).to.equal('32000000000000000000000000');
      expect(deployerBtcBalance.toString()).to.equal('32000000000000000000000000');
      
      // 然后使用transfer方法将代币转给user1
      console.log('将代币从deployer转移给user1...');
      await busdContract.connect(deployer).transfer(user1.address, tokenAmount);
      await btcContract.connect(deployer).transfer(user1.address, tokenAmount);
      
      // 验证user1的余额
      const user1BusdBalance = await busdContract.balanceOf(user1.address);
      const user1BtcBalance = await btcContract.balanceOf(user1.address);
      
      expect(user1BusdBalance.toString()).to.equal(tokenAmount);
      expect(user1BtcBalance.toString()).to.equal(tokenAmount);
      
      // 验证deployer的余额减少
      const deployerBusdBalanceAfter = await busdContract.balanceOf(deployer.address);
      const deployerBtcBalanceAfter = await btcContract.balanceOf(deployer.address);
      
      // 计算预期的剩余余额：初始供应量 + mint的数量 - transfer的数量 = 初始供应量
      const expectedRemainingBalance = '31000000000000000000000000';
      expect(deployerBusdBalanceAfter.toString()).to.equal(expectedRemainingBalance);
      expect(deployerBtcBalanceAfter.toString()).to.equal(expectedRemainingBalance);
      
      console.log('代币交互测试成功！');
    } catch (error) {
      console.error('代币交互测试失败：', error.message);
      throw error;
    }
  });
});