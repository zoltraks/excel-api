package config

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
