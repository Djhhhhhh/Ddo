package result

import (
	"errors"
	"testing"
)

func TestNewSuccess(t *testing.T) {
	data := "test data"
	result := NewSuccess(data)

	if !result.Success {
		t.Error("expected Success to be true")
	}

	if result.Data != data {
		t.Errorf("expected data %v, got %v", data, result.Data)
	}

	if result.Error != nil {
		t.Errorf("expected error nil, got %v", result.Error)
	}
}

func TestNewFailure(t *testing.T) {
	testErr := errors.New("test error")
	result := NewFailure[string](testErr)

	if result.Success {
		t.Error("expected Success to be false")
	}

	if result.Error != testErr {
		t.Errorf("expected error %v, got %v", testErr, result.Error)
	}

	// 验证 Data 为零值
	if result.Data != "" {
		t.Errorf("expected zero value for data, got %v", result.Data)
	}
}

func TestNewFailure_WithInt(t *testing.T) {
	testErr := errors.New("calculation failed")
	result := NewFailure[int](testErr)

	if result.Success {
		t.Error("expected Success to be false")
	}

	// 验证 Data 为零值 (0)
	if result.Data != 0 {
		t.Errorf("expected zero value (0) for data, got %v", result.Data)
	}
}

func TestNewFailure_WithStruct(t *testing.T) {
	type Person struct {
		Name string
		Age  int
	}

	testErr := errors.New("not found")
	result := NewFailure[Person](testErr)

	// 验证 Data 为零值（空 struct）
	if result.Data.Name != "" || result.Data.Age != 0 {
		t.Error("expected zero value for struct data")
	}
}

func TestResult_IsSuccess(t *testing.T) {
	tests := []struct {
		name     string
		result   *Result[string]
		expected bool
	}{
		{
			name:     "成功结果",
			result:   NewSuccess("data"),
			expected: true,
		},
		{
			name:     "失败结果",
			result:   NewFailure[string](errors.New("error")),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.result.IsSuccess() != tt.expected {
				t.Errorf("expected IsSuccess() = %v", tt.expected)
			}
		})
	}
}

func TestResult_WithPointerType(t *testing.T) {
	type User struct {
		ID   int
		Name string
	}

	user := &User{ID: 1, Name: "test"}
	result := NewSuccess(user)

	if !result.IsSuccess() {
		t.Error("expected success")
	}

	if result.Data.ID != 1 || result.Data.Name != "test" {
		t.Error("expected data to match")
	}
}

func TestResult_WithSliceType(t *testing.T) {
	data := []string{"a", "b", "c"}
	result := NewSuccess(data)

	if !result.IsSuccess() {
		t.Error("expected success")
	}

	if len(result.Data) != 3 {
		t.Errorf("expected length 3, got %d", len(result.Data))
	}
}

func TestResult_WithMapType(t *testing.T) {
	data := map[string]int{"a": 1, "b": 2}
	result := NewSuccess(data)

	if !result.IsSuccess() {
		t.Error("expected success")
	}

	if result.Data["a"] != 1 {
		t.Error("expected map value to match")
	}
}
