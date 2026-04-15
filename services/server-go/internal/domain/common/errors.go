package common

// DomainError 领域错误
type DomainError struct {
	Code    string
	Message string
}

// Error 实现 error 接口
func (e DomainError) Error() string {
	return e.Message
}

// NewDomainError 创建领域错误
func NewDomainError(code, message string) DomainError {
	return DomainError{
		Code:    code,
		Message: message,
	}
}

// 预定义的领域错误
var (
	// ErrEntityNotFound 实体不存在
	ErrEntityNotFound = DomainError{Code: "ENTITY_NOT_FOUND", Message: "实体不存在"}
	// ErrInvalidState 无效的状态变更
	ErrInvalidState = DomainError{Code: "INVALID_STATE", Message: "无效的状态变更"}
	// ErrInvalidArgument 无效参数
	ErrInvalidArgument = DomainError{Code: "INVALID_ARGUMENT", Message: "无效的参数"}
	// ErrDuplicate 重复数据
	ErrDuplicate = DomainError{Code: "DUPLICATE", Message: "数据已存在"}
)

// IsDomainError 判断是否为领域错误
func IsDomainError(err error, target DomainError) bool {
	e, ok := err.(DomainError)
	if !ok {
		return false
	}
	return e.Code == target.Code
}
