package utils

import (
	"regexp"
	"strings"
)

// Validator 通用验证工具
type Validator struct {
	errors map[string]string
}

// NewValidator 创建验证器
func NewValidator() *Validator {
	return &Validator{
		errors: make(map[string]string),
	}
}

// Required 验证必填字段
func (v *Validator) Required(value, field, message string) *Validator {
	if strings.TrimSpace(value) == "" {
		if message == "" {
			message = field + " is required"
		}
		v.errors[field] = message
	}
	return v
}

// MinLength 验证最小长度
func (v *Validator) MinLength(value string, min int, field, message string) *Validator {
	if len(value) < min {
		if message == "" {
			message = field + " must be at least " + string(rune(min)) + " characters"
		}
		v.errors[field] = message
	}
	return v
}

// MaxLength 验证最大长度
func (v *Validator) MaxLength(value string, max int, field, message string) *Validator {
	if len(value) > max {
		if message == "" {
			message = field + " must be at most " + string(rune(max)) + " characters"
		}
		v.errors[field] = message
	}
	return v
}

// Email 验证邮箱格式
func (v *Validator) Email(value, field, message string) *Validator {
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	matched, _ := regexp.MatchString(pattern, value)
	if !matched {
		if message == "" {
			message = field + " must be a valid email address"
		}
		v.errors[field] = message
	}
	return v
}

// Pattern 验证正则表达式
func (v *Validator) Pattern(value, pattern, field, message string) *Validator {
	matched, _ := regexp.MatchString(pattern, value)
	if !matched {
		if message == "" {
			message = field + " format is invalid"
		}
		v.errors[field] = message
	}
	return v
}

// Custom 自定义验证
func (v *Validator) Custom(valid bool, field, message string) *Validator {
	if !valid {
		v.errors[field] = message
	}
	return v
}

// HasErrors 是否有错误
func (v *Validator) HasErrors() bool {
	return len(v.errors) > 0
}

// Errors 获取所有错误
func (v *Validator) Errors() map[string]string {
	return v.errors
}

// FirstError 获取第一个错误
func (v *Validator) FirstError() (string, string) {
	for field, message := range v.errors {
		return field, message
	}
	return "", ""
}

// ValidateStruct 验证结构体（预留扩展）
// 未来可以通过 tag 反射实现自动验证
func ValidateStruct(obj interface{}) (bool, map[string]string) {
	// TODO: 实现基于反射的结构体验证
	return true, nil
}
