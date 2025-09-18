// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// 多签合约接口
interface IMultiSignature{
    // 获取有效的签名
    function getValidSignature(bytes32 msghash,uint256 lastIndex) external view returns(uint256);
}

// 多签客户端合约
contract multiSignatureClient{
    // 存储多签合约地址的存储槽位置
    uint256 private constant multiSignaturePositon = uint256(keccak256("org.multiSignature.storage"));
    // 默认签名索引值，用于在调用多签合约的 getValidSignature 方法时作为初始索引参数，
    // 验证交易是否被批准时会检查返回的索引是否大于此默认值。
    uint256 private constant defaultIndex = 0;

    // 构造函数，初始化多签合约地址
    constructor(address multiSignature) public {
        // 检查多签合约地址是否为零地址
        require(multiSignature != address(0),"multiSignatureClient : Multiple signature contract address is zero!");
        // 保存多签合约地址到指定存储槽
        saveValue(multiSignaturePositon,uint256(multiSignature));
    }

    // 获取多签合约地址
    function getMultiSignatureAddress()public view returns (address){
        return address(getValue(multiSignaturePositon));
    }

    // 验证调用的修饰器，用于在函数执行前检查当前调用是否经过多签验证。
    // 该修饰器会调用 checkMultiSignature 函数进行多签验证，
    // 若验证通过（即交易被多签批准），则继续执行被修饰的函数；
    // 若验证不通过，会抛出异常并终止执行。
    modifier validCall(){
        // 检查多签验证
        checkMultiSignature();
        _;
    }

    // 检查多签验证
    function checkMultiSignature() internal view {
        uint256 value;
        assembly {
            // 获取调用时发送的以太币数量
            value := callvalue()
        }
        // 计算消息哈希
        bytes32 msgHash = keccak256(abi.encodePacked(msg.sender, address(this)));
        // 获取多签合约地址
        address multiSign = getMultiSignatureAddress();
//        uint256 index = getValue(uint256(msgHash));
        // 调用多签合约获取有效签名索引
        uint256 newIndex = IMultiSignature(multiSign).getValidSignature(msgHash,defaultIndex);
        // 检查交易是否被批准
        require(newIndex > defaultIndex, "multiSignatureClient : This tx is not aprroved");
//        saveValue(uint256(msgHash),newIndex);
    }

    // 保存值到指定存储槽
    function saveValue(uint256 position,uint256 value) internal
    {
        assembly {
            // 将值存储到指定位置
            sstore(position, value)
        }
    }

    // 从指定存储槽获取值
    function getValue(uint256 position) internal view returns (uint256 value) {
        assembly {
            // 从指定位置加载值
            value := sload(position)
        }
    }
}