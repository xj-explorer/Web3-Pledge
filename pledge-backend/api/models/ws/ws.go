package ws

import (
	"encoding/json"
	"errors"
	"pledge-backend/api/models/kucoin"
	"pledge-backend/config"
	"pledge-backend/log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const SuccessCode = 0
const PongCode = 1
const ErrorCode = -1

type Server struct {
	sync.Mutex
	Id       string
	Socket   *websocket.Conn
	Send     chan []byte
	LastTime int64 // last send time
}

type ServerManager struct {
	// Servers 用于存储所有连接的 WebSocket 服务器实例，键为服务器 ID，值为 *Server 类型
	// sync.Map 是 Go 语言标准库中提供的并发安全的映射类型，适用于多个 goroutine 并发读写的场景，无需额外加锁。
	Servers    sync.Map // map[string]*Server
	Broadcast  chan []byte
	Register   chan *Server
	Unregister chan *Server
}

type Message struct {
	Code int    `json:"code"`
	Data string `json:"data"`
}

var Manager = ServerManager{}
var UserPingPongDurTime = config.Config.Env.WssTimeoutDuration // seconds

func (s *Server) SendToClient(data string, code int) {
	s.Lock()
	defer s.Unlock()

	dataBytes, err := json.Marshal(Message{
		Code: code,
		Data: data,
	})
	err = s.Socket.WriteMessage(websocket.TextMessage, dataBytes)
	if err != nil {
		log.Logger.Sugar().Error(s.Id+" SendToClient err ", err)
	}
}

func (s *Server) ReadAndWrite() {

	errChan := make(chan error)

	Manager.Servers.Store(s.Id, s)

	defer func() {
		Manager.Servers.Delete(s)
		_ = s.Socket.Close()
		close(s.Send)
	}()

	//write
	go func() {
		for {
			select {
			case message, ok := <-s.Send:
				if !ok {
					errChan <- errors.New("write message error")
					return
				}
				s.SendToClient(string(message), SuccessCode)
			}
		}
	}()

	//read
	go func() {
		for {

			_, message, err := s.Socket.ReadMessage()
			if err != nil {
				log.Logger.Sugar().Error(s.Id+" ReadMessage err ", err)
				errChan <- err
				return
			}

			//update heartbeat time
			if string(message) == "ping" || string(message) == `"ping"` || string(message) == "'ping'" {
				s.LastTime = time.Now().Unix()
				s.SendToClient("pong", PongCode)
			}
			continue

		}
	}()

	//check heartbeat
	for {
		select {
		case <-time.After(time.Second):
			if time.Now().Unix()-s.LastTime >= UserPingPongDurTime {
				s.SendToClient("heartbeat timeout", ErrorCode)
				return
			}
		case err := <-errChan:
			log.Logger.Sugar().Error(s.Id, " ReadAndWrite returned ", err)
			return
		}
	}
}

func StartServer() {
	log.Logger.Info("WsServer start")
	for {
		select {
		case price, ok := <-kucoin.PlgrPriceChan:
			if ok {
				// 使用 Range 方法遍历 Manager.Servers 中的所有连接
				// Range 方法接受一个回调函数，该函数会对 Servers 中的每一个键值对执行一次
				Manager.Servers.Range(func(key, value interface{}) bool {
					// 将 value 转换为 *Server 类型，因为我们知道 Servers 中存储的是 *Server 实例
					// 调用 SendToClient 方法，将最新的价格信息发送给客户端，状态码为 SuccessCode 表示成功
					value.(*Server).SendToClient(price, SuccessCode)
					// 返回 true 表示继续遍历下一个元素
					return true
				})
			}
		}
	}
}
