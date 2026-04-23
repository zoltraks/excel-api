package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.dto.CellData;
import pl.alyx.api.excel.service.ExcelService;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}")
public class CellController {

    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;

    public CellController(ExcelService excelService, WorkbookConfig workbookConfig) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
    }

    @GetMapping("/cells/{cellRef}")
    public ResponseEntity<CellData> getCell(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable String cellRef,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getRegistry().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        CellData cellData = excelService.readCell(entry.getPath(), sheetName, cellRef, format);
        return ResponseEntity.ok(cellData);
    }

    @PutMapping("/cells/{cellRef}")
    public ResponseEntity<CellData> writeCell(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable String cellRef,
            @RequestBody Map<String, Object> request) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getRegistry().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        if (entry.isReadonly()) {
            return ResponseEntity.unprocessableEntity().build();
        }

        Object value = request.get("value");
        CellData cellData = excelService.writeCell(entry.getPath(), sheetName, cellRef, value);
        return ResponseEntity.ok(cellData);
    }

    @GetMapping("/ranges/{rangeRef}")
    public ResponseEntity<CellData[][]> getRange(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable String rangeRef,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getRegistry().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        CellData[][] rangeData = excelService.readRange(entry.getPath(), sheetName, rangeRef, format);
        return ResponseEntity.ok(rangeData);
    }
}
