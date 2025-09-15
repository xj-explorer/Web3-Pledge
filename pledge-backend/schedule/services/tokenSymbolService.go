package services

import (
	"encoding/json"
	"errors"
	"os"
	"pledge-backend/config"
	abifile "pledge-backend/contract/abi"
	"pledge-backend/db"
	"pledge-backend/log"
	"pledge-backend/schedule/models"
	"pledge-backend/utils"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"gorm.io/gorm"
)

type TokenSymbol struct{}

func NewTokenSymbol() *TokenSymbol {
	return &TokenSymbol{}
}

// UpdateContractSymbol get contract symbol
func (s *TokenSymbol) UpdateContractSymbol() {
	var tokens []models.TokenInfo
	db.Mysql.Table("token_info").Find(&tokens)
	for _, t := range tokens {
		if t.Token == "" {
			log.Logger.Sugar().Error("UpdateContractSymbol token empty", t.Symbol, t.ChainId)
			continue
		}
		err := errors.New("")
		symbol := ""
		if t.ChainId == config.Config.TestNet.ChainId {
			err, symbol = s.GetContractSymbolOnTestNet(t.Token, config.Config.TestNet.NetUrl)
		} else if t.ChainId == config.Config.MainNet.ChainId {
			if t.AbiFileExist == 0 {
				err = s.GetRemoteAbiFileByToken(t.Token, t.ChainId)
				if err != nil {
					log.Logger.Sugar().Error("UpdateContractSymbol GetRemoteAbiFileByToken err ", t.Symbol, t.ChainId, err)
					continue
				}
			}
			err, symbol = s.GetContractSymbolOnMainNet(t.Token, config.Config.MainNet.NetUrl)
		} else {
			log.Logger.Sugar().Error("UpdateContractSymbol chain_id err ", t.Symbol, t.ChainId)
			continue
		}
		if err != nil {
			log.Logger.Sugar().Error("UpdateContractSymbol err ", t.Symbol, t.ChainId, err)
			continue
		}

		hasNewData, err := s.CheckSymbolData(t.Token, t.ChainId, symbol)
		if err != nil {
			log.Logger.Sugar().Error("UpdateContractSymbol CheckSymbolData err ", err)
			continue
		}

		if hasNewData {
			err = s.SaveSymbolData(t.Token, t.ChainId, symbol)
			if err != nil {
				log.Logger.Sugar().Error("UpdateContractSymbol SaveSymbolData err ", err)
				continue
			}
		}
	}
}

// GetRemoteAbiFileByToken get and save remote abi file on main net
func (s *TokenSymbol) GetRemoteAbiFileByToken(token, chainId string) error {

	// url := "https://api.bscscan.com/api?module=contract&action=getabi&apikey=HJ3WS4N88QJ6S7PQ8D89BD49IZIFP1JFER&address=" + token

	url := "https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=" + token

	res, err := utils.HttpGet(url, map[string]string{})
	if err != nil {
		log.Logger.Error(err.Error())
		return err
	}

	resStr := s.FormatAbiJsonStr(string(res))

	abiJson := models.AbiJson{}
	err = json.Unmarshal([]byte(resStr), &abiJson)
	if err != nil {
		log.Logger.Error(err.Error())
		return err
	}

	if abiJson.Status != "1" {
		log.Logger.Sugar().Error("get remote abi file failed: status 0 ", resStr)
		return errors.New("get remote abi file failed: status 0 ")
	}

	// marshal and format
	abiJsonBytes, err := json.MarshalIndent(abiJson.Result, "", "\t")
	if err != nil {
		log.Logger.Error(err.Error())
		return err
	}

	newAbiFile := abifile.GetCurrentAbPathByCaller() + "/" + token + ".abi"

	err = os.WriteFile(newAbiFile, abiJsonBytes, 0777)
	if err != nil {
		log.Logger.Error(err.Error())
		return err
	}

	err = db.Mysql.Table("token_info").Where("token=? and chain_id=?", token, chainId).Updates(map[string]interface{}{
		"abi_file_exist": 1,
	}).Debug().Error
	if err != nil {
		return err
	}
	return nil
}

// FormatAbiJsonStr format the abi string
func (s *TokenSymbol) FormatAbiJsonStr(result string) string {
	resStr := strings.Replace(result, `\`, ``, -1)
	resStr = strings.Replace(result, `\"`, `"`, -1)
	resStr = strings.Replace(resStr, `"[{`, `[{`, -1)
	resStr = strings.Replace(resStr, `}]"`, `}]`, -1)
	return resStr
}

// GetContractSymbolOnMainNet get contract symbol on main net
func (s *TokenSymbol) GetContractSymbolOnMainNet(token, network string) (error, string) {
	ethereumConn, err := ethclient.Dial(network)
	if nil != err {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}
	abiStr, err := abifile.GetAbiByToken(token)
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}
	parsed, err := abi.JSON(strings.NewReader(abiStr))
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}
	contract, err := bind.NewBoundContract(common.HexToAddress(token), parsed, ethereumConn, ethereumConn, ethereumConn), nil
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}

	res := make([]interface{}, 0)
	err = contract.Call(nil, &res, "symbol")
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", err)
		return err, ""
	}

	return nil, res[0].(string)
}

// GetContractSymbolOnTestNet get contract symbol on test net
func (s *TokenSymbol) GetContractSymbolOnTestNet(token, network string) (error, string) {
	ethereumConn, err := ethclient.Dial(network)
	if nil != err {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}
	abiStr, err := abifile.GetAbiByToken("erc20")
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}
	parsed, err := abi.JSON(strings.NewReader(abiStr))
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}
	contract, err := bind.NewBoundContract(common.HexToAddress(token), parsed, ethereumConn, ethereumConn, ethereumConn), nil
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}

	res := make([]interface{}, 0)
	err = contract.Call(nil, &res, "symbol")
	if err != nil {
		log.Logger.Sugar().Error("GetContractSymbolOnMainNet err ", token, err)
		return err, ""
	}

	return nil, res[0].(string)
}

// CheckSymbolData Saving symbol data to redis if it has new symbol
func (s *TokenSymbol) CheckSymbolData(token, chainId, symbol string) (bool, error) {
	redisKey := "token_info:" + chainId + ":" + token
	redisTokenInfoBytes, err := db.RedisGet(redisKey)
	if len(redisTokenInfoBytes) <= 0 {
		err = s.CheckTokenInfo(token, chainId)
		if err != nil {
			log.Logger.Error(err.Error())
		}
		err = db.RedisSet(redisKey, models.RedisTokenInfo{
			Token:   token,
			ChainId: chainId,
			Symbol:  symbol,
		}, 0)
		if err != nil {
			log.Logger.Error(err.Error())
			return false, err
		}
	} else {
		redisTokenInfo := models.RedisTokenInfo{}
		err = json.Unmarshal(redisTokenInfoBytes, &redisTokenInfo)
		if err != nil {
			log.Logger.Error(err.Error())
			return false, err
		}

		if redisTokenInfo.Symbol == symbol {
			return false, nil
		}

		redisTokenInfo.Symbol = symbol
		err = db.RedisSet(redisKey, redisTokenInfo, 0)
		if err != nil {
			log.Logger.Error(err.Error())
			return true, err
		}
	}
	return true, nil
}

// CheckTokenInfo  Insert token information if it was not in mysql
func (s *TokenSymbol) CheckTokenInfo(token, chainId string) error {
	tokenInfo := models.TokenInfo{}
	err := db.Mysql.Table("token_info").Where("token=? and chain_id=?", token, chainId).First(&tokenInfo).Debug().Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			tokenInfo = models.TokenInfo{}
			nowDateTime := utils.GetCurDateTimeFormat()
			tokenInfo.Token = token
			tokenInfo.ChainId = chainId
			tokenInfo.UpdatedAt = nowDateTime
			tokenInfo.CreatedAt = nowDateTime
			err = db.Mysql.Table("token_info").Create(tokenInfo).Debug().Error
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}
	return nil
}

// SaveSymbolData Saving symbol data to mysql if it has new symbol
func (s *TokenSymbol) SaveSymbolData(token, chainId, symbol string) error {
	nowDateTime := utils.GetCurDateTimeFormat()

	err := db.Mysql.Table("token_info").Where("token=? and chain_id=? ", token, chainId).Updates(map[string]interface{}{
		"symbol":     symbol,
		"updated_at": nowDateTime,
	}).Debug().Error
	if err != nil {
		log.Logger.Sugar().Error("UpdateContractSymbol SaveSymbolData err ", err)
		return err
	}

	return nil
}
