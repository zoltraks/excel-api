package client

import (
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	client := NewClient("http://localhost:8443")
	if client == nil {
		t.Error("Expected client to be created")
	}
	if client.baseURL != "http://localhost:8443" {
		t.Errorf("Expected baseURL to be http://localhost:8443, got %s", client.baseURL)
	}
	if client.httpClient == nil {
		t.Error("Expected httpClient to be initialized")
	}
}

func TestNewClientTimeout(t *testing.T) {
	client := NewClient("http://localhost:8443")
	if client.httpClient.Timeout != 30*time.Second {
		t.Errorf("Expected timeout to be 30s, got %v", client.httpClient.Timeout)
	}
}

func TestNewClientEmptyURL(t *testing.T) {
	client := NewClient("")
	if client == nil {
		t.Error("Expected client to be created even with empty URL")
	}
}

func TestNewClientHTTPS(t *testing.T) {
	client := NewClient("https://api.example.com")
	if client.baseURL != "https://api.example.com" {
		t.Errorf("Expected baseURL to be https://api.example.com, got %s", client.baseURL)
	}
}
