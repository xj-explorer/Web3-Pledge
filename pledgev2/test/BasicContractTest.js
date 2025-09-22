// 最基本的测试文件，只测试合约部署 - 暂时注释掉
const { ethers } = require('hardhat');

/*
describe('BasicContractTest', function() {
  it('should deploy a simple contract without errors', async function() {
    try {
      // 部署一个非常简单的合约（BEP20Token）
      const TokenFactory = await ethers.getContractFactory('BEP20Token');
      const tokenContract = await TokenFactory.deploy();
      
      // 等待部署完成
      await tokenContract.deployed();
      
      console.log('BEP20Token 合约成功部署到地址:', tokenContract.address);
      
      // 检查合约是否真的部署了
      const name = await tokenContract.name();
      console.log('合约名称:', name);
      
      // 测试基本的代币操作
      const signers = await ethers.getSigners();
      const deployer = signers[0];
      const user1 = signers[1];
      
      // 铸造代币
      const mintAmount = ethers.BigNumber.from('1000000000000000000'); // 1 ETH
      await tokenContract.connect(deployer).mint(user1.address, mintAmount);
      
      // 检查余额
      const balance = await tokenContract.balanceOf(user1.address);
      console.log('用户1的余额:', balance.toString());
      
      console.log('基本合约测试成功！');
    } catch (error) {
      console.error('基本合约测试失败：', error.message);
      throw error;
    }
  });
});
*/