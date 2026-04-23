package pl.alyx.api.excel.dto;

public record SheetMetadata(
    String name,
    int rowCount,
    int columnCount,
    String mode,
    int headerRow,
    int firstDataRow
) {}
