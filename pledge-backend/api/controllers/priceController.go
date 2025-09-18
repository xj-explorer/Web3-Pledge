package controllers

import (
	"net/http"
	"pledge-backend/api/models/ws"
	"pledge-backend/log"
	"pledge-backend/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type PriceController struct {
}

func (c *PriceController) NewPrice(ctx *gin.Context) {

	// 使用 defer 和 recover 捕获并处理函数执行过程中可能出现的 panic，避免程序崩溃
	// 若捕获到 panic，将错误信息记录到日志中
	defer func() {
		recoverRes := recover()
		if recoverRes != nil {
			log.Logger.Sugar().Error("new price recover ", recoverRes)
		}
	}()

	// 初始化 websocket 升级器，用于将 HTTP 连接升级为 WebSocket 连接
	conn, err := (&websocket.Upgrader{
		// 设置读取缓冲区大小为 1024 字节
		ReadBufferSize: 1024,
		// 设置写入缓冲区大小为 1024 字节
		WriteBufferSize: 1024,
		// 设置握手超时时间为 5 秒
		HandshakeTimeout: 5 * time.Second,
		// 跨域检查函数，允许所有来源的请求
		CheckOrigin: func(r *http.Request) bool { //Cross domain
			return true
		},
	}).Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		log.Logger.Sugar().Error("websocket request err:", err)
		return
	}

	// 初始化随机 ID 变量
	randomId := ""
	// 尝试获取客户端的远程 IP 地址
	remoteIP, ok := ctx.RemoteIP()
	// 若成功获取到远程 IP 地址
	if ok {
		// 将 IP 地址中的点号替换为下划线，并拼接一个 23 位的随机字符串作为随机 ID
		randomId = strings.Replace(remoteIP.String(), ".", "_", -1) + "_" + utils.GetRandomString(23)
	} else {
		// 若未获取到远程 IP 地址，则生成一个 32 位的随机字符串作为随机 ID
		randomId = utils.GetRandomString(32)
	}

	server := &ws.Server{
		Id:       randomId,
		Socket:   conn,
		Send:     make(chan []byte, 800),
		LastTime: time.Now().Unix(),
	}

	go server.ReadAndWrite()
}
