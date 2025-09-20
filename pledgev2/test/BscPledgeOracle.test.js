const { expect } = require("chai");
const { show } = require("./helper/meta.js");

// 声明全局变量
let mockMultiSignature;

describe("BscPledgeOracle", function (){
    let bscPledgeOracle, busdAddrress, btcAddress;
    beforeEach(async ()=>{
        [minter, alice, bob, carol, _] = await ethers.getSigners();
        
        // 部署模拟多签合约
        const MockMultiSignature = await ethers.getContractFactory("MockMultiSignature");
        mockMultiSignature = await MockMultiSignature.deploy();
        
        // 使用模拟多签合约地址部署BscPledgeOracle
        const bscPledgeOracleToken = await ethers.getContractFactory("BscPledgeOracle");
        bscPledgeOracle = await bscPledgeOracleToken.deploy(mockMultiSignature.address);
        
        // 部署测试用的BEP20Token
        const busdToken = await ethers.getContractFactory("BEP20Token");
        busdAddrress = await busdToken.deploy();
        
        // 部署测试用的BtcToken
        const btcToken = await ethers.getContractFactory("BtcToken");
        btcAddress = await btcToken.deploy();
    });

    it ("multi signature validation allows all calls in mock environment", async function() {
        // 在当前的MockMultiSignature实现中，所有调用都会通过多签验证
        // 所以即使是非授权用户也能调用setPrice函数
        await bscPledgeOracle.connect(alice).setPrice(busdAddrress.address, 100000);
        
        // 验证价格是否被成功设置
        expect(await bscPledgeOracle.getPrice(busdAddrress.address)).to.equal((BigInt(100000).toString()));
      });

    it ("Admin set price operation", async function (){
        expect(await bscPledgeOracle.getPrice(busdAddrress.address)).to.equal((BigInt(0).toString()));
        await bscPledgeOracle.connect(minter).setPrice(busdAddrress.address, 100000000);
        expect(await bscPledgeOracle.getPrice(busdAddrress.address)).to.equal((BigInt(100000000).toString()));
    });

    it("Administrators set prices in batches", async function (){
        expect(await bscPledgeOracle.getPrice(busdAddrress.address)).to.equal((BigInt(0).toString()));
        expect(await bscPledgeOracle.getPrice(btcAddress.address)).to.equal((BigInt(0).toString()));
        
        // 使用简单的索引值
        await bscPledgeOracle.connect(minter).setPrices([0, 1], [100, 100]);
        expect(await bscPledgeOracle.getUnderlyingPrice(0)).to.equal((BigInt(100).toString()));
        expect(await bscPledgeOracle.getUnderlyingPrice(1)).to.equal((BigInt(100).toString()));
    });

    it("Get price according to INDEX",async function () {
        expect(await bscPledgeOracle.getPrice(busdAddrress.address)).to.equal((BigInt(0).toString()));
        
        // 使用简单的索引值
        const underIndex = 2;
        
        await bscPledgeOracle.connect(minter).setUnderlyingPrice(underIndex, 100000000);
        expect(await bscPledgeOracle.getUnderlyingPrice(underIndex)).to.equal((BigInt(100000000).toString()));
    });

    it("Set price according to INDEX", async function (){
        expect(await bscPledgeOracle.getPrice(busdAddrress.address)).to.equal((BigInt(0).toString()));
        
        // 使用简单的索引值
        const underIndex = 3;
        
        await bscPledgeOracle.connect(minter).setUnderlyingPrice(underIndex, 100000000);
        expect(await bscPledgeOracle.getUnderlyingPrice(underIndex)).to.equal((BigInt(100000000).toString()));
    });

    it("Set AssetsAggregator", async function (){
        let arrData = await bscPledgeOracle.getAssetsAggregator(busdAddrress.address)
        show(arrData[0]);
        expect(arrData[0]).to.equal('0x0000000000000000000000000000000000000000');
        await bscPledgeOracle.connect(minter).setAssetsAggregator(busdAddrress.address, btcAddress.address, 18);
        let data = await bscPledgeOracle.getAssetsAggregator(busdAddrress.address);
        expect(data[0]).to.equal((btcAddress.address));
        expect(data[1]).to.equal(18);
    });
})