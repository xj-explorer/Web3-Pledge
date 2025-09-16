package static

import (
	"path"
	"runtime"
)

// GetCurrentAbPathByCaller 函数用于获取调用该函数的文件所在的绝对路径。
// 该函数通过 runtime.Caller 函数获取调用栈信息，进而得到当前文件的路径。
// 返回值为当前文件所在的目录的绝对路径，如果获取失败则返回空字符串。
func GetCurrentAbPathByCaller() string {
	// 用于存储获取到的绝对路径
	var abPath string
	// runtime.Caller(0) 用于获取当前函数的调用信息
	// 第一个返回值为调用栈的程序计数器，这里不使用，用 _ 忽略
	// 第二个返回值 filename 为调用该函数的文件的绝对路径
	// 第三个返回值为调用该函数的代码所在行号，这里不使用，用 _ 忽略
	// 第四个返回值 ok 表示是否成功获取到调用信息
	_, filename, _, ok := runtime.Caller(0)
	// 如果成功获取到调用信息
	if ok {
		// 使用 path.Dir 函数获取文件所在的目录路径
		abPath = path.Dir(filename)
	}
	// 返回获取到的绝对路径，如果获取失败则返回空字符串
	return abPath
}
