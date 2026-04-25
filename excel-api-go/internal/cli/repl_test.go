package cli

import (
	"strings"
	"testing"
)

func TestPrintHelp(t *testing.T) {
	// Verify printHelp runs without panic
	printHelp()
}

func TestGenerateCompletion(t *testing.T) {
	// Verify GenerateCompletion runs without panic
	GenerateCompletion()
}

func TestExecuteCommandUnknown(t *testing.T) {
	// executeCommand with unknown command should not panic
	executeCommand("nonexistent-command", nil, nil)
}

func TestExecuteCommandUsageMessages(t *testing.T) {
	tests := []struct {
		cmd  string
		args []string
	}{
		{"get-workbook", []string{}},
		{"get-cell", []string{"id"}},
		{"get-range", []string{"id"}},
		{"get-records", []string{"id"}},
		{"set-cell", []string{"id", "sheet"}},
		{"add-record", []string{"id"}},
		{"update-record", []string{"id", "sheet"}},
		{"delete-record", []string{"id"}},
	}
	for _, tt := range tests {
		t.Run(tt.cmd, func(t *testing.T) {
			// Should not panic — prints usage message
			executeCommand(tt.cmd, tt.args, nil)
		})
	}
}

func TestRunWithReaderExit(t *testing.T) {
	input := strings.NewReader("exit\n")
	// Should run and exit cleanly without blocking
	RunWithReader(nil, input)
}

func TestRunWithReaderHelp(t *testing.T) {
	input := strings.NewReader("help\nexit\n")
	RunWithReader(nil, input)
}

func TestRunWithReaderEmpty(t *testing.T) {
	input := strings.NewReader("\nexit\n")
	RunWithReader(nil, input)
}
