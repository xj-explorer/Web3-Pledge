// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// 多签合约接口
interface IMultiSignature{
    // 获取有效的签名
    function getValidSignature(bytes32 msghash, uint256 lastIndex) external view returns(uint256);
}

// 模拟多签合约实现
contract MockMultiSignature is IMultiSignature {
    // 合约拥有者
    address public owner;

    // 构造函数
    constructor() public {
        owner = msg.sender;
    }

    // 获取有效的签名索引
    // 为了简化测试，我们直接返回lastIndex + 1，表示所有交易都已被批准
    function getValidSignature(bytes32 msghash, uint256 lastIndex) external view override returns(uint256) {
        // 简单地返回lastIndex + 1，这样任何调用都会通过验证
        // 这是为了简化测试，实际应用中应该有更复杂的多签逻辑
        return lastIndex + 1;
    }
}