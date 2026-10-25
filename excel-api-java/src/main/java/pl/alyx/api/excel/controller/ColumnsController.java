package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.configuration.WorkbookConfiguration;
import pl.alyx.api.excel.exception.ReadonlyWorkbookException;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.service.ExcelFileService;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}")
public class ColumnsController {

    private final ExcelFileService excelService;
    private final WorkbookConfiguration workbookConfiguration;

    public ColumnsController(ExcelFileService excelService, WorkbookConfiguration workbookConfiguration) {
        this.excelService = excelService;
        this.workbookConfiguration = workbookConfiguration;
    }

    @GetMapping("/columns")
    public ResponseEntity<Map<String, Object>> getColumns(
            @PathVariable String id,
            @PathVariable String sheetName) throws IOException {

        WorkbookConfiguration.WorkbookEntry entry = workbookConfiguration.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        Map<String, Object> result = excelService.getColumnDefinitions(
                entry.getPath(), sheetName, entry.getSheetConfig(sheetName));
        return ResponseEntity.ok(result);
    }
}
