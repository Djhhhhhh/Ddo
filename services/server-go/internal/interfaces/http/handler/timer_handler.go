package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/application/usecase/timer"
	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// TimerHandler 定时任务处理器
type TimerHandler struct {
	createUseCase      timer.CreateTimerUseCase
	listUseCase        timer.ListTimerUseCase
	getUseCase         timer.GetTimerUseCase
	updateUseCase      timer.UpdateTimerUseCase
	pauseUseCase       timer.PauseTimerUseCase
	resumeUseCase      timer.ResumeTimerUseCase
	deleteUseCase      timer.DeleteTimerUseCase
	triggerUseCase     timer.TriggerTimerUseCase
	listLogsUseCase    timer.ListTimerLogsUseCase
	logger             *zap.Logger
}

// NewTimerHandler 创建定时任务处理器
func NewTimerHandler(
	createUseCase timer.CreateTimerUseCase,
	listUseCase timer.ListTimerUseCase,
	getUseCase timer.GetTimerUseCase,
	updateUseCase timer.UpdateTimerUseCase,
	pauseUseCase timer.PauseTimerUseCase,
	resumeUseCase timer.ResumeTimerUseCase,
	deleteUseCase timer.DeleteTimerUseCase,
	triggerUseCase timer.TriggerTimerUseCase,
	listLogsUseCase timer.ListTimerLogsUseCase,
	logger *zap.Logger,
) *TimerHandler {
	return &TimerHandler{
		createUseCase:   createUseCase,
		listUseCase:     listUseCase,
		getUseCase:      getUseCase,
		updateUseCase:   updateUseCase,
		pauseUseCase:    pauseUseCase,
		resumeUseCase:   resumeUseCase,
		deleteUseCase:   deleteUseCase,
		triggerUseCase:  triggerUseCase,
		listLogsUseCase: listLogsUseCase,
		logger:          logger.With(zap.String("handler", "timer")),
	}
}

// CreateTimer 创建定时任务
func (h *TimerHandler) CreateTimer(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.CreateTimerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.createUseCase.Execute(ctx, timer.CreateTimerInput{
		Name:            req.Name,
		Description:     req.Description,
		CronExpr:        req.CronExpr,
		Timezone:        req.Timezone,
		CallbackURL:     req.CallbackURL,
		CallbackMethod:  req.CallbackMethod,
		CallbackHeaders: req.CallbackHeaders,
		CallbackBody:    req.CallbackBody,
	})

	if !result.IsSuccess() {
		h.logger.Error("create timer failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	nextRunAt := ""
	if data.NextRunAt != nil {
		nextRunAt = data.NextRunAt.Format("2006-01-02T15:04:05Z07:00")
	}

	c.JSON(http.StatusOK, dto.CreateTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.CreateTimerData{
			UUID:      data.UUID,
			Name:      data.Name,
			Status:    data.Status,
			NextRunAt: nextRunAt,
		},
		Timestamp: time.Now(),
	})
}

// ListTimers 查询定时任务列表
func (h *TimerHandler) ListTimers(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.ListTimerRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.listUseCase.Execute(ctx, timer.ListTimerInput{
		Status:   req.Status,
		Page:     req.Page,
		PageSize: req.PageSize,
	})

	if !result.IsSuccess() {
		h.logger.Error("list timers failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	items := make([]dto.TimerItemDTO, 0, len(data.Items))
	for _, item := range data.Items {
		items = append(items, dto.TimerItemDTO{
			UUID:        item.UUID,
			Name:        item.Name,
			Description: item.Description,
			CronExpr:    item.CronExpr,
			Timezone:    item.Timezone,
			Status:      item.Status,
			LastRunAt:   item.LastRunAt,
			NextRunAt:   item.NextRunAt,
		})
	}

	c.JSON(http.StatusOK, dto.ListTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListTimerData{
			Total: data.Total,
			Items: items,
		},
		Timestamp: time.Now(),
	})
}

// GetTimer 获取定时任务详情
func (h *TimerHandler) GetTimer(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.getUseCase.Execute(ctx, timer.GetTimerInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("get timer failed", zap.Error(result.Error))
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Code:    404,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	t := data
	c.JSON(http.StatusOK, dto.GetTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.GetTimerData{
			Timer: dto.TimerDetailDTO{
				UUID:            t.UUID,
				Name:            t.Name,
				Description:     t.Description,
				CronExpr:        t.CronExpr,
				Timezone:        t.Timezone,
				CallbackURL:     t.CallbackURL,
				CallbackMethod:  t.CallbackMethod,
				CallbackHeaders: t.CallbackHeaders,
				CallbackBody:    t.CallbackBody,
				Status:          t.Status,
				LastRunAt:       timeToString(t.LastRunAt),
				NextRunAt:       timeToString(t.NextRunAt),
				Stats: dto.TimerStatsDTO{
					TotalRuns:   t.Stats.TotalRuns,
					SuccessRate: t.Stats.SuccessRate,
					AvgDuration: t.Stats.AvgDuration,
					LastStatus:  t.Stats.LastStatus,
				},
				CreatedAt: t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
				UpdatedAt: t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			},
		},
		Timestamp: time.Now(),
	})
}

// UpdateTimer 更新定时任务
func (h *TimerHandler) UpdateTimer(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	var req dto.UpdateTimerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.updateUseCase.Execute(ctx, timer.UpdateTimerInput{
		UUID:            uuid,
		Name:            req.Name,
		Description:     req.Description,
		CronExpr:        req.CronExpr,
		Timezone:        req.Timezone,
		CallbackURL:     req.CallbackURL,
		CallbackMethod:  req.CallbackMethod,
		CallbackHeaders: req.CallbackHeaders,
		CallbackBody:    req.CallbackBody,
	})

	if !result.IsSuccess() {
		h.logger.Error("update timer failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.UpdateTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.UpdateTimerData{
			UUID:   data.UUID,
			Name:   data.Name,
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

// PauseTimer 暂停定时任务
func (h *TimerHandler) PauseTimer(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.pauseUseCase.Execute(ctx, timer.PauseTimerInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("pause timer failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.PauseTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.PauseTimerData{
			UUID:   data.UUID,
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

// ResumeTimer 恢复定时任务
func (h *TimerHandler) ResumeTimer(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.resumeUseCase.Execute(ctx, timer.ResumeTimerInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("resume timer failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.ResumeTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.ResumeTimerData{
			UUID:   data.UUID,
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

// DeleteTimer 删除定时任务
func (h *TimerHandler) DeleteTimer(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.deleteUseCase.Execute(ctx, timer.DeleteTimerInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("delete timer failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.DeleteTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.DeleteTimerData{
			Success: data.Success,
		},
		Timestamp: time.Now(),
	})
}

// TriggerTimer 手动触发定时任务
func (h *TimerHandler) TriggerTimer(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.triggerUseCase.Execute(ctx, timer.TriggerTimerInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("trigger timer failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.TriggerTimerResponse{
		Code:    200,
		Message: "success",
		Data: dto.TriggerTimerData{
			UUID:   data.UUID,
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

// ListTimerLogs 查询定时任务日志
func (h *TimerHandler) ListTimerLogs(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	var req dto.ListTimerLogsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.listLogsUseCase.Execute(ctx, timer.ListTimerLogsInput{
		TimerUUID: uuid,
		Status:    req.Status,
		Page:      req.Page,
		PageSize:  req.PageSize,
	})

	if !result.IsSuccess() {
		h.logger.Error("list timer logs failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	items := make([]dto.TimerLogItemDTO, 0, len(data.Items))
	for _, item := range data.Items {
		items = append(items, dto.TimerLogItemDTO{
			ID:        item.ID,
			Status:    item.Status,
			Output:    item.Output,
			Error:     item.Error,
			Duration:  item.Duration,
			CreatedAt: item.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, dto.ListTimerLogsResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListTimerLogsData{
			Total: data.Total,
			Items: items,
		},
		Timestamp: time.Now(),
	})
}

// timeToString 将 *time.Time 转换为字符串
func timeToString(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02T15:04:05Z07:00")
}
