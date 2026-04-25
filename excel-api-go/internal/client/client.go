// Package client provides an HTTP client for the Excel API.
package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client communicates with an Excel API server instance.
type Client struct {
	baseURL    string
	httpClient *http.Client
	token      string
	authPrefix string
}

// NewClient creates a new API client for the given base URL and optional static token.
func NewClient(baseURL, token, authPrefix string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		token:      token,
		authPrefix: authPrefix,
	}
}

// ObtainToken performs an OAuth2 client_credentials flow and returns the Bearer token.
func ObtainToken(serverURL, clientID, clientSecret string) (string, error) {
	url := fmt.Sprintf("%s/auth/token", serverURL)
	data := fmt.Sprintf("grant_type=client_credentials&client_id=%s&client_secret=%s", clientID, clientSecret)
	req, err := http.NewRequest("POST", url, strings.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("error requesting token: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("server returned status: %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response: %v", err)
	}
	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("error parsing token response: %v", err)
	}
	return tokenResp.AccessToken, nil
}

// doRequest executes an HTTP request with the auth header and returns the response body.
func (c *Client) doRequest(method, path string, body io.Reader, contentType string) ([]byte, int, error) {
	req, err := http.NewRequest(method, c.baseURL+path, body)
	if err != nil {
		return nil, 0, fmt.Errorf("error creating request: %v", err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if c.token != "" {
		req.Header.Set("Authorization", c.authPrefix+" "+c.token)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("error executing request: %v", err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("error reading response: %v", err)
	}
	return b, resp.StatusCode, nil
}

// GetMetrics fetches the raw /metrics Prometheus text.
func (c *Client) GetMetrics() (string, error) {
	b, status, err := c.doRequest("GET", "/metrics", nil, "")
	if err != nil {
		return "", err
	}
	if status != http.StatusOK {
		return "", fmt.Errorf("server returned status: %d", status)
	}
	return string(b), nil
}

// ListWorkbooks returns the workbook list response.
func (c *Client) ListWorkbooks() (*WorkbookListResponse, error) {
	b, status, err := c.doRequest("GET", "/workbooks", nil, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result WorkbookListResponse
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return &result, nil
}

// GetWorkbook returns a single workbook by ID.
func (c *Client) GetWorkbook(id string) (map[string]interface{}, error) {
	b, status, err := c.doRequest("GET", "/workbooks/"+id, nil, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result map[string]interface{}
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return result, nil
}

// GetCell returns cell data for a given workbook/sheet/cell reference.
func (c *Client) GetCell(workbookID, sheetName, cellRef, format string) (map[string]interface{}, error) {
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/cells/%s?format=%s", workbookID, sheetName, cellRef, format)
	b, status, err := c.doRequest("GET", path, nil, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result map[string]interface{}
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return result, nil
}

// SetCell writes a value to a cell and returns the updated cell data.
func (c *Client) SetCell(workbookID, sheetName, cellRef string, value interface{}) (map[string]interface{}, error) {
	payload, err := json.Marshal(map[string]interface{}{"value": value})
	if err != nil {
		return nil, fmt.Errorf("error marshaling payload: %v", err)
	}
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/cells/%s", workbookID, sheetName, cellRef)
	b, status, err := c.doRequest("PUT", path, strings.NewReader(string(payload)), "application/json")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result map[string]interface{}
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return result, nil
}

// GetRange returns a 2D slice of cell data for a range reference.
func (c *Client) GetRange(workbookID, sheetName, rangeRef, format string) ([][]interface{}, error) {
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/ranges/%s?format=%s", workbookID, sheetName, rangeRef, format)
	b, status, err := c.doRequest("GET", path, nil, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result [][]interface{}
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return result, nil
}

// ListRecords returns the record list response for a sheet.
func (c *Client) ListRecords(workbookID, sheetName, format string) (*RecordListResponse, error) {
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/records?format=%s", workbookID, sheetName, format)
	b, status, err := c.doRequest("GET", path, nil, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result RecordListResponse
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return &result, nil
}

// GetRecord returns a single record by index.
func (c *Client) GetRecord(workbookID, sheetName, recordIndex, format string) (map[string]interface{}, error) {
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/records/%s?format=%s", workbookID, sheetName, recordIndex, format)
	b, status, err := c.doRequest("GET", path, nil, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("server returned status: %d", status)
	}
	var result map[string]interface{}
	if err := json.Unmarshal(b, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}
	return result, nil
}

// AddRecord adds a new record to a sheet.
func (c *Client) AddRecord(workbookID, sheetName string, data interface{}) error {
	payload, err := json.Marshal(map[string]interface{}{"data": data})
	if err != nil {
		return fmt.Errorf("error marshaling payload: %v", err)
	}
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/records", workbookID, sheetName)
	_, status, err := c.doRequest("POST", path, strings.NewReader(string(payload)), "application/json")
	if err != nil {
		return err
	}
	if status != http.StatusOK && status != http.StatusCreated {
		return fmt.Errorf("server returned status: %d", status)
	}
	return nil
}

// UpdateRecord updates a record by index.
func (c *Client) UpdateRecord(workbookID, sheetName, recordIndex string, data interface{}) error {
	payload, err := json.Marshal(map[string]interface{}{"data": data})
	if err != nil {
		return fmt.Errorf("error marshaling payload: %v", err)
	}
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/records/%s", workbookID, sheetName, recordIndex)
	_, status, err := c.doRequest("PUT", path, strings.NewReader(string(payload)), "application/json")
	if err != nil {
		return err
	}
	if status != http.StatusOK {
		return fmt.Errorf("server returned status: %d", status)
	}
	return nil
}

// DeleteRecord deletes a record by index.
func (c *Client) DeleteRecord(workbookID, sheetName, recordIndex string) error {
	path := fmt.Sprintf("/workbooks/%s/sheets/%s/records/%s", workbookID, sheetName, recordIndex)
	_, status, err := c.doRequest("DELETE", path, nil, "")
	if err != nil {
		return err
	}
	if status != http.StatusNoContent && status != http.StatusOK {
		return fmt.Errorf("server returned status: %d", status)
	}
	return nil
}
