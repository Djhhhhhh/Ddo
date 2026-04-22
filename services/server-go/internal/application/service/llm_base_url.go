package service

import (
	"os"
	"strings"

	configinfra "github.com/ddo/server-go/internal/infrastructure/config"
)

const defaultLLMBaseURL = "http://127.0.0.1:50002"

func resolveLLMBaseURL() string {
	if baseURL := strings.TrimSpace(os.Getenv("DDO_LLM_HOST")); baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}

	loader := configinfra.NewViperLoader()
	cfg, err := loader.Load("")
	if err == nil {
		if baseURL := strings.TrimSpace(cfg.LLMPyURL); baseURL != "" {
			return strings.TrimRight(baseURL, "/")
		}
	}

	return defaultLLMBaseURL
}
