// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

// 导入多重签名客户端合约
import "../multiSignature/multiSignatureClient.sol";
// 导入 Chainlink 的 AggregatorV3 接口
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

/**
 * @title BscPledgeOracle 合约
 * @dev 用于获取和设置资产价格，支持通过 Chainlink 预言机获取价格
 */
contract BscPledgeOracle is multiSignatureClient {
    // 映射：资产 ID 到对应的 Chainlink 价格聚合器接口
    mapping(uint256 => AggregatorV3Interface) internal assetsMap;
    // 映射：资产 ID 到对应的资产精度
    mapping(uint256 => uint256) internal decimalsMap;
    // 映射：资产 ID 到对应的资产价格
    mapping(uint256 => uint256) internal priceMap;
    // 内部精度变量，默认值为 1
    uint256 internal decimals = 1;

    /**
     * @dev 合约构造函数
     * @param multiSignature 多重签名合约地址
     */
    constructor(address multiSignature) multiSignatureClient(multiSignature) public {
//        //  bnb/USD
//        assetsMap[uint256(0x0000000000000000000000000000000000000000)] = AggregatorV3Interface(0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526);
//        // DAI/USD
//        assetsMap[uint256(0xf2bDB4ba16b7862A1bf0BE03CD5eE25147d7F096)] = AggregatorV3Interface(0xE4eE17114774713d2De0eC0f035d4F7665fc025D);
//        // BTC/USD
//        assetsMap[uint256(0xF592aa48875a5FDE73Ba64B527477849C73787ad)] = AggregatorV3Interface(0x5741306c21795FdCBb9b265Ea0255F499DFe515C);
//        // BUSD/USD
//        assetsMap[uint256(0xDc6dF65b2fA0322394a8af628Ad25Be7D7F413c2)] = AggregatorV3Interface(0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa);
//
//
//        decimalsMap[uint256(0x0000000000000000000000000000000000000000)] = 18;
//        decimalsMap[uint256(0xf2bDB4ba16b7862A1bf0BE03CD5eE25147d7F096)] = 18;
//        decimalsMap[uint256(0xF592aa48875a5FDE73Ba64B527477849C73787ad)] = 18;
//        decimalsMap[uint256(0xDc6dF65b2fA0322394a8af628Ad25Be7D7F413c2)] = 18;
    }

    /**
     * @notice 设置精度
     * @dev 更新资产的精度
     * @param newDecimals 用于替换旧精度的新精度值
     */
    function setDecimals(uint256 newDecimals) public validCall{
        decimals = newDecimals;
    }

    /**
     * @notice 批量设置资产价格
     * @dev 更新多个资产的价格
     * @param assets 资产 ID 数组
     * @param prices 对应的资产价格数组
     */
    function setPrices(uint256[] memory assets, uint256[] memory prices) external validCall {
        require(assets.length == prices.length, "input arrays' length are not equal");
        uint256 len = assets.length;
        for (uint i = 0; i < len; i++){
            priceMap[i] = prices[i]; 
            // priceMap[assets[i]] = prices[i];     ？？？
        }
    }

    /**
     * @notice 批量获取资产价格
     * @dev 获取多个资产的价格
     * @param assets 需要获取价格的资产 ID 数组
     * @return uint256[] 资产价格数组（按 1e8 缩放），若未设置或合约暂停则返回 0
     */
    function getPrices(uint256[] memory assets) public view returns (uint256[] memory) {
        uint256 len = assets.length;
        uint256[] memory prices = new uint256[](len);
        for (uint i = 0; i < len; i++){
            prices[i] = getUnderlyingPrice(assets[i]);
        }
        return prices;
    }

    /**
     * @notice 获取单个资产的价格
     * @dev 获取指定资产的价格
     * @param asset 需要获取价格的资产地址
     * @return uint256 资产价格（按 1e8 缩放），若未设置或合约暂停则返回 0
     */
    function getPrice(address asset) public view returns (uint256) {
        return getUnderlyingPrice(uint256(asset));
    }

    /**
     * @notice 根据资产 ID 获取价格
     * @dev 根据资产 ID 获取对应的价格
     * @param underlying 需要获取价格的资产 ID
     * @return uint256 资产价格（按 1e8 缩放），若未设置或合约暂停则返回 0
     */
    function getUnderlyingPrice(uint256 underlying) public view returns (uint256) {
        AggregatorV3Interface assetsPrice = assetsMap[underlying];
        if (address(assetsPrice) != address(0)){
            (, int price,,,) = assetsPrice.latestRoundData();
            uint256 tokenDecimals = decimalsMap[underlying];
            if (tokenDecimals < 18){
                return uint256(price)/decimals*(10**(18-tokenDecimals));
            }else if (tokenDecimals > 18){
                return uint256(price)/decimals/(10**(18-tokenDecimals));
            }else{
                return uint256(price)/decimals;
            }
        }else {
            return priceMap[underlying];
        }
    }

    /**
     * @notice 设置单个资产的价格
     * @dev 设置指定资产的价格
     * @param asset 需要设置价格的资产地址
     * @param price 资产的价格
     */
    function setPrice(address asset, uint256 price) public validCall {
        priceMap[uint256(asset)] = price;
    }

    /**
     * @notice 设置底层资产的价格
     * @dev 设置指定底层资产的价格
     * @param underlying 需要设置价格的底层资产 ID
     * @param price 底层资产的价格
     */
    function setUnderlyingPrice(uint256 underlying, uint256 price) public validCall {
        require(underlying > 0 , "underlying cannot be zero");
        priceMap[underlying] = price;
    }

    /**
     * @notice 设置资产的价格聚合器
     * @dev 设置指定资产的 Chainlink 价格聚合器和精度
     * @param asset 需要设置聚合器的资产地址
     * @param aggergator 资产的价格聚合器地址
     * @param _decimals 资产的精度
     */
    function setAssetsAggregator(address asset, address aggergator, uint256 _decimals) public validCall {
        assetsMap[uint256(asset)] = AggregatorV3Interface(aggergator);
        decimalsMap[uint256(asset)] = _decimals;
    }

    /**
     * @notice 设置底层资产的价格聚合器
     * @dev 设置指定底层资产的 Chainlink 价格聚合器和精度
     * @param underlying 需要设置聚合器的底层资产 ID
     * @param aggergator 底层资产的价格聚合器地址
     * @param _decimals 底层资产的精度
     */
    function setUnderlyingAggregator(uint256 underlying, address aggergator, uint256 _decimals) public validCall {
        require(underlying > 0 , "underlying cannot be zero");
        assetsMap[underlying] = AggregatorV3Interface(aggergator);
        decimalsMap[underlying] = _decimals;
    }

    /**
     * @notice 根据资产地址获取资产的价格聚合器和精度
     * @dev 获取指定资产的 Chainlink 价格聚合器地址和精度
     * @param asset 需要获取聚合器的资产地址
     * @return address 资产的价格聚合器地址
     * @return uint256 资产的精度
     */
    function getAssetsAggregator(address asset) public view returns (address, uint256) {
        return (address(assetsMap[uint256(asset)]), decimalsMap[uint256(asset)]);
    }

    /**
     * @notice 根据底层资产 ID 获取资产的价格聚合器和精度
     * @dev 获取指定底层资产的 Chainlink 价格聚合器地址和精度
     * @param underlying 需要获取聚合器的底层资产 ID
     * @return address 底层资产的价格聚合器地址
     * @return uint256 底层资产的精度
     */
    function getUnderlyingAggregator(uint256 underlying) public view returns (address, uint256) {
        return (address(assetsMap[underlying]), decimalsMap[underlying]);
    }
}
