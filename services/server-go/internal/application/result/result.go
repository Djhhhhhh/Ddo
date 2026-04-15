package result

// Result 用例执行结果
type Result[T any] struct {
	Success bool
	Data    T
	Error   error
}

// NewSuccess 创建成功结果
func NewSuccess[T any](data T) *Result[T] {
	return &Result[T]{
		Success: true,
		Data:    data,
		Error:   nil,
	}
}

// NewFailure 创建失败结果
func NewFailure[T any](err error) *Result[T] {
	var zero T
	return &Result[T]{
		Success: false,
		Data:    zero,
		Error:   err,
	}
}

// IsSuccess 是否成功
func (r *Result[T]) IsSuccess() bool {
	return r.Success
}
