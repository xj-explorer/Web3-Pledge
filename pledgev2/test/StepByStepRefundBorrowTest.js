// 逐步测试文件，用于找出兼容性问题的根源
const { expect } = require('chai');

// 直接使用全局的hre对象
const hre = require('hardhat');

// 避免使用解构赋值，直接使用hre.ethers

describe('StepByStepRefundBorrowTest', function() {
  let pledgeContract, multiSignatureContract, oracleContract;
  let deployer;

  beforeEach(async function() {
    try {
      // 获取签名者
      const signers = await hre.ethers.getSigners();
      deployer = signers[0];

      // 只部署最基本的合约
      // 1. 部署MockMultiSignature合约
      const MultiSignatureFactory = await hre.ethers.getContractFactory('MockMultiSignature');
      multiSignatureContract = await MultiSignatureFactory.deploy();

      // 2. 部署MockOracle合约
      const OracleFactory = await hre.ethers.getContractFactory('MockOracle');
      oracleContract = await OracleFactory.deploy();

      // 3. 部署PledgePool合约
      const PledgePoolFactory = await hre.ethers.getContractFactory('PledgePool');
      const mockSwapRouter = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'; // 使用固定地址
      pledgeContract = await PledgePoolFactory.deploy(
        oracleContract.address, 
        mockSwapRouter, 
        deployer.address, 
        multiSignatureContract.address
      );

      console.log('基本合约部署成功');
    } catch (error) {
      console.error('部署基本合约时出错：', error.message);
      throw error;
    }
  });

  it('Step 1: 验证基本合约部署', async function() {
    // 只检查合约是否成功部署
    expect(pledgeContract.address).to.not.be.undefined;
    console.log('PledgePool合约地址:', pledgeContract.address);
  });

  it('Step 2: 部署额外代币合约', async function() {
    try {
      // 部署BEP20Token合约
      const BUSDTokenFactory = await hre.ethers.getContractFactory('BEP20Token');
      const busdContract = await BUSDTokenFactory.deploy();
      
      // 部署BtcToken合约
      const BtcTokenFactory = await hre.ethers.getContractFactory('BtcToken');
      const btcContract = await BtcTokenFactory.deploy();
      
      console.log('代币合约部署成功');
      expect(busdContract.address).to.not.be.undefined;
      expect(btcContract.address).to.not.be.undefined;
    } catch (error) {
      console.error('部署代币合约时出错：', error.message);
      throw error;
    }
  });

  it('Step 3: 部署DebtToken合约', async function() {
    try {
      // 部署DebtToken合约
      const DebtTokenFactory = await hre.ethers.getContractFactory('DebtToken');
      const spContract = await DebtTokenFactory.deploy('SP Token', 'SP', multiSignatureContract.address);
      const jpContract = await DebtTokenFactory.deploy('JP Token', 'JP', multiSignatureContract.address);
      
      console.log('DebtToken合约部署成功');
      expect(spContract.address).to.not.be.undefined;
      expect(jpContract.address).to.not.be.undefined;
    } catch (error) {
      console.error('部署DebtToken合约时出错：', error.message);
      throw error;
    }
  });
});