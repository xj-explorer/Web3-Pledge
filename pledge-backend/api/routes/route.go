package routes

import (
	"pledge-backend/api/controllers"
	"pledge-backend/api/middlewares"
	"pledge-backend/config"

	"github.com/gin-gonic/gin"
)

func InitRoute(e *gin.Engine) *gin.Engine {

	// version group
	versionGroup := e.Group("/api/v" + config.Config.Env.Version)

	// pledge-defi backend
	poolController := controllers.PoolController{}
	versionGroup.GET("/poolBaseInfo", poolController.PoolBaseInfo)                                   //pool base information 池子详情信息
	versionGroup.GET("/poolDataInfo", poolController.PoolDataInfo)                                   //pool data information 池子基本信息
	versionGroup.GET("/token", poolController.TokenList)                                             //pool token information
	versionGroup.POST("/pool/debtTokenList", middlewares.CheckToken(), poolController.DebtTokenList) //pool debtTokenList
	versionGroup.POST("/pool/search", middlewares.CheckToken(), poolController.Search)               //pool search

	// plgr-usdt price
	priceController := controllers.PriceController{}
	versionGroup.GET("/price", priceController.NewPrice) //new price on ku-coin-exchange

	// pledge-defi admin backend
	multiSignPoolController := controllers.MultiSignPoolController{}
	versionGroup.POST("/pool/setMultiSign", middlewares.CheckToken(), multiSignPoolController.SetMultiSign) //multi-sign set
	versionGroup.POST("/pool/getMultiSign", middlewares.CheckToken(), multiSignPoolController.GetMultiSign) //multi-sign get

	userController := controllers.UserController{}
	versionGroup.POST("/user/login", userController.Login)                             // login
	versionGroup.POST("/user/logout", middlewares.CheckToken(), userController.Logout) // logout

	return e
}
