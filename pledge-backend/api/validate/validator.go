package validate

import (
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

// BindingValidator gin bind go-playground/validate
func BindingValidator() {
	// 尝试从 binding.Validator 中获取 validator.Validate 实例
	// v 为获取到的 validator.Validate 实例
	// ok 表示是否成功获取到实例
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		// 向验证器注册一个名为 "IsPassword" 的自定义验证规则
		// 该规则对应的验证函数为 IsPassword
		// 作用是判断输入的内容是否为合法密码
		_ = v.RegisterValidation("IsPassword", IsPassword)                           //判断是否为合法密码
		_ = v.RegisterValidation("IsPhoneNumber", IsPhoneNumber)                     //检查手机号码字段是否合法
		_ = v.RegisterValidation("IsEmail", IsEmail)                                 //检查邮箱字段是否合法
		_ = v.RegisterValidation("CheckUserNicknameLength", CheckUserNicknameLength) //检查用户昵称长度是否合法
		_ = v.RegisterValidation("CheckUserAccount", CheckUserAccount)               //检查用户账号是否合法
		_ = v.RegisterValidation("OnlyOne", OnlyOne)                                 //字段唯一性约束
	}
}
