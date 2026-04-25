// Package cli provides the interactive REPL and command dispatch.
package cli

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/excel-api/excel-api-go/internal/client"
)

// Run starts the interactive REPL loop reading from stdin.
func Run(c *client.Client) {
	RunWithReader(c, os.Stdin)
}

// RunWithReader starts the REPL reading from the provided reader (used in tests).
func RunWithReader(c *client.Client, reader io.Reader) {
	fmt.Println("Excel API Go CLI - Interactive REPL Mode")
	fmt.Println("Type 'help' for available commands, 'exit' to quit")

	scanner := bufio.NewScanner(reader)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		line := scanner.Text()
		if line == "" {
			continue
		}
		if line == "exit" {
			fmt.Println("Goodbye!")
			return
		}
		if line == "help" {
			printHelp()
			continue
		}
		parts := strings.Fields(line)
		if len(parts) == 0 {
			continue
		}
		executeCommand(parts[0], parts[1:], c)
	}
	if scanner.Err() != nil {
		fmt.Fprintf(os.Stderr, "Error reading input: %v\n", scanner.Err())
	}
}

func printHelp() {
	fmt.Println("Available commands:")
	fmt.Println("  list-workbooks                    - List all workbooks")
	fmt.Println("  get-workbook <id>                - Get workbook details")
	fmt.Println("  get-cell <id> <sheet> <ref>       - Get a cell value")
	fmt.Println("  get-range <id> <sheet> <range>    - Get a range of cells")
	fmt.Println("  get-records <id> <sheet>          - Get records from a sheet")
	fmt.Println("  set-cell <id> <sheet> <ref> <val> - Set a cell value")
	fmt.Println("  add-record <id> <sheet> <json>    - Add a record")
	fmt.Println("  update-record <id> <sheet> <idx> <json> - Update a record")
	fmt.Println("  delete-record <id> <sheet> <idx>  - Delete a record")
	fmt.Println("  help                             - Show this help message")
	fmt.Println("  exit                             - Exit the REPL")
}

func executeCommand(command string, args []string, c *client.Client) {
	switch command {
	case "list-workbooks":
		result, err := c.ListWorkbooks()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Workbooks (%d):\n", result.Total)
		for _, wb := range result.Items {
			fmt.Printf("  - ID: %s, File: %s\n", wb.ID, wb.Filename)
		}
	case "get-workbook":
		if len(args) < 1 {
			fmt.Println("usage: get-workbook <id>")
			return
		}
		result, err := c.GetWorkbook(args[0])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Workbook:\n  ID: %s\n  File: %s\n  Readonly: %v\n  Modified: %s\n",
			result["id"], result["filename"], result["readonly"], result["modified_at"])
	case "get-cell":
		if len(args) < 3 {
			fmt.Println("usage: get-cell <id> <sheet> <ref>")
			return
		}
		result, err := c.GetCell(args[0], args[1], args[2], "native")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Cell %s:\n  Value: %v\n  Type: %s\n", args[2], result["value"], result["type"])
	case "get-range":
		if len(args) < 3 {
			fmt.Println("usage: get-range <id> <sheet> <range>")
			return
		}
		result, err := c.GetRange(args[0], args[1], args[2], "native")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Range %s:\n", args[2])
		for _, row := range result {
			fmt.Printf("  %v\n", row)
		}
	case "get-records":
		if len(args) < 2 {
			fmt.Println("usage: get-records <id> <sheet>")
			return
		}
		result, err := c.ListRecords(args[0], args[1], "native")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Records (%d total):\n", result.Total)
		for _, item := range result.Items {
			fmt.Printf("  [%d] %v\n", item.Index, item.Data)
		}
	case "set-cell":
		if len(args) < 4 {
			fmt.Println("usage: set-cell <id> <sheet> <ref> <val>")
			return
		}
		value := strings.Join(args[3:], " ")
		if _, err := c.SetCell(args[0], args[1], args[2], value); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Cell %s set to: %s\n", args[2], value)
	case "add-record":
		if len(args) < 3 {
			fmt.Println("usage: add-record <id> <sheet> <json>")
			return
		}
		if err := c.AddRecord(args[0], args[1], strings.Join(args[2:], " ")); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Record added to %s\n", args[1])
	case "update-record":
		if len(args) < 4 {
			fmt.Println("usage: update-record <id> <sheet> <idx> <json>")
			return
		}
		if err := c.UpdateRecord(args[0], args[1], args[2], strings.Join(args[3:], " ")); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Record [%s] updated in %s\n", args[2], args[1])
	case "delete-record":
		if len(args) < 3 {
			fmt.Println("usage: delete-record <id> <sheet> <idx>")
			return
		}
		if err := c.DeleteRecord(args[0], args[1], args[2]); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			return
		}
		fmt.Printf("Record [%s] deleted from %s\n", args[2], args[1])
	default:
		fmt.Printf("Unknown command: %s\n", command)
	}
}

// GenerateCompletion prints bash completion script to stdout.
func GenerateCompletion() {
	fmt.Println("# Bash completion for excel-api-go")
	fmt.Println("_excel_api_go_completion() {")
	fmt.Println("    local cur prev words cword")
	fmt.Println("    _init_completion || return")
	fmt.Println()
	fmt.Println("    case ${prev} in")
	fmt.Println("        --server)")
	fmt.Println("            COMPREPLY=( $(compgen -W \"http:// https://\" -- \"${cur}\") )")
	fmt.Println("            return")
	fmt.Println("            ;;")
	fmt.Println("        --format)")
	fmt.Println("            COMPREPLY=( $(compgen -W \"native display string csv markdown table\" -- \"${cur}\") )")
	fmt.Println("            return")
	fmt.Println("            ;;")
	fmt.Println("    esac")
	fmt.Println()
	fmt.Println("    if [[ ${cur} == -* ]]; then")
	fmt.Println("        COMPREPLY=( $(compgen -W \"--version --repl --complete --stats --list-workbooks --get-workbook --get-cell --get-range --list-records --get-record --set-cell --add-record --update-record --delete-record --format --server --token --profile\" -- \"${cur}\") )")
	fmt.Println("    fi")
	fmt.Println("}")
	fmt.Println()
	fmt.Println("complete -F _excel_api_go_completion excel-api-go")
	fmt.Println()
	fmt.Println("# To enable completion, run:")
	fmt.Println("# source <(excel-api-go --complete)")
}
