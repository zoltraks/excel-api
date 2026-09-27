package pl.alyx.api.excel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SheetMetadata(
    String name,
    @JsonProperty("row_count") int rowCount,
    @JsonProperty("column_count") int columnCount,
    String mode,
    @JsonProperty("header_row") int headerRow,
    @JsonProperty("first_data_row") int firstDataRow
) {}
