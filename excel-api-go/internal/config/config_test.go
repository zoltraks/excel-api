package config

import "testing"

func TestConfigInstantiation(t *testing.T) {
	cfg := Config{}
	if cfg.Profiles == nil {
		cfg.Profiles = make(map[string]Profile)
	}
	if cfg.Profiles == nil {
		t.Error("Expected Profiles to be initialized")
	}
}

func TestProfileInstantiation(t *testing.T) {
	profile := Profile{
		URL:  "http://localhost:8443/api/v1",
		Auth: "static-token",
	}
	if profile.URL == "" {
		t.Error("Expected URL to be set")
	}
	if profile.Auth == "" {
		t.Error("Expected Auth to be set")
	}
}

func TestConfigWithProfiles(t *testing.T) {
	cfg := Config{
		Profiles: map[string]Profile{
			"default": {
				URL:  "http://localhost:8443/api/v1",
				Auth: "static-token",
			},
		},
	}
	if len(cfg.Profiles) != 1 {
		t.Errorf("Expected 1 profile, got %d", len(cfg.Profiles))
	}
}

func TestProfileEmpty(t *testing.T) {
	profile := Profile{}
	if profile.URL != "" {
		t.Error("Expected URL to be empty")
	}
	if profile.Auth != "" {
		t.Error("Expected Auth to be empty")
	}
}

func TestConfigDefaultProfile(t *testing.T) {
	cfg := Config{
		Profiles: map[string]Profile{
			"default": {
				URL: "http://localhost:8443/api/v1",
			},
		},
	}
	profile, ok := cfg.Profiles["default"]
	if !ok {
		t.Error("Expected default profile to exist")
	}
	if profile.URL != "http://localhost:8443/api/v1" {
		t.Errorf("Expected URL to be http://localhost:8443/api/v1, got %s", profile.URL)
	}
}
