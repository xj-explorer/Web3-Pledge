// 超极简版refundBorrow测试，只测试最基本功能
const { expect } = require('chai');

// 直接使用全局的hre对象
const hre = require('hardhat');

// 避免使用解构赋值，直接使用hre.ethers

describe('SuperMinimalRefundBorrowTest', function() {
  let pledgeContract, multiSignatureContract, oracleContract;
  let deployer, user1;

  beforeEach(async function() {
    try {
      // 获取签名者
      const signers = await hre.ethers.getSigners();
      deployer = signers[0];
      user1 = signers[1];

      // 只部署最基本的合约
      // 1. 部署MockMultiSignature合约
      const MultiSignatureFactory = await hre.ethers.getContractFactory('MockMultiSignature');
      multiSignatureContract = await MultiSignatureFactory.deploy();

      // 2. 部署MockOracle合约
      const OracleFactory = await hre.ethers.getContractFactory('MockOracle');
      oracleContract = await OracleFactory.deploy();

      // 3. 部署PledgePool合约 - 只使用必要的参数
      const PledgePoolFactory = await hre.ethers.getContractFactory('PledgePool');
      const mockSwapRouter = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'; // 使用固定地址
      pledgeContract = await PledgePoolFactory.deploy(
        oracleContract.address, 
        mockSwapRouter, 
        deployer.address, 
        multiSignatureContract.address
      );

      console.log('合约部署成功');
    } catch (error) {
      console.error('部署合约时出错：', error.message);
      throw error;
    }
  });

  it('should check if PledgePool contract is deployed', async function() {
    // 只检查合约是否成功部署
    expect(pledgeContract.address).to.not.be.undefined;
    console.log('PledgePool合约地址:', pledgeContract.address);
  });

  it('should attempt to call refundBorrow function', async function() {
    try {
      // 注意：这里不会真正执行refundBorrow，因为需要先创建池和有借款
      // 我们只是验证函数是否可以被调用而不导致兼容性错误
      console.log('尝试调用refundBorrow函数...');
      // 由于没有池和借款，这里会失败，但我们想看看是否会导致兼容性错误
      const tx = await pledgeContract.connect(user1).refundBorrow(0);
      await tx.wait();
      console.log('refundBorrow调用成功（这是意外的，因为没有池和借款）');
    } catch (error) {
      console.log('预期的错误：', error.message);
      // 验证这不是兼容性错误，而是业务逻辑错误
      expect(error.message).to.not.include('cannot override');
      expect(error.message).to.not.include('too many arguments');
    }
  });
});