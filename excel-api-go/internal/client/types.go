package client

// WorkbookItem represents a single workbook entry in a list response.
type WorkbookItem struct {
	ID         string `json:"id"`
	Filename   string `json:"filename"`
	Readonly   bool   `json:"readonly"`
	ModifiedAt string `json:"modified_at"`
	SizeBytes  int64  `json:"size_bytes"`
}

// WorkbookListResponse is returned by /workbooks.
type WorkbookListResponse struct {
	Items []WorkbookItem `json:"items"`
	Total int            `json:"total"`
}

// RecordItem represents a single record in a list or get response.
type RecordItem struct {
	Index int                    `json:"index"`
	Data  map[string]interface{} `json:"data"`
}

// RecordListResponse is returned by /workbooks/{id}/sheets/{name}/records.
type RecordListResponse struct {
	Items  []RecordItem `json:"items"`
	Total  int          `json:"total"`
	Offset int          `json:"offset"`
	Limit  int          `json:"limit"`
	Format string       `json:"format"`
}
