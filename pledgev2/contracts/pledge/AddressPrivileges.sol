// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../multiSignature/multiSignatureClient.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

/**
 * @dev 与地址类型相关的函数集合
 */
contract AddressPrivileges is multiSignatureClient {

    /**
     * @dev 构造函数，初始化多签地址
     * @param multiSignature 多签合约地址
     */
    constructor(address multiSignature) multiSignatureClient(multiSignature) public {
    }

    using EnumerableSet for EnumerableSet.AddressSet;
    // 存储铸币者地址的集合
    EnumerableSet.AddressSet private _minters;

    /**
     * @notice 添加一个铸币者
     * @dev 为资产添加一个铸币者的函数
     * @param _addMinter 要添加的铸币者地址
     * @return 返回操作是否成功，成功为 true，失败为 false
     */
    function addMinter(address _addMinter) public validCall returns (bool) {
        require(_addMinter != address(0), "Token: _addMinter is the zero address");
        return EnumerableSet.add(_minters, _addMinter);
    }

    /**
     * @notice 删除一个铸币者
     * @dev 为资产删除一个铸币者的函数
     * @param _delMinter 要删除的铸币者地址
     * @return 返回操作是否成功，成功为 true，失败为 false
     */
    function delMinter(address _delMinter) public validCall returns (bool) {
        require(_delMinter != address(0), "Token: _delMinter is the zero address");
        return EnumerableSet.remove(_minters, _delMinter);
    }

    /**
     * @notice 获取铸币者列表的长度
     * @dev 获取铸币者列表长度的函数
     * @return 返回铸币者列表的长度
     */
    function getMinterLength() public view returns (uint256) {
        return EnumerableSet.length(_minters);
    }

    /**
     * @notice 判断该地址是否为铸币者
     * @dev 判断地址是否为铸币者的函数
     * @param account 要判断的地址
     * @return 如果是铸币者返回 true，否则返回 false
     */
    function isMinter(address account) public view returns (bool) {
        return EnumerableSet.contains(_minters, account);
    }

    /**
     * @notice 根据索引获取铸币者账户
     * @dev 根据索引获取铸币者账户的函数
     * @param _index 索引值
     * @return 返回对应索引的铸币者账户地址
     */
    function getMinter(uint256 _index) public view  returns (address){
        require(_index <= getMinterLength() - 1, "Token: index out of bounds");
        return EnumerableSet.at(_minters, _index);
    }

    /**
     * @dev 仅允许铸币者调用的修饰器
     */
    modifier onlyMinter() {
        require(isMinter(msg.sender), "Token: caller is not the minter");
        _;
    }

}