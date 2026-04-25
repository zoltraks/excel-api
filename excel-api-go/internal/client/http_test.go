package client

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
