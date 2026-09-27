package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static pl.alyx.api.excel.controller.RequestGuards.requireOperations;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.exception.ReadonlyWorkbookException;
import pl.alyx.api.excel.exception.ValidationException;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.dto.CellData;
import pl.alyx.api.excel.dto.RangeData;
import pl.alyx.api.excel.service.ExcelService;
import pl.alyx.api.excel.service.FileLockService;
import pl.alyx.api.excel.service.WriteQueueService;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}")
public class CellController {

    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;
    private final FileLockService fileLockService;
    private final WriteQueueService writeQueueService;

    public CellController(ExcelService excelService, WorkbookConfig workbookConfig,
            FileLockService fileLockService, WriteQueueService writeQueueService) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
        this.fileLockService = fileLockService;
        this.writeQueueService = writeQueueService;
    }

    @GetMapping("/cells/{cellRef}")
    public ResponseEntity<CellData> getCell(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable String cellRef,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
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

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        if (entry.isReadonly()) {
            throw new ReadonlyWorkbookException();
        }

        if (!request.containsKey("value")) {
            throw new ValidationException("value is required");
        }
        Object value = request.get("value");
        return writeQueueService.submit(id, () -> {
            fileLockService.acquire(id);
            try {
                CellData cellData = excelService.writeCell(entry.getPath(), sheetName, cellRef, value);
                return ResponseEntity.ok(cellData);
            } finally {
                fileLockService.release(id);
            }
        });
    }

    @PostMapping("/cells/operations")
    public ResponseEntity<Map<String, Object>> batchCellOperations(
            @PathVariable String id,
            @PathVariable String sheetName,
            @RequestBody Map<String, Object> request) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        if (entry.isReadonly()) {
            throw new ReadonlyWorkbookException();
        }

        List<Map<String, Object>> operations = requireOperations(request);

        List<Map<String, Object>> results = writeQueueService.submit(id, () -> {
            fileLockService.acquire(id);
            try {
                return excelService.batchCellOperations(entry.getPath(), sheetName, operations);
            } finally {
                fileLockService.release(id);
            }
        });

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("results", results);
        body.put("applied_at", Instant.now().toString());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/ranges/{rangeRef}")
    public ResponseEntity<RangeData> getRange(
            @PathVariable String id,
            @PathVariable String sheetName,
            @PathVariable String rangeRef,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        RangeData rangeData = excelService.readRange(entry.getPath(), sheetName, rangeRef, format);
        return ResponseEntity.ok(rangeData);
    }
}
