// Package client provides an HTTP client for the Excel API.
package client

import (
	"net/http"
	"time"
)

// Client communicates with an Excel API server instance.
type Client struct {
	baseURL    string
	httpClient *http.Client
	token      string
}

// NewClient creates a new API client for the given base URL.
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}
