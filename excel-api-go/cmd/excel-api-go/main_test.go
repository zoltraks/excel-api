package main

import (
	"path/filepath"
	"runtime"
	"testing"
)

func TestResolveConfigPath(t *testing.T) {
	sep := string(filepath.Separator)
	isWindows := runtime.GOOS == "windows"

	tests := []struct {
		name       string
		workDir    string
		configPath string
		accessPath string
		isAccess   bool
		expected   string
	}{
		{
			name:       "absolute config path",
			workDir:    sep + "work",
			configPath: getAbsolutePath(isWindows, "absolute", "config.yaml"),
			accessPath: "",
			isAccess:   false,
			expected:   getAbsolutePath(isWindows, "absolute", "config.yaml"),
		},
		{
			name:       "relative config path with work dir",
			workDir:    sep + "work",
			configPath: "config.yaml",
			accessPath: "",
			isAccess:   false,
			expected:   sep + "work" + sep + "config.yaml",
		},
		{
			name:       "relative config path without work dir",
			workDir:    "",
			configPath: "config.yaml",
			accessPath: "",
			isAccess:   false,
			expected:   "config.yaml",
		},
		{
			name:       "work dir with default config",
			workDir:    sep + "work",
			configPath: "",
			accessPath: "",
			isAccess:   false,
			expected:   sep + "work" + sep + "config" + sep + "config.yaml",
		},
		{
			name:       "default config path",
			workDir:    "",
			configPath: "",
			accessPath: "",
			isAccess:   false,
			expected:   "config" + sep + "config.yaml",
		},
		{
			name:       "absolute access path",
			workDir:    sep + "work",
			configPath: "",
			accessPath: getAbsolutePath(isWindows, "absolute", "access.yaml"),
			isAccess:   true,
			expected:   getAbsolutePath(isWindows, "absolute", "access.yaml"),
		},
		{
			name:       "relative access path with work dir",
			workDir:    sep + "work",
			configPath: "",
			accessPath: "access.yaml",
			isAccess:   true,
			expected:   sep + "work" + sep + "access.yaml",
		},
		{
			name:       "relative access path without work dir",
			workDir:    "",
			configPath: "",
			accessPath: "access.yaml",
			isAccess:   true,
			expected:   "access.yaml",
		},
		{
			name:       "work dir with default access",
			workDir:    sep + "work",
			configPath: "",
			accessPath: "",
			isAccess:   true,
			expected:   sep + "work" + sep + "config" + sep + "access.yaml",
		},
		{
			name:       "default access path",
			workDir:    "",
			configPath: "",
			accessPath: "",
			isAccess:   true,
			expected:   "config" + sep + "access.yaml",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := resolveConfigPath(tt.workDir, tt.configPath, tt.accessPath, tt.isAccess)
			if result != tt.expected {
				t.Errorf("resolveConfigPath() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func getAbsolutePath(isWindows bool, dir, file string) string {
	sep := string(filepath.Separator)
	if isWindows {
		return "C:" + sep + dir + sep + file
	}
	return sep + dir + sep + file
}
