// Package format provides output formatters for Markdown, CSV, JSON, and plain text tables.
package format

import (
	"fmt"
	"strings"
)

// AsCSV formats a slice of string-keyed maps as CSV text.
func AsCSV(data []map[string]interface{}) string {
	if len(data) == 0 {
		return ""
	}
	headers := make([]string, 0, len(data[0]))
	for key := range data[0] {
		headers = append(headers, key)
	}
	csv := strings.Join(headers, ",") + "\n"
	for _, row := range data {
		values := make([]string, len(headers))
		for i, key := range headers {
			values[i] = fmt.Sprintf("%v", row[key])
		}
		csv += strings.Join(values, ",") + "\n"
	}
	return csv
}

// AsMarkdown formats a slice of string-keyed maps as a Markdown table.
func AsMarkdown(data []map[string]interface{}) string {
	if len(data) == 0 {
		return ""
	}
	headers := make([]string, 0, len(data[0]))
	for key := range data[0] {
		headers = append(headers, key)
	}
	md := "| " + strings.Join(headers, " | ") + " |\n"
	md += "|" + strings.Repeat("---|", len(headers)) + "\n"
	for _, row := range data {
		values := make([]string, len(headers))
		for i, key := range headers {
			values[i] = fmt.Sprintf("%v", row[key])
		}
		md += "| " + strings.Join(values, " | ") + " |\n"
	}
	return md
}

// AsTable formats a slice of string-keyed maps as a fixed-width plain-text table.
func AsTable(data []map[string]interface{}) string {
	if len(data) == 0 {
		return ""
	}
	headers := make([]string, 0, len(data[0]))
	colWidths := make(map[string]int)
	for key := range data[0] {
		headers = append(headers, key)
		colWidths[key] = len(key)
	}
	for _, row := range data {
		for key, val := range row {
			valStr := fmt.Sprintf("%v", val)
			if len(valStr) > colWidths[key] {
				colWidths[key] = len(valStr)
			}
		}
	}
	var sb strings.Builder
	for i, key := range headers {
		fmt.Fprintf(&sb, "%-*s", colWidths[key], key)
		if i < len(headers)-1 {
			sb.WriteString("  ")
		}
	}
	sb.WriteString("\n")
	for i, key := range headers {
		sb.WriteString(strings.Repeat("-", colWidths[key]))
		if i < len(headers)-1 {
			sb.WriteString("  ")
		}
	}
	sb.WriteString("\n")
	for _, row := range data {
		for i, key := range headers {
			valStr := fmt.Sprintf("%v", row[key])
			fmt.Fprintf(&sb, "%-*s", colWidths[key], valStr)
			if i < len(headers)-1 {
				sb.WriteString("  ")
			}
		}
		sb.WriteString("\n")
	}
	return sb.String()
}
