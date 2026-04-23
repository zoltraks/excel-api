package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.service.ExcelService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}")
public class ColumnsController {

    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;

    public ColumnsController(ExcelService excelService, WorkbookConfig workbookConfig) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
    }

    @GetMapping("/columns")
    public ResponseEntity<Map<String, Object>> getColumns(
            @PathVariable String id,
            @PathVariable String sheetName) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getRegistry().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> columns = excelService.getColumnDefinitions(entry.getPath(), sheetName);
        return ResponseEntity.ok(Map.of(
                "source", "header_row",
                "columns", columns
        ));
    }
}
