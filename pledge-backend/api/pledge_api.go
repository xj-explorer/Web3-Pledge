package main

import (
	"pledge-backend/api/middlewares"
	"pledge-backend/api/models"
	"pledge-backend/api/models/kucoin"
	"pledge-backend/api/models/ws"
	"pledge-backend/api/routes"
	"pledge-backend/api/static"
	"pledge-backend/api/validate"
	"pledge-backend/config"
	"pledge-backend/db"

	"github.com/gin-gonic/gin"
)

func main() {

	//init mysql
	db.InitMysql()

	//init redis
	db.InitRedis()
	models.InitTable()

	//gin bind go-playground-validator
	validate.BindingValidator()

	// websocket server
	go ws.StartServer()

	// get plgr price from kucoin-exchange
	go kucoin.GetExchangePrice()

	// gin start
	gin.SetMode(gin.ReleaseMode)

	app := gin.Default()

	// 调用 static.GetCurrentAbPathByCaller() 函数获取当前调用环境下的绝对路径，D:/1web3/Web3-Pledge/pledge-backend/api/static
	staticPath := static.GetCurrentAbPathByCaller()

	// 将静态文件服务挂载到 /storage/ 路径下，使用之前获取的绝对路径 staticPath 作为静态文件的根目录。
	// 这意味着当客户端访问 /storage/ 开头的路由路径时，会从 staticPath 对应的目录中查找并返回相应的静态文件。
	app.Static("/storage/", staticPath)

	app.Use(middlewares.Cors()) // 「 Cross domain Middleware 」

	routes.InitRoute(app)

	_ = app.Run(":" + config.Config.Env.Port)

}

/*
 If you change the version, you need to modify the following files'
 config/init.go
*/
