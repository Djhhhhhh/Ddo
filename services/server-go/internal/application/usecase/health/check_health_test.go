package health

import (
	"context"
	"testing"
)

func TestNewUseCase(t *testing.T) {
	uc := NewUseCase("v1.0.0")
	if uc == nil {
		t.Fatal("expected usecase to not be nil")
	}
}

func TestUseCase_Execute_Success(t *testing.T) {
	uc := NewUseCase("v1.0.0")
	ctx := context.Background()
	input := CheckHealthInput{}

	result := uc.Execute(ctx, input)

	// 验证结果成功
	if !result.IsSuccess() {
		t.Error("expected result to be successful")
	}

	// 验证输出数据
	output := result.Data
	if output.Status != "healthy" {
		t.Errorf("expected status 'healthy', got %s", output.Status)
	}

	if output.Version != "v1.0.0" {
		t.Errorf("expected version 'v1.0.0', got %s", output.Version)
	}

	// 验证时间戳已设置
	if output.Timestamp.IsZero() {
		t.Error("expected timestamp to be set")
	}
}

func TestUseCase_VersionInjection(t *testing.T) {
	testCases := []string{
		"v1.0.0",
		"v2.0.0-beta",
		"dev",
		"1.0.0-alpha+build123",
	}

	for _, version := range testCases {
		t.Run("version_"+version, func(t *testing.T) {
			uc := NewUseCase(version)
			ctx := context.Background()
			input := CheckHealthInput{}

			result := uc.Execute(ctx, input)

			if result.Data.Version != version {
				t.Errorf("expected version %s, got %s", version, result.Data.Version)
			}
		})
	}
}

func TestUseCase_Execute_WithCanceledContext(t *testing.T) {
	uc := NewUseCase("v1.0.0")
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // 立即取消

	input := CheckHealthInput{}
	result := uc.Execute(ctx, input)

	// 当前实现不检查 context，所以预期仍然是成功
	// 如果将来实现检查 context，这里需要更新
	if !result.IsSuccess() {
		t.Log("Note: Execute currently does not check context cancellation")
	}
}

func TestUseCase_Execute_MultipleCalls(t *testing.T) {
	uc := NewUseCase("v1.0.0")
	ctx := context.Background()

	// 多次调用应该返回类似的结果
	for i := 0; i < 3; i++ {
		result := uc.Execute(ctx, CheckHealthInput{})

		if !result.IsSuccess() {
			t.Errorf("call %d: expected success", i)
		}

		if result.Data.Status != "healthy" {
			t.Errorf("call %d: expected healthy status", i)
		}
	}
}

func TestCheckHealthInput_Empty(t *testing.T) {
	// CheckHealthInput 是空结构，用于未来扩展
	input := CheckHealthInput{}

	// 验证它可以使用
	uc := NewUseCase("v1.0.0")
	result := uc.Execute(context.Background(), input)

	if !result.IsSuccess() {
		t.Error("expected success with empty input")
	}
}

func TestCheckHealthOutput_Fields(t *testing.T) {
	// 验证输出字段类型
	output := CheckHealthOutput{
		Status:  "healthy",
		Version: "test",
		// Timestamp 默认为零值
	}

	if output.Status != "healthy" {
		t.Error("unexpected status")
	}

	// 验证 Timestamp 是零值
	if !output.Timestamp.IsZero() {
		t.Error("expected zero timestamp for default struct")
	}

	// Status 类型是 string
	var _ string = output.Status
}
