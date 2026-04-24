package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.dto.RecordItem;
import pl.alyx.api.excel.dto.RecordListResponse;
import pl.alyx.api.excel.service.ExcelService;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}/records")
public class RecordController {

    private static final int STATUS_CREATED = 201;
    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;

    public RecordController(ExcelService excelService, WorkbookConfig workbookConfig) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
    }

    @GetMapping
    public ResponseEntity<RecordListResponse> getRecords(
            @PathVariable String id,
            @PathVariable String sheetName,
            @RequestParam(defaultValue = "1") int headerRowCount,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        RecordListResponse response = excelService.readRecords(
            entry.getPath(),
            sheetName,
            headerRowCount,
            offset,
            limit,
            format
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{recordIndex}")
    public ResponseEntity<RecordItem> getRecord(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable int recordIndex,
            @RequestParam(defaultValue = "1") int headerRowCount,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        RecordItem record = excelService.readRecord(
            entry.getPath(),
            sheetName,
            recordIndex,
            headerRowCount,
            format
        );
        return ResponseEntity.ok(record);
    }

    @PostMapping
    public ResponseEntity<RecordItem> addRecord(
            @PathVariable String id,
            @PathVariable String sheetName,
            @RequestBody Map<String, Object> request) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        if (entry.isReadonly()) {
            return ResponseEntity.unprocessableEntity().build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) request.get("data");
        Integer afterRow = (Integer) request.get("after_row");
        Integer copyStyleFrom = (Integer) request.get("copy_style_from");

        RecordItem record = excelService.addRecord(entry.getPath(), sheetName, data, afterRow, copyStyleFrom);
        return ResponseEntity.status(STATUS_CREATED).body(record);
    }

    @PutMapping("/{recordIndex}")
    public ResponseEntity<RecordItem> updateRecord(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable int recordIndex,
            @RequestBody Map<String, Object> request) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        if (entry.isReadonly()) {
            return ResponseEntity.unprocessableEntity().build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) request.get("data");

        RecordItem record = excelService.updateRecord(entry.getPath(), sheetName, recordIndex, data);
        return ResponseEntity.ok(record);
    }

    @DeleteMapping("/{recordIndex}")
    public ResponseEntity<Void> deleteRecord(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable int recordIndex) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        if (entry.isReadonly()) {
            return ResponseEntity.unprocessableEntity().build();
        }

        excelService.deleteRecord(entry.getPath(), sheetName, recordIndex);
        return ResponseEntity.noContent().build();
    }
}
