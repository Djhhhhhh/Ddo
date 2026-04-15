package common

import (
	"errors"
	"testing"
)

func TestNewDomainError(t *testing.T) {
	err := NewDomainError("TEST_CODE", "test message")

	if err.Code != "TEST_CODE" {
		t.Errorf("expected code TEST_CODE, got %s", err.Code)
	}

	if err.Message != "test message" {
		t.Errorf("expected message 'test message', got %s", err.Message)
	}
}

func TestDomainError_Error(t *testing.T) {
	err := NewDomainError("TEST_CODE", "test message")

	if err.Error() != "test message" {
		t.Errorf("expected Error() to return 'test message', got %s", err.Error())
	}
}

func TestIsDomainError(t *testing.T) {
	// 测试预定义错误
	tests := []struct {
		name     string
		err      error
		target   DomainError
		expected bool
	}{
		{
			name:     "匹配 ErrEntityNotFound",
			err:      ErrEntityNotFound,
			target:   ErrEntityNotFound,
			expected: true,
		},
		{
			name:     "匹配 ErrInvalidState",
			err:      ErrInvalidState,
			target:   ErrInvalidState,
			expected: true,
		},
		{
			name:     "不匹配不同错误",
			err:      ErrEntityNotFound,
			target:   ErrInvalidState,
			expected: false,
		},
		{
			name:     "非 DomainError 类型",
			err:      errors.New("some error"),
			target:   ErrEntityNotFound,
			expected: false,
		},
		{
			name:     "nil 错误",
			err:      nil,
			target:   ErrEntityNotFound,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsDomainError(tt.err, tt.target)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestPredefinedErrors(t *testing.T) {
	// 验证预定义错误码
	tests := []struct {
		err  DomainError
		code string
	}{
		{ErrEntityNotFound, "ENTITY_NOT_FOUND"},
		{ErrInvalidState, "INVALID_STATE"},
		{ErrInvalidArgument, "INVALID_ARGUMENT"},
		{ErrDuplicate, "DUPLICATE"},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			if tt.err.Code != tt.code {
				t.Errorf("expected code %s, got %s", tt.code, tt.err.Code)
			}
		})
	}
}
