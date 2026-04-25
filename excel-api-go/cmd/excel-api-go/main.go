// Excel API Go  Command-line client

package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/excel-api/excel-api-go/internal/cli"
	"github.com/excel-api/excel-api-go/internal/client"
	"github.com/excel-api/excel-api-go/internal/config"
)

var version = "0.0.1"

func die(msg string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, msg+"\n", args...)
	os.Exit(1)
}

func splitArg(arg, format string, min int) []string {
	parts := strings.Split(arg, ":")
	if len(parts) < min {
		die("Invalid %s format. Expected: %s", arg, format)
	}
	return parts
}

func main() {
	ver := flag.Bool("version", false, "Print version and exit")
	repl := flag.Bool("repl", false, "Start interactive REPL mode")
	complete := flag.Bool("complete", false, "Generate shell completion")
	stats := flag.Bool("stats", false, "Show server statistics")
	listWorkbooks := flag.Bool("list-workbooks", false, "List all workbooks")
	getWorkbook := flag.String("get-workbook", "", "Get workbook by ID")
	getCell := flag.String("get-cell", "", "Get cell (workbookId:sheetName:cellRef)")
	getRange := flag.String("get-range", "", "Get range (workbookId:sheetName:rangeRef)")
	listRecords := flag.String("list-records", "", "List records (workbookId:sheetName)")
	getRecord := flag.String("get-record", "", "Get record (workbookId:sheetName:recordIndex)")
	setCell := flag.String("set-cell", "", "Set cell (workbookId:sheetName:cellRef:value)")
	addRecord := flag.String("add-record", "", "Add record (workbookId:sheetName:json)")
	updateRecord := flag.String("update-record", "", "Update record (workbookId:sheetName:recordIndex:json)")
	deleteRecord := flag.String("delete-record", "", "Delete record (workbookId:sheetName:recordIndex)")
	format := flag.String("format", "native", "Output format (native/display/string/csv/markdown/table)")
	serverURL := flag.String("server", "http://localhost:8443", "Server URL")
	token := flag.String("token", "", "Auth token (static)")
	clientId := flag.String("client-id", "", "OAuth2 client ID")
	clientSecret := flag.String("client-secret", "", "OAuth2 client secret")
	profile := flag.String("profile", "", "Connection profile (from ~/.excel-api/profiles.json)")
	workDir := flag.String("work", "", "Working directory for config files")
	configPath := flag.String("config", "", "Path to config.yaml")
	accessPath := flag.String("access", "", "Path to access.yaml")
	flag.Parse()

	// Resolve env fallbacks
	if *workDir == "" {
		*workDir = os.Getenv("WORK")
	}
	if *configPath == "" {
		*configPath = os.Getenv("CONFIG")
	}
	if *accessPath == "" {
		*accessPath = os.Getenv("ACCESS")
	}

	// Load connection profile if specified
	if *profile != "" {
		profileURL, profileToken := config.LoadProfile(*profile, *workDir, *configPath, *accessPath)
		if profileURL != "" {
			*serverURL = profileURL
		}
		if profileToken != "" {
			*token = profileToken
		}
	}

	// Resolve auth token
	authToken, authPrefix := *token, "Token"
	if *clientId != "" && *clientSecret != "" {
		obtained, err := client.ObtainToken(*serverURL, *clientId, *clientSecret)
		if err != nil {
			die("Error obtaining token: %v", err)
		}
		authToken, authPrefix = obtained, "Bearer"
	}

	c := client.NewClient(*serverURL, authToken, authPrefix)

	switch {
	case *ver:
		fmt.Printf("Excel API Go CLI v%s\n", version)
	case *complete:
		cli.GenerateCompletion()
	case *repl:
		cli.Run(c)
	case *stats:
		metrics, err := c.GetMetrics()
		if err != nil {
			die("Error fetching metrics: %v", err)
		}
		fmt.Println("Server Statistics:\n==================")
		fmt.Println(metrics)
	case *listWorkbooks:
		result, err := c.ListWorkbooks()
		if err != nil {
			die("Error fetching workbooks: %v", err)
		}
		fmt.Printf("Workbooks (%d):\n", result.Total)
		for _, wb := range result.Items {
			fmt.Printf("  - ID: %s, File: %s\n", wb.ID, wb.Filename)
		}
	case *getWorkbook != "":
		result, err := c.GetWorkbook(*getWorkbook)
		if err != nil {
			die("Error fetching workbook: %v", err)
		}
		fmt.Printf("Workbook:\n  ID: %s\n  File: %s\n  Readonly: %v\n  Modified: %s\n",
			result["id"], result["filename"], result["readonly"], result["modified_at"])
	case *getCell != "":
		p := splitArg(*getCell, "workbookId:sheetName:cellRef", 3)
		result, err := c.GetCell(p[0], p[1], p[2], *format)
		if err != nil {
			die("Error fetching cell: %v", err)
		}
		fmt.Printf("Cell %s:\n  Value: %v\n  Type: %s\n", p[2], result["value"], result["type"])
	case *getRange != "":
		p := splitArg(*getRange, "workbookId:sheetName:rangeRef", 3)
		result, err := c.GetRange(p[0], p[1], p[2], *format)
		if err != nil {
			die("Error fetching range: %v", err)
		}
		fmt.Printf("Range %s:\n", p[2])
		for _, row := range result {
			fmt.Printf("  %v\n", row)
		}
	case *listRecords != "":
		p := splitArg(*listRecords, "workbookId:sheetName", 2)
		result, err := c.ListRecords(p[0], p[1], *format)
		if err != nil {
			die("Error fetching records: %v", err)
		}
		fmt.Printf("Records (%d total, offset %d, limit %d):\n", result.Total, result.Offset, result.Limit)
		for _, item := range result.Items {
			fmt.Printf("  [%d] %v\n", item.Index, item.Data)
		}
	case *getRecord != "":
		p := splitArg(*getRecord, "workbookId:sheetName:recordIndex", 3)
		result, err := c.GetRecord(p[0], p[1], p[2], *format)
		if err != nil {
			die("Error fetching record: %v", err)
		}
		fmt.Printf("Record [%v]:\n  Data: %v\n", result["index"], result["data"])
	case *setCell != "":
		p := splitArg(*setCell, "workbookId:sheetName:cellRef:value", 4)
		value := strings.Join(p[3:], ":")
		if _, err := c.SetCell(p[0], p[1], p[2], value); err != nil {
			die("Error setting cell: %v", err)
		}
		fmt.Printf("Cell %s set to: %s\n", p[2], value)
	case *addRecord != "":
		p := splitArg(*addRecord, "workbookId:sheetName:json", 3)
		if err := c.AddRecord(p[0], p[1], strings.Join(p[2:], ":")); err != nil {
			die("Error adding record: %v", err)
		}
		fmt.Printf("Record added to %s\n", p[1])
	case *updateRecord != "":
		p := splitArg(*updateRecord, "workbookId:sheetName:recordIndex:json", 4)
		if err := c.UpdateRecord(p[0], p[1], p[2], strings.Join(p[3:], ":")); err != nil {
			die("Error updating record: %v", err)
		}
		fmt.Printf("Record [%s] updated in %s\n", p[2], p[1])
	case *deleteRecord != "":
		p := splitArg(*deleteRecord, "workbookId:sheetName:recordIndex", 3)
		if err := c.DeleteRecord(p[0], p[1], p[2]); err != nil {
			die("Error deleting record: %v", err)
		}
		fmt.Printf("Record [%s] deleted from %s\n", p[2], p[1])
	default:
		fmt.Println("Excel API Go CLI - Use --help for options")
	}
}
