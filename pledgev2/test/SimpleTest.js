// 简化的测试文件，专注于正确部署所有合约
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Contract Deployment Test", function (){
    let busdAddress, btcAddress, spAddress, jpAddress, bscPledgeOracle, pledgeAddress;
    let weth, factory, router, mockMultiSignature;
    let minter, alice;

    beforeEach(async ()=>{
        [minter, alice, _] = await ethers.getSigners();
        
        // 部署MockMultiSignature合约 - 这是一个关键点，因为DebtToken需要它作为multiSignature参数
        const MockMultiSignature = await ethers.getContractFactory("MockMultiSignature");
        mockMultiSignature = await MockMultiSignature.deploy();
        
        // 部署MockOracle合约
        const MockOracle = await ethers.getContractFactory("MockOracle");
        bscPledgeOracle = await MockOracle.deploy();
        
        // 部署DebtToken合约 - 确保正确传递三个参数，第三个是multiSignature地址
        const DebtToken = await ethers.getContractFactory("DebtToken");
        spAddress = await DebtToken.deploy("spBUSD_1", "spBUSD_1", mockMultiSignature.address);
        jpAddress = await DebtToken.deploy("jpBTC_1", "jpBTC_1", mockMultiSignature.address);
        
        // 部署WETH9合约
        const WETH9 = await ethers.getContractFactory("WETH9");
        weth = await WETH9.deploy();
        
        // 部署UniswapV2Factory合约
        const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
        factory = await UniswapV2Factory.deploy(minter.address);
        
        // 部署UniswapV2Router02合约
        const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
        router = await UniswapV2Router02.deploy(factory.address, weth.address);
        
        // 部署BEP20Token合约
        const BEP20Token = await ethers.getContractFactory("BEP20Token");
        busdAddress = await BEP20Token.deploy();
        
        // 部署BtcToken合约
        const BtcToken = await ethers.getContractFactory("BtcToken");
        btcAddress = await BtcToken.deploy();
        
        // 部署MockPledgePool合约 - 确保正确传递三个参数，第三个是payable地址
        const MockPledgePool = await ethers.getContractFactory("MockPledgePool");
        pledgeAddress = await MockPledgePool.deploy(
            bscPledgeOracle.address, 
            router.address, 
            minter.address // 这需要是payable地址
        );
    });

    it("should deploy all contracts correctly", async function() {
        // 验证所有合约都已正确部署
        expect(pledgeAddress.address).to.not.be.undefined;
        expect(await pledgeAddress.oracle()).to.equal(bscPledgeOracle.address);
        expect(await pledgeAddress.swapRouter()).to.equal(router.address);
        
        // 验证DebtToken合约参数正确设置
        expect(await spAddress.name()).to.equal("spBUSD_1");
        expect(await spAddress.symbol()).to.equal("spBUSD_1");
        
        // 验证BEP20Token和BtcToken合约部署成功
        expect(busdAddress.address).to.not.be.undefined;
        expect(btcAddress.address).to.not.be.undefined;
        
        console.log("所有合约部署成功！");
        console.log("- pledgeAddress:", pledgeAddress.address);
        console.log("- bscPledgeOracle:", bscPledgeOracle.address);
        console.log("- router:", router.address);
        console.log("- spAddress:", spAddress.address);
        console.log("- jpAddress:", jpAddress.address);
    });
});