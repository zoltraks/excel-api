package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config holds CLI configuration including server profiles.
type Config struct {
	Profiles       map[string]Profile `yaml:"profiles"`
	DefaultProfile string             `yaml:"default_profile"`
}

// Profile holds connection settings for a single server.
type Profile struct {
	URL      string `yaml:"url"`
	Auth     string `yaml:"auth"`
	ClientID string `yaml:"client_id"`
	Token    string `yaml:"token"`
}

// JSONProfile holds a profile as stored in a JSON profiles file.
type JSONProfile struct {
	Name  string `json:"name"`
	URL   string `json:"url"`
	Token string `json:"token"`
}

// JSONProfileConfig is the root object of a profiles JSON file.
type JSONProfileConfig struct {
	Profiles map[string]JSONProfile `json:"profiles"`
}

// ResolveConfigPath resolves the path to config.yaml or access.yaml given CLI args.
func ResolveConfigPath(workDir, configPath, accessPath string, isAccess bool) string {
	targetPath := configPath
	if isAccess {
		targetPath = accessPath
	}
	defaultFileName := "config.yaml"
	if isAccess {
		defaultFileName = "access.yaml"
	}
	if targetPath != "" {
		if workDir != "" && !filepath.IsAbs(targetPath) {
			return filepath.Join(workDir, targetPath)
		}
		return targetPath
	}
	if workDir != "" {
		return filepath.Join(workDir, "config", defaultFileName)
	}
	return filepath.Join("config", defaultFileName)
}

// LoadProfile reads a JSON profiles file and returns the URL and token for a named profile.
func LoadProfile(profileName, workDir, configPath, accessPath string) (string, string) {
	resolvedConfigPath := ResolveConfigPath(workDir, configPath, accessPath, false)
	data, err := os.ReadFile(resolvedConfigPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading profile file: %v\n", err)
		return "", ""
	}
	var cfg JSONProfileConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing profile file: %v\n", err)
		return "", ""
	}
	profile, ok := cfg.Profiles[profileName]
	if !ok {
		fmt.Fprintf(os.Stderr, "Profile '%s' not found\n", profileName)
		return "", ""
	}
	return profile.URL, profile.Token
}
