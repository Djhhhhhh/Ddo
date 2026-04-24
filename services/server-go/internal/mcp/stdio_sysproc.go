//go:build !windows

package mcp

import "os/exec"

func hideWindow(cmd *exec.Cmd) {
	// no-op on non-Windows platforms
}
