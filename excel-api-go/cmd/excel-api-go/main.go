// Excel API Go — Command-line client

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var version = "0.0.1"

func main() {
	ver := flag.Bool("version", false, "Print version and exit")
	repl := flag.Bool("repl", false, "Start interactive REPL mode")
	complete := flag.Bool("complete", false, "Generate shell completion")
	stats := flag.Bool("stats", false, "Show server statistics")
	listWorkbooks := flag.Bool("list-workbooks", false, "List all workbooks")
	getWorkbook := flag.String("get-workbook", "", "Get workbook by ID")
	getCell := flag.String("get-cell", "", "Get cell (format: workbookId:sheetName:cellRef)")
	getRange := flag.String("get-range", "", "Get range (format: workbookId:sheetName:rangeRef)")
	listRecords := flag.String("list-records", "", "List records (format: workbookId:sheetName)")
	getRecord := flag.String("get-record", "", "Get record (format: workbookId:sheetName:recordIndex)")
	setCell := flag.String("set-cell", "", "Set cell (format: workbookId:sheetName:cellRef:value)")
	addRecord := flag.String("add-record", "", "Add record (format: workbookId:sheetName:json)")
	updateRecord := flag.String("update-record", "", "Update record (format: workbookId:sheetName:recordIndex:json)")
	deleteRecord := flag.String("delete-record", "", "Delete record (format: workbookId:sheetName:recordIndex)")
	format := flag.String("format", "native", "Output format (native/display/string/csv/markdown/table)")
	serverUrl := flag.String("server", "http://localhost:8443/api/v1", "Server URL")
	token := flag.String("token", "", "Auth token")
	profile := flag.String("profile", "", "Connection profile (from ~/.excel-api/profiles.json)")
	workDir := flag.String("work", "", "Working directory for config files")
	configPath := flag.String("config", "", "Path to config.yaml")
	accessPath := flag.String("access", "", "Path to access.yaml")
	flag.Parse()

	// Load connection profile if specified
	if *profile != "" {
		// Check environment variables as fallback
		workDirEnv := *workDir
		if workDirEnv == "" {
			workDirEnv = os.Getenv("WORK")
		}
		configPathEnv := *configPath
		if configPathEnv == "" {
			configPathEnv = os.Getenv("CONFIG")
		}
		accessPathEnv := *accessPath
		if accessPathEnv == "" {
			accessPathEnv = os.Getenv("ACCESS")
		}

		profileServerUrl, profileToken := loadProfile(*profile, workDirEnv, configPathEnv, accessPathEnv)
		if profileServerUrl != "" {
			serverUrl = &profileServerUrl
		}
		if profileToken != "" {
			token = &profileToken
		}
	}

	if *ver {
		fmt.Printf("Excel API Go CLI v%s\n", version)
		return
	}

	if *complete {
		generateCompletion()
		return
	}

	if *repl {
		runREPL(*serverUrl, *token)
		return
	}

	if *stats {
		showStatistics(*serverUrl)
		return
	}

	if *listWorkbooks {
		listWorkbooksCmd(*serverUrl)
		return
	}

	if *getWorkbook != "" {
		getWorkbookCmd(*serverUrl, *getWorkbook)
		return
	}

	if *getCell != "" {
		parts := strings.Split(*getCell, ":")
		if len(parts) != 3 {
			fmt.Fprintf(os.Stderr, "Invalid cell format. Expected: workbookId:sheetName:cellRef\n")
			os.Exit(1)
		}
		getCellCmd(*serverUrl, parts[0], parts[1], parts[2], *format)
		return
	}

	if *getRange != "" {
		parts := strings.Split(*getRange, ":")
		if len(parts) != 3 {
			fmt.Fprintf(os.Stderr, "Invalid range format. Expected: workbookId:sheetName:rangeRef\n")
			os.Exit(1)
		}
		getRangeCmd(*serverUrl, parts[0], parts[1], parts[2], *format)
		return
	}

	if *listRecords != "" {
		parts := strings.Split(*listRecords, ":")
		if len(parts) != 2 {
			fmt.Fprintf(os.Stderr, "Invalid records format. Expected: workbookId:sheetName\n")
			os.Exit(1)
		}
		listRecordsCmd(*serverUrl, parts[0], parts[1], *format)
		return
	}

	if *getRecord != "" {
		parts := strings.Split(*getRecord, ":")
		if len(parts) != 3 {
			fmt.Fprintf(os.Stderr, "Invalid record format. Expected: workbookId:sheetName:recordIndex\n")
			os.Exit(1)
		}
		getRecordCmd(*serverUrl, parts[0], parts[1], parts[2], *format, *token)
		return
	}

	if *setCell != "" {
		parts := strings.Split(*setCell, ":")
		if len(parts) != 4 {
			fmt.Fprintf(os.Stderr, "Invalid set-cell format. Expected: workbookId:sheetName:cellRef:value\n")
			os.Exit(1)
		}
		setCellCmd(*serverUrl, parts[0], parts[1], parts[2], parts[3], *token)
		return
	}

	if *addRecord != "" {
		parts := strings.SplitN(*addRecord, ":", 3)
		if len(parts) != 3 {
			fmt.Fprintf(os.Stderr, "Invalid add-record format. Expected: workbookId:sheetName:json\n")
			os.Exit(1)
		}
		addRecordCmd(*serverUrl, parts[0], parts[1], parts[2], *token)
		return
	}

	if *updateRecord != "" {
		parts := strings.SplitN(*updateRecord, ":", 4)
		if len(parts) != 4 {
			fmt.Fprintf(os.Stderr, "Invalid update-record format. Expected: workbookId:sheetName:recordIndex:json\n")
			os.Exit(1)
		}
		updateRecordCmd(*serverUrl, parts[0], parts[1], parts[2], parts[3], *token)
		return
	}

	if *deleteRecord != "" {
		parts := strings.Split(*deleteRecord, ":")
		if len(parts) != 3 {
			fmt.Fprintf(os.Stderr, "Invalid delete-record format. Expected: workbookId:sheetName:recordIndex\n")
			os.Exit(1)
		}
		deleteRecordCmd(*serverUrl, parts[0], parts[1], parts[2], *token)
		return
	}

	fmt.Println("Excel API Go CLI - Use --help for options")
}

func showStatistics(serverUrl string) {
	resp, err := http.Get(fmt.Sprintf("%s/metrics", serverUrl))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching metrics: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Server Statistics:")
	fmt.Println("==================")
	fmt.Println(string(body))
}

func listWorkbooksCmd(serverUrl string) {
	resp, err := http.Get(fmt.Sprintf("%s/workbooks", serverUrl))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching workbooks: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	var result struct {
		Items []map[string]interface{} `json:"items"`
		Total int                      `json:"total"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Workbooks (%d):\n", result.Total)
	for _, wb := range result.Items {
		fmt.Printf("  - ID: %s, File: %s\n", wb["id"], wb["filename"])
	}
}

func getWorkbookCmd(serverUrl, id string) {
	resp, err := http.Get(fmt.Sprintf("%s/workbooks/%s", serverUrl, id))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching workbook: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Workbook:\n")
	fmt.Printf("  ID: %s\n", result["id"])
	fmt.Printf("  File: %s\n", result["filename"])
	fmt.Printf("  Readonly: %v\n", result["readonly"])
	fmt.Printf("  Modified: %s\n", result["modified_at"])
}

func getCellCmd(serverUrl, workbookId, sheetName, cellRef, format string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/cells/%s?format=%s", serverUrl, workbookId, sheetName, cellRef, format)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching cell: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Cell %s:\n", cellRef)
	fmt.Printf("  Value: %v\n", result["value"])
	fmt.Printf("  Type: %s\n", result["type"])
}

func getRangeCmd(serverUrl, workbookId, sheetName, rangeRef, format string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/ranges/%s?format=%s", serverUrl, workbookId, sheetName, rangeRef, format)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching range: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	var result [][]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Range %s:\n", rangeRef)
	for _, row := range result {
		fmt.Printf("  %v\n", row)
	}
}

func listRecordsCmd(serverUrl, workbookId, sheetName, format string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/records?format=%s", serverUrl, workbookId, sheetName, format)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching records: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	var result struct {
		Items  []map[string]interface{} `json:"items"`
		Total  int                      `json:"total"`
		Offset int                      `json:"offset"`
		Limit  int                      `json:"limit"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Records (%d total, offset %d, limit %d):\n", result.Total, result.Offset, result.Limit)
	for _, item := range result.Items {
		fmt.Printf("  [%d] %v\n", item["index"], item["data"])
	}
}

func getRecordCmd(serverUrl, workbookId, sheetName, recordIndex, format, token string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/records/%s?format=%s", serverUrl, workbookId, sheetName, recordIndex, format)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating request: %v\n", err)
		os.Exit(1)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching record: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Record [%d]:\n", result["index"])
	fmt.Printf("  Data: %v\n", result["data"])
}

func setCellCmd(serverUrl, workbookId, sheetName, cellRef, value, token string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/cells/%s", serverUrl, workbookId, sheetName, cellRef)
	payload := map[string]interface{}{"value": value}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling payload: %v\n", err)
		os.Exit(1)
	}

	req, err := http.NewRequest("PUT", url, strings.NewReader(string(jsonData)))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error setting cell: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	fmt.Printf("Cell %s set to: %s\n", cellRef, value)
}

func addRecordCmd(serverUrl, workbookId, sheetName, jsonData, token string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/records", serverUrl, workbookId, sheetName)
	payload := map[string]interface{}{"data": jsonData}
	reqBody, err := json.Marshal(payload)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling payload: %v\n", err)
		os.Exit(1)
	}

	req, err := http.NewRequest("POST", url, strings.NewReader(string(reqBody)))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error adding record: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	fmt.Printf("Record added to %s\n", sheetName)
}

func updateRecordCmd(serverUrl, workbookId, sheetName, recordIndex, jsonData, token string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/records/%s", serverUrl, workbookId, sheetName, recordIndex)
	payload := map[string]interface{}{"data": jsonData}
	reqBody, err := json.Marshal(payload)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling payload: %v\n", err)
		os.Exit(1)
	}

	req, err := http.NewRequest("PUT", url, strings.NewReader(string(reqBody)))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error updating record: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	fmt.Printf("Record [%s] updated in %s\n", recordIndex, sheetName)
}

func deleteRecordCmd(serverUrl, workbookId, sheetName, recordIndex, token string) {
	url := fmt.Sprintf("%s/workbooks/%s/sheets/%s/records/%s", serverUrl, workbookId, sheetName, recordIndex)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating request: %v\n", err)
		os.Exit(1)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error deleting record: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Server returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}

	fmt.Printf("Record [%s] deleted from %s\n", recordIndex, sheetName)
}

func runREPL(serverUrl, token string) {
	scanner := bufio.NewScanner(os.Stdin)
	fmt.Printf("Excel API CLI (connected to %s)\n", serverUrl)
	fmt.Println("Type 'help' for available commands, 'exit' to quit")

	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}

		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if line == "exit" || line == "quit" {
			fmt.Println("Goodbye!")
			break
		}

		if line == "help" {
			printREPLHelp()
			continue
		}

		// Parse and execute command
		parts := strings.Fields(line)
		if len(parts) == 0 {
			continue
		}

		command := parts[0]
		args := parts[1:]

		executeREPLCommand(command, args, serverUrl, token)
	}

	if scanner.Err() != nil {
		fmt.Fprintf(os.Stderr, "Error reading input: %v\n", scanner.Err())
	}
}

func printREPLHelp() {
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

func executeREPLCommand(command string, args []string, serverUrl, token string) {
	switch command {
	case "list-workbooks":
		listWorkbooksCmd(serverUrl)
	case "get-workbook":
		if len(args) < 1 {
			fmt.Println("usage: get-workbook <id>")
			return
		}
		getWorkbookCmd(serverUrl, args[0])
	case "get-cell":
		if len(args) < 3 {
			fmt.Println("usage: get-cell <id> <sheet> <ref>")
			return
		}
		getCellCmd(serverUrl, args[0], args[1], args[2], "native")
	case "get-range":
		if len(args) < 3 {
			fmt.Println("usage: get-range <id> <sheet> <range>")
			return
		}
		getRangeCmd(serverUrl, args[0], args[1], args[2], "native")
	case "get-records":
		if len(args) < 2 {
			fmt.Println("usage: get-records <id> <sheet>")
			return
		}
		listRecordsCmd(serverUrl, args[0], args[1], "native")
	case "set-cell":
		if len(args) < 4 {
			fmt.Println("usage: set-cell <id> <sheet> <ref> <val>")
			return
		}
		setCellCmd(serverUrl, args[0], args[1], args[2], strings.Join(args[3:], " "), token)
	case "add-record":
		if len(args) < 3 {
			fmt.Println("usage: add-record <id> <sheet> <json>")
			return
		}
		addRecordCmd(serverUrl, args[0], args[1], strings.Join(args[2:], " "), token)
	case "update-record":
		if len(args) < 4 {
			fmt.Println("usage: update-record <id> <sheet> <idx> <json>")
			return
		}
		updateRecordCmd(serverUrl, args[0], args[1], args[2], strings.Join(args[3:], " "), token)
	case "delete-record":
		if len(args) < 3 {
			fmt.Println("usage: delete-record <id> <sheet> <idx>")
			return
		}
		deleteRecordCmd(serverUrl, args[0], args[1], args[2], token)
	default:
		fmt.Printf("Unknown command: %s\n", command)
	}
}

func generateCompletion() {
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

func formatAsCSV(data interface{}) string {
	switch v := data.(type) {
	case []map[string]interface{}:
		if len(v) == 0 {
			return ""
		}
		// Get headers
		headers := make([]string, 0, len(v[0]))
		for key := range v[0] {
			headers = append(headers, key)
		}
		csv := strings.Join(headers, ",") + "\n"
		for _, row := range v {
			values := make([]string, len(headers))
			for i, key := range headers {
				values[i] = fmt.Sprintf("%v", row[key])
			}
			csv += strings.Join(values, ",") + "\n"
		}
		return csv
	default:
		return fmt.Sprintf("%v", data)
	}
}

func formatAsMarkdown(data interface{}) string {
	switch v := data.(type) {
	case []map[string]interface{}:
		if len(v) == 0 {
			return ""
		}
		// Get headers
		headers := make([]string, 0, len(v[0]))
		for key := range v[0] {
			headers = append(headers, key)
		}
		md := "| " + strings.Join(headers, " | ") + " |\n"
		md += "|" + strings.Repeat("---|", len(headers)) + "\n"
		for _, row := range v {
			values := make([]string, len(headers))
			for i, key := range headers {
				values[i] = fmt.Sprintf("%v", row[key])
			}
			md += "| " + strings.Join(values, " | ") + " |\n"
		}
		return md
	default:
		return fmt.Sprintf("```\n%v\n```", data)
	}
}

func formatAsTable(data interface{}) string {
	switch v := data.(type) {
	case []map[string]interface{}:
		if len(v) == 0 {
			return ""
		}
		// Get headers and calculate column widths
		headers := make([]string, 0, len(v[0]))
		colWidths := make(map[string]int)
		for key := range v[0] {
			headers = append(headers, key)
			colWidths[key] = len(key)
		}
		// Calculate max widths
		for _, row := range v {
			for key, val := range row {
				valStr := fmt.Sprintf("%v", val)
				if len(valStr) > colWidths[key] {
					colWidths[key] = len(valStr)
				}
			}
		}
		// Build table
		var table strings.Builder
		// Header row
		for i, key := range headers {
			width := colWidths[key]
			fmt.Fprintf(&table, "%-*s", width, key)
			if i < len(headers)-1 {
				table.WriteString("  ")
			}
		}
		table.WriteString("\n")
		// Separator row
		for i, key := range headers {
			width := colWidths[key]
			table.WriteString(strings.Repeat("-", width))
			if i < len(headers)-1 {
				table.WriteString("  ")
			}
		}
		table.WriteString("\n")
		// Data rows
		for _, row := range v {
			for i, key := range headers {
				width := colWidths[key]
				valStr := fmt.Sprintf("%v", row[key])
				fmt.Fprintf(&table, "%-*s", width, valStr)
				if i < len(headers)-1 {
					table.WriteString("  ")
				}
			}
			table.WriteString("\n")
		}
		return table.String()
	default:
		return fmt.Sprintf("%v", data)
	}
}

type Profile struct {
	Name  string `json:"name"`
	URL   string `json:"url"`
	Token string `json:"token"`
}

type ProfileConfig struct {
	Profiles map[string]Profile `json:"profiles"`
}

func loadProfile(profileName, workDir, configPath, accessPath string) (string, string) {
	// Use new resolution logic for config path
	resolvedConfigPath := resolveConfigPath(workDir, configPath, accessPath, false)

	data, err := os.ReadFile(resolvedConfigPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading profile file: %v\n", err)
		return "", ""
	}

	var config ProfileConfig
	if err := json.Unmarshal(data, &config); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing profile file: %v\n", err)
		return "", ""
	}

	profile, ok := config.Profiles[profileName]
	if !ok {
		fmt.Fprintf(os.Stderr, "Profile '%s' not found\n", profileName)
		return "", ""
	}

	return profile.URL, profile.Token
}

func resolveConfigPath(workDir, configPath, accessPath string, isAccess bool) string {
	targetPath := configPath
	if isAccess {
		targetPath = accessPath
	}
	defaultFileName := "config.yaml"
	if isAccess {
		defaultFileName = "access.yaml"
	}

	// Step 1: If --config/--access parameter or CONFIG/ACCESS env var is specified
	if targetPath != "" {
		if workDir != "" && !filepath.IsAbs(targetPath) {
			return filepath.Join(workDir, targetPath)
		}
		return targetPath
	}

	// Step 2: If --work parameter or WORK env var is specified
	if workDir != "" {
		return filepath.Join(workDir, "config", defaultFileName)
	}

	// Step 3: Use default path from current working directory
	return filepath.Join("config", defaultFileName)
}
