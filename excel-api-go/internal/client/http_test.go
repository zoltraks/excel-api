package client

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestObtainToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/token" || r.Method != "POST" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token",
			"token_type":   "Bearer",
		})
	}))
	defer srv.Close()

	token, err := ObtainToken(srv.URL, "id", "secret")
	if err != nil {
		t.Fatalf("ObtainToken returned error: %v", err)
	}
	if token != "test-token" {
		t.Errorf("Expected 'test-token', got %q", token)
	}
}

func TestObtainTokenError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	_, err := ObtainToken(srv.URL, "bad", "creds")
	if err == nil {
		t.Error("Expected error for 401 response")
	}
}

func TestListWorkbooks(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/workbooks" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(WorkbookListResponse{
			Items: []WorkbookItem{{ID: "wb1", Filename: "/data/wb1.xlsx"}},
			Total: 1,
		})
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "", "Token")
	result, err := c.ListWorkbooks()
	if err != nil {
		t.Fatalf("ListWorkbooks returned error: %v", err)
	}
	if result.Total != 1 {
		t.Errorf("Expected total=1, got %d", result.Total)
	}
	if result.Items[0].ID != "wb1" {
		t.Errorf("Expected ID='wb1', got %q", result.Items[0].ID)
	}
}

func TestGetWorkbook(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":       "wb1",
			"filename": "/data/wb1.xlsx",
			"readonly": false,
		})
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "tok", "Token")
	result, err := c.GetWorkbook("wb1")
	if err != nil {
		t.Fatalf("GetWorkbook returned error: %v", err)
	}
	if result["id"] != "wb1" {
		t.Errorf("Expected id='wb1', got %v", result["id"])
	}
}

func TestGetWorkbookAuthHeader(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		json.NewEncoder(w).Encode(map[string]interface{}{"id": "wb1"})
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "my-token", "Bearer")
	c.GetWorkbook("wb1")
	if gotAuth != "Bearer my-token" {
		t.Errorf("Expected 'Bearer my-token', got %q", gotAuth)
	}
}

func TestGetCell(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"value": "hello",
			"type":  "string",
		})
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "", "Token")
	result, err := c.GetCell("wb1", "Sheet1", "A1", "native")
	if err != nil {
		t.Fatalf("GetCell returned error: %v", err)
	}
	if result["value"] != "hello" {
		t.Errorf("Expected value='hello', got %v", result["value"])
	}
}

func TestGetMetrics(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("# metrics\nuptime 42\n"))
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "", "Token")
	result, err := c.GetMetrics()
	if err != nil {
		t.Fatalf("GetMetrics returned error: %v", err)
	}
	if result == "" {
		t.Error("Expected non-empty metrics response")
	}
}

func TestDeleteRecord(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "", "Token")
	if err := c.DeleteRecord("wb1", "Sheet1", "1"); err != nil {
		t.Fatalf("DeleteRecord returned error: %v", err)
	}
}

func TestObtainTokenFormEncodesCredentials(t *testing.T) {
	var gotSecret string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		gotSecret = r.PostForm.Get("client_secret")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "ok-token",
			"token_type":   "Bearer",
		})
	}))
	defer srv.Close()

	if _, err := ObtainToken(srv.URL, "id&x=1", "sec&ret=p%"); err != nil {
		t.Fatalf("ObtainToken returned error: %v", err)
	}
	if gotSecret != "sec&ret=p%" {
		t.Errorf("Expected secret 'sec&ret=p%%', got %q", gotSecret)
	}
}

func TestObtainTokenTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {} // hang forever — client timeout must fire
	}))
	defer srv.Close()

	prev := tokenHTTPClient.Timeout
	tokenHTTPClient.Timeout = 50 // 50ms for the test
	defer func() { tokenHTTPClient.Timeout = prev }()

	_, err := ObtainToken(srv.URL, "id", "secret")
	if err == nil {
		t.Fatal("Expected timeout error for hanging server")
	}
}

func TestPathSegmentsAreEscaped(t *testing.T) {
	var gotPath string
	var gotRawQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.EscapedPath()
		gotRawQuery = r.URL.RawQuery
		json.NewEncoder(w).Encode(RecordListResponse{})
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "", "Token")
	if _, err := c.ListRecords("wb id", "Sheet 1/Extra", "a b"); err != nil {
		t.Fatalf("ListRecords returned error: %v", err)
	}
	wantPath := "/workbooks/wb%20id/sheets/Sheet%201%2FExtra/records"
	if gotPath != wantPath {
		t.Errorf("Expected path %q, got %q", wantPath, gotPath)
	}
	if gotRawQuery != (url.Values{"format": []string{"a b"}}).Encode() {
		t.Errorf("Expected escaped format query, got %q", gotRawQuery)
	}
}
