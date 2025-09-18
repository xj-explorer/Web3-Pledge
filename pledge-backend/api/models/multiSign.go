package models

import (
	"encoding/json"
	"errors"
	"pledge-backend/api/models/request"
	"pledge-backend/db"

	"gorm.io/gorm"
)

// MultiSign multi-sign signature
type MultiSign struct {
	Id               int32  `gorm:"column:id;primaryKey"`
	SpName           string `json:"sp_name" gorm:"column:sp_name"`
	ChainId          int    `json:"chain_id" gorm:"column:chain_id"`
	SpToken          string `json:"_spToken" gorm:"column:sp_token"`
	JpName           string `json:"jp_name" gorm:"column:jp_name"`
	JpToken          string `json:"_jpToken" gorm:"column:jp_token"`
	SpAddress        string `json:"sp_address" gorm:"column:sp_address"`
	JpAddress        string `json:"jp_address" gorm:"column:jp_address"`
	SpHash           string `json:"spHash" gorm:"column:sp_hash"`
	JpHash           string `json:"jpHash" gorm:"column:jp_hash"`
	MultiSignAccount string `json:"multi_sign_account" gorm:"column:multi_sign_account"`
}

func NewMultiSign() *MultiSign {
	return &MultiSign{}
}

// Set Multi-Sign
func (m *MultiSign) Set(multiSign *request.SetMultiSign) error {

	MultiSignAccountByteArr, _ := json.Marshal(multiSign.MultiSignAccount)
	err := db.Mysql.Table("multi_sign").Where("chain_id", multiSign.ChainId).Delete(&m).Debug().Error
	if err != nil {
		return errors.New("record select err " + err.Error())
	}
	// 执行 SQL 插入操作，向 multi_sign 表中插入一条新记录。
	// 使用 Where 条件 "id=?" 看似不合理，因为 Create 方法是用于插入新记录，通常不需要 Where 条件。
	// 这里将数据结构体 &MultiSign 中的数据插入到 multi_sign 表中。
	err = db.Mysql.Table("multi_sign").Where("id=?", m.Id).Create(&MultiSign{
		ChainId:          multiSign.ChainId,
		SpName:           multiSign.SpName,
		SpToken:          multiSign.SpToken,
		JpName:           multiSign.JpName,
		JpToken:          multiSign.JpToken,
		SpAddress:        multiSign.SpAddress,
		JpAddress:        multiSign.JpAddress,
		SpHash:           multiSign.SpHash,
		JpHash:           multiSign.JpHash,
		MultiSignAccount: string(MultiSignAccountByteArr),
	}).Debug().Error
	if err != nil {
		return err
	}
	return nil
}

// Get Multi-Sign
func (m *MultiSign) Get(chainId int) error {
	err := db.Mysql.Table("multi_sign").Where("chain_id", chainId).First(&m).Debug().Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		} else {
			return errors.New("record select err " + err.Error())
		}
	}
	return nil
}
