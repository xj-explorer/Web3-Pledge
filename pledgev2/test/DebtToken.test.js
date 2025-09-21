import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { show } from "./helper/meta.js";

export {};
// 声明全局变量
let mockMultiSignature;

describe("DebtToken",function () {
    let debtToken;
    let minter, alice, bob, carol, dave, eve;
    const initialSupply = ethers.BigNumber.from("1000000000000000000000"); // 1000 tokens with 18 decimals
    
    beforeEach(async ()=>{
        [minter, alice, bob, carol, dave, eve] = await ethers.getSigners();
        
        // 部署模拟多签合约
        const MockMultiSignature = await ethers.getContractFactory("MockMultiSignature");
        mockMultiSignature = await MockMultiSignature.deploy();
        
        // 使用模拟多签合约地址部署DebtToken
        const DebtToken = await ethers.getContractFactory("DebtToken");
        debtToken = await DebtToken.deploy("spBUSD_1", "spBUSD_1", mockMultiSignature.address);
    });

    // 部署和基本属性测试
    it("should deploy correctly with proper metadata", async function() {
        expect(debtToken.address).to.not.be.undefined;
        expect(await debtToken.name()).to.equal("spBUSD_1");
        expect(await debtToken.symbol()).to.equal("spBUSD_1");
        expect(await debtToken.decimals()).to.equal(18);
        expect(await debtToken.totalSupply()).to.equal(0);
        expect(await debtToken.getMultiSignatureAddress()).to.equal(mockMultiSignature.address);
    });

    // Minter管理功能测试
    it("should add minters with proper authorization", async function() {
        // 在MockMultiSignature中，所有调用都通过多签验证
        // 测试不同用户添加minter
        await debtToken.connect(alice).addMinter(alice.address);
        expect(await debtToken.isMinter(alice.address)).to.equal(true);
        
        // 移除并重新添加
        await debtToken.connect(alice).delMinter(alice.address);
        expect(await debtToken.isMinter(alice.address)).to.equal(false);
        
        // 管理员添加minter
        await debtToken.connect(minter).addMinter(bob.address);
        expect(await debtToken.isMinter(bob.address)).to.equal(true);
    });

    it("should manage minter list correctly with getMinterLength and getMinter", async function() {
        // 初始状态
        expect(await debtToken.getMinterLength()).to.equal(0);
        
        // 添加多个minter
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(minter).addMinter(bob.address);
        await debtToken.connect(minter).addMinter(carol.address);
        
        // 验证列表长度和内容
        expect(await debtToken.getMinterLength()).to.equal(3);
        expect(await debtToken.getMinter(0)).to.equal(alice.address);
        expect(await debtToken.getMinter(1)).to.equal(bob.address);
        expect(await debtToken.getMinter(2)).to.equal(carol.address);
        
        // 测试越界访问
        await expect(debtToken.getMinter(3)).to.be.revertedWith("Token: index out of bounds");
        
        // 移除中间minter并验证列表重组
        await debtToken.connect(minter).delMinter(bob.address);
        expect(await debtToken.getMinterLength()).to.equal(2);
        expect(await debtToken.getMinter(0)).to.equal(alice.address);
        expect(await debtToken.getMinter(1)).to.equal(carol.address);
        
        // 移除第一个minter并验证
        await debtToken.connect(minter).delMinter(alice.address);
        expect(await debtToken.getMinterLength()).to.equal(1);
        expect(await debtToken.getMinter(0)).to.equal(carol.address);
    });

    // 铸币功能测试
    it("should mint tokens with proper authorization", async function() {
        // 无权限铸币应该失败
        await expect(debtToken.connect(alice).mint(bob.address, 100000))
            .to.be.revertedWith("Token: caller is not the minter");
        
        // 添加minter角色后铸币
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(alice).mint(bob.address, 100000);
        expect(await debtToken.balanceOf(bob.address)).to.equal(100000);
        expect(await debtToken.totalSupply()).to.equal(100000);
        
        // 多个minter都可以铸币
        await debtToken.connect(minter).addMinter(bob.address);
        await debtToken.connect(bob).mint(carol.address, 200000);
        expect(await debtToken.balanceOf(carol.address)).to.equal(200000);
        expect(await debtToken.totalSupply()).to.equal(300000);
    });

    it("should handle large mint amounts and zero mint correctly", async function() {
        await debtToken.connect(minter).addMinter(minter.address);
        
        // 铸币0个代币（不应该抛出异常）
        await debtToken.connect(minter).mint(alice.address, 0);
        expect(await debtToken.balanceOf(alice.address)).to.equal(0);
        
        // 铸币大额代币
        const largeAmount = ethers.BigNumber.from("1000000000000000000000000"); // 1e24
        await debtToken.connect(minter).mint(alice.address, largeAmount);
        expect(await debtToken.balanceOf(alice.address)).to.equal(largeAmount);
        expect(await debtToken.totalSupply()).to.equal(largeAmount);
    });

    it("should prevent minting after delMinter", async function() {
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(alice).mint(bob.address, 100000);
        
        // 移除minter角色后，无法再铸币
        await debtToken.connect(minter).delMinter(alice.address);
        await expect(debtToken.connect(alice).mint(bob.address, 100000))
            .to.be.revertedWith("Token: caller is not the minter");
    });

    // ERC20基本功能测试
    it("should handle transfer functionality correctly", async function() {
        await debtToken.connect(minter).addMinter(minter.address);
        await debtToken.connect(minter).mint(alice.address, initialSupply);
        
        // 正常转账
        const transferAmount = ethers.BigNumber.from("300000000000000000000");
        await debtToken.connect(alice).transfer(bob.address, transferAmount);
        
        // 检查余额
        expect(await debtToken.balanceOf(alice.address))
            .to.equal(initialSupply.sub(transferAmount));
        expect(await debtToken.balanceOf(bob.address)).to.equal(transferAmount);
        
        // 余额不足时转账失败
        const overAmount = initialSupply;
        await expect(debtToken.connect(bob).transfer(carol.address, overAmount)).to.be.reverted;
        
        // 转账0个代币（不应该抛出异常）
        await debtToken.connect(alice).transfer(bob.address, 0);
        expect(await debtToken.balanceOf(alice.address))
            .to.equal(initialSupply.sub(transferAmount));
    });

    it("should handle approve and transferFrom functionality correctly", async function() {
        await debtToken.connect(minter).addMinter(minter.address);
        await debtToken.connect(minter).mint(alice.address, initialSupply);
        
        // 授权转账
        const approveAmount = ethers.BigNumber.from("500000000000000000000");
        await debtToken.connect(alice).approve(bob.address, approveAmount);
        expect(await debtToken.allowance(alice.address, bob.address)).to.equal(approveAmount);
        
        // 使用授权转账
        const transferAmount = ethers.BigNumber.from("300000000000000000000");
        await debtToken.connect(bob).transferFrom(alice.address, carol.address, transferAmount);
        
        // 检查余额和授权余额
        expect(await debtToken.balanceOf(alice.address))
            .to.equal(initialSupply.sub(transferAmount));
        expect(await debtToken.balanceOf(carol.address)).to.equal(transferAmount);
        expect(await debtToken.allowance(alice.address, bob.address))
            .to.equal(approveAmount.sub(transferAmount));
        
        // 超额转账失败
        const overAmount = approveAmount.sub(transferAmount).add(1);
        await expect(debtToken.connect(bob).transferFrom(alice.address, carol.address, overAmount)).to.be.reverted;
        
        // 增加授权
        await debtToken.connect(alice).approve(bob.address, approveAmount);
        expect(await debtToken.allowance(alice.address, bob.address)).to.equal(approveAmount);
        
        // 撤销授权
        await debtToken.connect(alice).approve(bob.address, 0);
        expect(await debtToken.allowance(alice.address, bob.address)).to.equal(0);
        await expect(debtToken.connect(bob).transferFrom(alice.address, carol.address, 1)).to.be.reverted;
    });

    // 批量操作测试
    it("should handle batch minting and transfers correctly", async function() {
        await debtToken.connect(minter).addMinter(minter.address);
        
        // 批量铸币
        const recipients = [alice, bob, carol, dave, eve]; // 使用签名者对象而不是地址字符串
        const amounts = [
            ethers.BigNumber.from("100000000000000000000"),  // 100
            ethers.BigNumber.from("200000000000000000000"),  // 200
            ethers.BigNumber.from("300000000000000000000"),  // 300
            ethers.BigNumber.from("400000000000000000000"),  // 400
            ethers.BigNumber.from("500000000000000000000")   // 500
        ];
        
        // 执行批量铸币
        for (let i = 0; i < recipients.length; i++) {
            await debtToken.connect(minter).mint(recipients[i].address, amounts[i]);
        }
        
        // 检查余额和总供应量
        const totalAmount = amounts.reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
        expect(await debtToken.totalSupply()).to.equal(totalAmount);
        
        for (let i = 0; i < recipients.length; i++) {
            expect(await debtToken.balanceOf(recipients[i].address)).to.equal(amounts[i]);
        }
        
        // 执行批量转账
        const transferAmounts = [
            ethers.BigNumber.from("50000000000000000000"),   // 50
            ethers.BigNumber.from("100000000000000000000"),  // 100
            ethers.BigNumber.from("150000000000000000000"),  // 150
            ethers.BigNumber.from("200000000000000000000"),  // 200
            ethers.BigNumber.from("250000000000000000000")   // 250
        ];
        
        for (let i = 0; i < recipients.length; i++) {
            await debtToken.connect(recipients[i]).transfer(minter.address, transferAmounts[i]);
        }
        
        // 检查转账后的余额
        for (let i = 0; i < recipients.length; i++) {
            expect(await debtToken.balanceOf(recipients[i].address))
                .to.equal(amounts[i].sub(transferAmounts[i]));
        }
        
        const totalTransferred = transferAmounts.reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
        expect(await debtToken.balanceOf(minter.address)).to.equal(totalTransferred);
    });

    // 多签功能交互测试
    it("should interact with multi-signature contract correctly", async function() {
        // 验证多签合约地址设置正确
        expect(await debtToken.getMultiSignatureAddress()).to.equal(mockMultiSignature.address);
        
        // 在MockMultiSignature中，所有操作都被自动批准
        // 测试不同用户调用需要多签验证的函数
        await debtToken.connect(alice).addMinter(bob.address);
        expect(await debtToken.isMinter(bob.address)).to.equal(true);
        
        await debtToken.connect(bob).delMinter(bob.address);
        expect(await debtToken.isMinter(bob.address)).to.equal(false);
    });

    // 边界情况和异常处理测试
    it("should handle edge cases and error scenarios gracefully", async function() {
        // 测试重复添加相同的minter（不应该抛出异常）
        await debtToken.connect(minter).addMinter(alice.address);
        await debtToken.connect(minter).addMinter(alice.address);
        expect(await debtToken.getMinterLength()).to.equal(1);
        
        // 测试移除不存在的minter（不应该抛出异常）
        await debtToken.connect(minter).delMinter(bob.address);
        
        // 测试零地址铸币
        await debtToken.connect(minter).addMinter(minter.address);
        await expect(debtToken.connect(minter).mint(ethers.constants.AddressZero, 1000)).to.be.reverted;
        
        // 测试向零地址转账
        await debtToken.connect(minter).mint(alice.address, 1000);
        await expect(debtToken.connect(alice).transfer(ethers.constants.AddressZero, 500)).to.be.reverted;
        
        // 测试从非拥有者地址转账
        await debtToken.connect(minter).mint(alice.address, 1000);
        await expect(debtToken.connect(bob).transferFrom(alice.address, carol.address, 500)).to.be.reverted;
    });

    // 事件测试
    it("should emit appropriate events for token operations", async function() {
        await debtToken.connect(minter).addMinter(minter.address);
        
        // 测试铸币事件
        const mintAmount = ethers.BigNumber.from("100000000000000000000");
        await expect(debtToken.connect(minter).mint(alice.address, mintAmount))
            .to.emit(debtToken, "Transfer")
            .withArgs(ethers.constants.AddressZero, alice.address, mintAmount);
        
        // 测试转账事件
        const transferAmount = ethers.BigNumber.from("50000000000000000000");
        await expect(debtToken.connect(alice).transfer(bob.address, transferAmount))
            .to.emit(debtToken, "Transfer")
            .withArgs(alice.address, bob.address, transferAmount);
        
        // 测试授权事件
        const approveAmount = ethers.BigNumber.from("30000000000000000000");
        await expect(debtToken.connect(alice).approve(carol.address, approveAmount))
            .to.emit(debtToken, "Approval")
            .withArgs(alice.address, carol.address, approveAmount);
    });

    // 多用户交互测试
    it("should handle complex multi-user scenarios correctly", async function() {
        // 添加多个minter
        await debtToken.connect(minter).addMinter(minter.address);
        await debtToken.connect(minter).addMinter(alice.address);
        
        // 铸币给多个用户
        await debtToken.connect(minter).mint(bob.address, ethers.BigNumber.from("200000000000000000000"));
        await debtToken.connect(alice).mint(carol.address, ethers.BigNumber.from("300000000000000000000"));
        
        // 多级转账
        await debtToken.connect(bob).transfer(dave.address, ethers.BigNumber.from("100000000000000000000"));
        await debtToken.connect(dave).transfer(eve.address, ethers.BigNumber.from("50000000000000000000"));
        
        // 授权和代理转账
        await debtToken.connect(carol).approve(bob.address, ethers.BigNumber.from("150000000000000000000"));
        await debtToken.connect(bob).transferFrom(carol.address, dave.address, ethers.BigNumber.from("100000000000000000000"));
        
        // 检查最终状态
        expect(await debtToken.balanceOf(bob.address)).to.equal(ethers.BigNumber.from("100000000000000000000"));
        expect(await debtToken.balanceOf(carol.address)).to.equal(ethers.BigNumber.from("200000000000000000000"));
        expect(await debtToken.balanceOf(dave.address)).to.equal(ethers.BigNumber.from("150000000000000000000"));
        expect(await debtToken.balanceOf(eve.address)).to.equal(ethers.BigNumber.from("50000000000000000000"));
        
        // 移除部分minter并验证权限变化
        await debtToken.connect(minter).delMinter(alice.address);
        await expect(debtToken.connect(alice).mint(bob.address, 1000)).to.be.reverted;
        
        // minter仍然可以铸币
        await debtToken.connect(minter).mint(eve.address, ethers.BigNumber.from("50000000000000000000"));
        expect(await debtToken.balanceOf(eve.address)).to.equal(ethers.BigNumber.from("100000000000000000000"));
    });
})
