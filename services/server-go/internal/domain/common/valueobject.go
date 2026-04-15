package common

// ValueObject 值对象接口
// 值对象：无唯一标识、不可变、通过属性相等判断
type ValueObject interface {
	// Equals 判断两个值对象是否相等
	Equals(other ValueObject) bool
}
