// 专门测试代币交互的测试文件
const { expect } = require('chai');

// 直接使用全局的hre对象
const hre = require('hardhat');

// 避免使用解构赋值，直接使用hre.ethers

describe('TokenInteractionTest', function() {
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

      const BtcTokenFactory = await hre.ethers.getContractFactory('BtcToken');
      btcContract = await BtcTokenFactory.deploy();

      console.log('代币合约部署成功');
    } catch (error) {
      console.error('部署代币合约时出错：', error.message);
      throw error;
    }
  });

  it('测试使用字符串作为参数分配代币', async function() {
    try {
      // 使用字符串而非BigNumber作为参数
      const tokenAmount = '1000000000000000000000000'; // 1,000,000 * 1e18 作为字符串
      
      // 注意：mint函数只接受一个参数，代币会直接mint给调用者(deployer)
      await busdContract.connect(deployer).mint(tokenAmount);
      await btcContract.connect(deployer).mint(tokenAmount);
      
      // 如果需要将代币转给user1，需要使用transfer
      await busdContract.connect(deployer).transfer(user1.address, tokenAmount);
      await btcContract.connect(deployer).transfer(user1.address, tokenAmount);
      
      console.log('使用字符串参数分配代币成功');
      
      // 验证代币分配是否成功
      const user1BusdBalance = await busdContract.balanceOf(user1.address);
      const user1BtcBalance = await btcContract.balanceOf(user1.address);
      
      expect(user1BusdBalance.toString()).to.equal(tokenAmount);
      expect(user1BtcBalance.toString()).to.equal(tokenAmount);
    } catch (error) {
      console.error('使用字符串参数分配代币时出错：', error.message);
      throw error;
    }
  });

  it('测试使用数字作为参数分配代币', async function() {
    try {
      // 使用ethers.BigNumber处理大数字，避免溢出问题
      const tokenAmount = hre.ethers.BigNumber.from('1000000000000000000'); // 1 * 1e18
      
      // 注意：mint函数只接受一个参数，代币会直接mint给调用者(deployer)
      await busdContract.connect(deployer).mint(tokenAmount);
      await btcContract.connect(deployer).mint(tokenAmount);
      
      // 如果需要将代币转给user1，需要使用transfer
      await busdContract.connect(deployer).transfer(user1.address, tokenAmount);
      await btcContract.connect(deployer).transfer(user1.address, tokenAmount);
      
      console.log('使用数字参数分配代币成功');
      
      // 验证代币分配是否成功
      const user1BusdBalance = await busdContract.balanceOf(user1.address);
      const user1BtcBalance = await btcContract.balanceOf(user1.address);
      
      expect(user1BusdBalance).to.equal(tokenAmount);
      expect(user1BtcBalance).to.equal(tokenAmount);
    } catch (error) {
      console.error('使用数字参数分配代币时出错：', error.message);
      throw error;
    }
  });
});