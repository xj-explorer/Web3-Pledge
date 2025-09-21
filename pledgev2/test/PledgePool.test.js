// PledgePool 测试文件 - 已修复构造函数参数问题和作用域问题
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PledgePool", function (){
    let busdAddress, btcAddress, spAddress, jpAddress, bscPledgeOracle, pledgeAddress;
    let weth, factory, router, mockMultiSignature;
    let minter, alice, bob, carol;

    // 初始化池信息的辅助函数 - 移到describe块内部以访问变量
    async function initCreatePoolInfo(minter, time0, time1){
        // 初始化池信息
        let startTime = await ethers.provider.getBlock('latest');
        let settleTime = (parseInt(startTime.timestamp) + parseInt(time0));
        let endTime = (parseInt(settleTime) + parseInt(time1));
        let interestRate = 1000000;
        let maxSupply = BigInt(100000000000000000000000);
        let martgageRate = 200000000;
        let autoLiquidateThreshold = 20000000;
        await pledgeAddress.connect(minter).createPoolInfo(settleTime, endTime, interestRate, maxSupply, martgageRate,
            busdAddress.address, btcAddress.address, spAddress.address, jpAddress.address, autoLiquidateThreshold);
    }

    // 模拟添加流动性的辅助函数
    async function mockAddLiquidity(tokenA, tokenB, signer, deadline, amountA, amountB) {
        await tokenA.connect(signer).approve(router.address, amountA);
        await tokenB.connect(signer).approve(router.address, amountB);
        await router.connect(signer).addLiquidity(
            tokenA.address,
            tokenB.address,
            amountA,
            amountB,
            0,
            0,
            signer.address,
            deadline
        );
    }

    // 模拟交易的辅助函数
    async function mockSwap(tokenIn, tokenOut, signer, deadline, amountIn) {
        await tokenIn.connect(signer).approve(router.address, amountIn);
        await router.connect(signer).swapExactTokensForTokens(
            amountIn,
            0,
            [tokenIn.address, tokenOut.address],
            signer.address,
            deadline
        );
    }

    beforeEach(async ()=>{
        [minter, alice, bob, carol, _] = await ethers.getSigners();
        
        // 部署MockMultiSignature合约 - 这是DebtToken所需的multiSignature参数
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

    it("check if mint right", async function() {
        // sp token and jp token mint
        await spAddress.addMinter(minter.address);
        await jpAddress.addMinter(minter.address);
        await spAddress.connect(minter).mint(alice.address, BigInt(100000000));
        await jpAddress.connect(minter).mint(alice.address, BigInt(100000000));
        expect(await spAddress.totalSupply()).to.equal(BigInt(100000000).toString());
        expect(await spAddress.balanceOf(alice.address)).to.equal(BigInt(100000000).toString());
        expect(await jpAddress.totalSupply()).to.equal(BigInt(100000000).toString());
        expect(await jpAddress.balanceOf(alice.address)).to.equal(BigInt(100000000).toString());
    });

    it("Create Pool info", async function (){
        // create pool info
        await initCreatePoolInfo(minter, 100, 200);
        // get pool info length
        expect(await pledgeAddress.poolLength()).to.be.equal(1);
    });

    it("Non-administrator creates pool", async function (){
        await expect(initCreatePoolInfo(alice, 100, 200)).to.revertedWith("Ownable: caller is not the owner");
    });

    it ("deposit lend after create pool info, pool state is match", async function (){
        // create pool info
        await initCreatePoolInfo(minter, 100, 200);
        // Determine the status of the pool
        expect(await pledgeAddress.getPoolState(0)).to.equal(0);
        // approve
        await busdAddress.connect(minter).approve(pledgeAddress.address, BigInt(1000*1e18));
        // deposit lend
        await pledgeAddress.connect(minter).depositLend(0, BigInt(1000*1e18));
        // check info
        let data = await pledgeAddress.userLendInfo(minter.address, 0);
        expect(data[0]).to.be.equal(BigInt(1000*1e18).toString());
        // 时间增加后不能再存款
        await ethers.provider.send("evm_increaseTime", [1000]);
        await ethers.provider.send("evm_mine");
        await expect(pledgeAddress.connect(minter).depositLend(0, BigInt(1000*1e18))).to.revertedWith("Less than this time");
    });

    it ("deposit borrow after create pool info, pool state is match", async function (){
        await initCreatePoolInfo(minter, 1000, 2000);
        expect(await pledgeAddress.getPoolState(0)).to.equal(0);
        await btcAddress.connect(minter).approve(pledgeAddress.address, BigInt(1000*1e18));
        let timestamp = (await ethers.provider.getBlock('latest')).timestamp;
        let deadLine = timestamp + 100;
        await pledgeAddress.connect(minter).depositBorrow(0, BigInt(1000*1e18), deadLine);
        let data = await pledgeAddress.userBorrowInfo(minter.address, 0);
        expect(data[0]).to.be.equal(BigInt(1000*1e18).toString());
        // 时间增加后不能再借款
        await ethers.provider.send("evm_increaseTime", [1000]);
        await ethers.provider.send("evm_mine");
        await expect(pledgeAddress.connect(minter).depositBorrow(0, BigInt(1000*1e18), deadLine)).to.revertedWith("Less than this time");
    });

    it ("pause check", async function (){
        // create pool info
        await initCreatePoolInfo(minter, 100, 200);
        // approve
        await busdAddress.connect(minter).approve(pledgeAddress.address, BigInt(1000*1e18));
        // deposit lend
        await pledgeAddress.connect(minter).depositLend(0, BigInt(1000*1e18));
        // check info
        let num = await pledgeAddress.userLendInfo(minter.address, 0);
        expect(num[0]).to.be.equal(BigInt(1000000000000000000000).toString());
        // paused
        await pledgeAddress.connect(minter).setPause();
        await expect(pledgeAddress.connect(minter).depositLend(0, BigInt(1000*1e18))).to.revertedWith("Stake has been suspended");
    });

    // 其他测试用例...

    it("should deploy all contracts correctly", async function() {
        // 简单测试确保所有合约都已正确部署
        expect(pledgeAddress.address).to.not.be.undefined;
        expect(await pledgeAddress.oracle()).to.equal(bscPledgeOracle.address);
        expect(await pledgeAddress.swapRouter()).to.equal(router.address);
    });
});




