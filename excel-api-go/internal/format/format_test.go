package format

import (
	"strings"
	"testing"
)

var testData = []map[string]interface{}{
	{"name": "Alice", "age": 30},
	{"name": "Bob", "age": 25},
}

func TestAsCSVEmpty(t *testing.T) {
	result := AsCSV(nil)
	if result != "" {
		t.Errorf("Expected empty string for nil input, got %q", result)
	}
}

func TestAsCSVHeaders(t *testing.T) {
	result := AsCSV(testData)
	lines := strings.Split(strings.TrimRight(result, "\n"), "\n")
	if len(lines) < 3 {
		t.Errorf("Expected at least 3 lines (header + 2 rows), got %d", len(lines))
	}
}

func TestAsCSVContainsValues(t *testing.T) {
	result := AsCSV(testData)
	if !strings.Contains(result, "Alice") {
		t.Error("Expected CSV to contain 'Alice'")
	}
	if !strings.Contains(result, "Bob") {
		t.Error("Expected CSV to contain 'Bob'")
	}
}

func TestAsMarkdownEmpty(t *testing.T) {
	result := AsMarkdown(nil)
	if result != "" {
		t.Errorf("Expected empty string for nil input, got %q", result)
	}
}

func TestAsMarkdownHasPipes(t *testing.T) {
	result := AsMarkdown(testData)
	if !strings.Contains(result, "|") {
		t.Error("Expected Markdown table to contain '|'")
	}
}

func TestAsMarkdownHasSeparator(t *testing.T) {
	result := AsMarkdown(testData)
	if !strings.Contains(result, "---") {
		t.Error("Expected Markdown table to contain '---' separator")
	}
}

func TestAsMarkdownContainsValues(t *testing.T) {
	result := AsMarkdown(testData)
	if !strings.Contains(result, "Alice") {
		t.Error("Expected Markdown table to contain 'Alice'")
	}
}

func TestAsTableEmpty(t *testing.T) {
	result := AsTable(nil)
	if result != "" {
		t.Errorf("Expected empty string for nil input, got %q", result)
	}
}

func TestAsTableHasHeaders(t *testing.T) {
	result := AsTable(testData)
	if !strings.Contains(result, "name") && !strings.Contains(result, "age") {
		t.Error("Expected table to contain column headers")
	}
}

func TestAsTableContainsValues(t *testing.T) {
	result := AsTable(testData)
	if !strings.Contains(result, "Alice") {
		t.Error("Expected table to contain 'Alice'")
	}
	if !strings.Contains(result, "Bob") {
		t.Error("Expected table to contain 'Bob'")
	}
}

func TestAsTableHasSeparatorLine(t *testing.T) {
	result := AsTable(testData)
	if !strings.Contains(result, "----") {
		t.Error("Expected table to contain separator line of dashes")
	}
}
