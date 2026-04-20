// Excel API Go — interactive and batch CLI client
package main

import (
	"fmt"
	"os"

	"github.com/excel-api/excel-api-go/internal/config"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Println(config.Version)
		os.Exit(0)
	}

	fmt.Println("Excel API CLI — use --help for usage")
}
