// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

// 导入多签客户端合约
import "./multiSignatureClient.sol";

// 白名单地址操作库
library whiteListAddress{
    // 添加地址到白名单
    function addWhiteListAddress(address[] storage whiteList,address temp) internal{
        if (!isEligibleAddress(whiteList,temp)){
            whiteList.push(temp);
        }
    }
    // 从白名单移除地址
    function removeWhiteListAddress(address[] storage whiteList,address temp)internal returns (bool) {
        uint256 len = whiteList.length;
        uint256 i=0;
        for (;i<len;i++){
            if (whiteList[i] == temp)
                break;
        }
        if (i<len){
            if (i!=len-1) {
                // 如果移除的地址不是最后一个，将最后一个地址移动到移除位置
                // 会影响白名单中的顺序，可以将i索引后面的元素都往前移动一位，最后再将最后一个元素移除。
                whiteList[i] = whiteList[len-1];
            }
            whiteList.pop();
            return true;
        }
        return false;
    }
    // 检查地址是否在白名单中
    function isEligibleAddress(address[] memory whiteList,address temp) internal pure returns (bool){
        uint256 len = whiteList.length;
        for (uint256 i=0;i<len;i++){
            if (whiteList[i] == temp)
                return true;
        }
        return false;
    }
}

// 多签合约，继承自 multiSignatureClient
contract multiSignature  is multiSignatureClient {
    // 默认索引
    uint256 private constant defaultIndex = 0;
    // 使用白名单地址操作库
    using whiteListAddress for address[];
    // 签名所有者地址数组
    address[] public signatureOwners;
    // 签名阈值，代表一个签名申请需要获得的最少签名数量，达到该数量的申请才被认为有效。
    uint256 public threshold;
    // 签名信息结构体
    struct signatureInfo {
        // 申请者地址
        address applicant;
        // 签名者地址数组，用来存储将签署该申请的签名者地址。
        address[] signatures;
    }
    // 消息哈希msgHash 到 签名信息数组的映射，一个交易哈希可以对应多个签名申请。
    mapping(bytes32=>signatureInfo[]) public signatureMap;

    // 转移所有者事件
    event TransferOwner(address indexed sender,address indexed oldOwner,address indexed newOwner);
    // 创建申请事件
    event CreateApplication(address indexed from,address indexed to,bytes32 indexed msgHash);
    // 签署申请事件
    event SignApplication(address indexed from,bytes32 indexed msgHash,uint256 index);
    // 撤销签名事件
    event RevokeApplication(address indexed from,bytes32 indexed msgHash,uint256 index);

    /**
     * @dev 构造函数，初始化签名所有者和签名阈值
     * @param owners 签名所有者地址数组
     * @param limitedSignNum 签名阈值
     */
    constructor(address[] memory owners,uint256 limitedSignNum) multiSignatureClient(address(this)) public {
        require(owners.length>=limitedSignNum,"Multiple Signature : Signature threshold is greater than owners' length!");
        signatureOwners = owners;
        threshold = limitedSignNum;
    }

    /**
     * @dev 替换signatureOwners中指定索引的签名所有者
     * @param index 待转移所有者的索引
     * @param newOwner 新的所有者地址
     */
    function transferOwner(uint256 index,address newOwner) public onlyOwner validCall{
        require(index<signatureOwners.length,"Multiple Signature : Owner index is overflow!");
        emit TransferOwner(msg.sender,signatureOwners[index],newOwner);
        signatureOwners[index] = newOwner;
    }

    /**
     * @dev 创建签名申请
     * @param to 申请目标地址
     * @return 申请在映射中的索引
     */
    function createApplication(address to) external returns(uint256) {
        bytes32 msghash = getApplicationHash(msg.sender,to);
        uint256 index = signatureMap[msghash].length;
        signatureMap[msghash].push(signatureInfo(msg.sender,new address[](0)));
        emit CreateApplication(msg.sender,to,msghash);
        return index;
    }

    /**
     * @dev 签署申请（使用默认索引）
     * @param msghash 申请消息哈希
     */
    function signApplication(bytes32 msghash) external onlyOwner validIndex(msghash,defaultIndex){
        emit SignApplication(msg.sender,msghash,defaultIndex);
        signatureMap[msghash][defaultIndex].signatures.addWhiteListAddress(msg.sender);
    }

    /**
     * @dev 撤销签名（使用默认索引）
     * @param msghash 申请消息哈希
     */
    function revokeSignApplication(bytes32 msghash) external onlyOwner validIndex(msghash,defaultIndex){
        emit RevokeApplication(msg.sender,msghash,defaultIndex);
        signatureMap[msghash][defaultIndex].signatures.removeWhiteListAddress(msg.sender);
    }

    /**
     * @dev 获取有效的签名申请索引
     * @param msghash 申请消息哈希
     * @param lastIndex 起始检查索引
     * @return 有效的签名申请索引+1（签名者数组实际长度），若无则返回0
     */
    function getValidSignature(bytes32 msghash,uint256 lastIndex) external view returns(uint256){
        signatureInfo[] storage info = signatureMap[msghash];
        for (uint256 i=lastIndex;i<info.length;i++){
            if(info[i].signatures.length >= threshold){
                return i+1;
            }
        }
        return 0;
    }

    /**
     * @dev 获取申请信息
     * @param msghash 申请消息哈希
     * @param index 申请索引
     * @return 申请者地址和签名者地址数组
     */
    function getApplicationInfo(bytes32 msghash,uint256 index) validIndex(msghash,index) public view returns (address,address[]memory) {
        signatureInfo memory info = signatureMap[msghash][index];
        return (info.applicant,info.signatures);
    }

    /**
     * @dev 获取指定消息哈希的申请签名的数量
     * @param msghash 申请消息哈希
     * @return 申请数量
     */
    function getApplicationCount(bytes32 msghash) public view returns (uint256) {
        return signatureMap[msghash].length;
    }

    /**
     * @dev 生成申请消息哈希
     * @param from 申请者地址
     * @param to 目标地址
     * @return 消息哈希
     */
    function getApplicationHash(address from,address to) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, to));
    }

    // 仅签名所有者可调用的修饰器
    modifier onlyOwner{
        require(signatureOwners.isEligibleAddress(msg.sender),"Multiple Signature : caller is not in the ownerList!");
        _;
    }

    // 验证索引有效性的修饰器
    modifier validIndex(bytes32 msghash,uint256 index){
        require(index<signatureMap[msghash].length,"Multiple Signature : Message index is overflow!");
        _;
    }
}