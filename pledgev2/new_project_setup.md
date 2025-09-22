# 创建干净的测试环境以解决ethers.js版本冲突问题

## 问题分析

经过多次测试，我们发现项目中存在严重的ethers.js版本冲突问题：

1. 从`npm list ethers`命令输出可以看到，项目中同时存在ethers.js v4、v5和v6版本
2. 这种多版本共存导致了BigNumber对象的方法覆盖冲突
3. 错误信息：`cannot override "_hex","_isBigNumber","fromTwos",...`

## 解决方案

由于现有项目的依赖关系过于复杂，无法通过简单的配置修改解决问题，建议创建一个全新的Hardhat项目，只包含最必要的依赖。

### 步骤1：创建新的项目目录

```bash
mkdir clean-pledge-test
cd clean-pledge-test
```

### 步骤2：初始化新项目

```bash
npm init -y
npm install --save-dev hardhat
npx hardhat init
# 选择 "创建一个空的 hardhat.config.js"
```

### 步骤3：安装必要的依赖（确保版本兼容性）

```bash
npm install --save-dev @nomiclabs/hardhat-ethers@^2.2.0 ethers@^5.7.0 chai @nomiclabs/hardhat-waffle ethereum-waffle
```

### 步骤4：配置hardhat.config.js

```javascript
require('@nomiclabs/hardhat-waffle');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.4.18" },
      { version: "0.5.16" },
      { version: "0.6.6" },
      { version: "0.6.12" }
    ]
  },
};
```

### 步骤5：复制必要的合约文件

从原项目复制必要的合约文件到新项目的`contracts`目录：
- BEP20Token.sol
- BtcToken.sol
- DebtToken.sol
- MockOracle.sol
- MockMultiSignature.sol
- PledgePool.sol
- 以及其他必要的接口和库文件

### 步骤6：创建简化的测试文件

创建一个简化的测试文件，只测试最基本的功能：

```javascript
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CleanTest', function() {
  let busdContract, pledgeContract;
  let deployer, user1;

  beforeEach(async function() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    user1 = signers[1];

    // 部署必要的合约
    const TokenFactory = await ethers.getContractFactory('BEP20Token');
    busdContract = await TokenFactory.deploy();
    
    // 部署其他必要的合约...
  });

  it('should work without BigNumber errors', async function() {
    // 简单的测试逻辑...
    console.log('测试成功运行！');
  });
});
```

### 步骤7：运行测试

```bash
npx hardhat test
```

## 总结

创建一个全新的项目环境是解决这种复杂依赖冲突的最有效方法。通过控制依赖版本并只包含必要的功能，我们可以避免BigNumber方法覆盖错误，并确保测试能够正常运行。

在新环境中验证基本功能正常后，可以逐步添加更多的合约和测试，确保每个步骤都不会引入新的兼容性问题。