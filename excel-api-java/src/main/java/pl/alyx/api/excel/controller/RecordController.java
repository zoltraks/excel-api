package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static pl.alyx.api.excel.controller.RequestGuards.requireData;
import static pl.alyx.api.excel.controller.RequestGuards.asInteger;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.exception.ReadonlyWorkbookException;
import pl.alyx.api.excel.exception.ValidationException;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.dto.RecordItem;
import pl.alyx.api.excel.dto.RecordListResponse;
import pl.alyx.api.excel.service.ExcelService;
import pl.alyx.api.excel.service.FileLockService;
import pl.alyx.api.excel.service.WriteQueueService;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}/records")
public class RecordController {

    private static final int STATUS_CREATED = 201;
    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;
    private final FileLockService fileLockService;
    private final WriteQueueService writeQueueService;

    public RecordController(ExcelService excelService, WorkbookConfig workbookConfig,
            FileLockService fileLockService, WriteQueueService writeQueueService) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
        this.fileLockService = fileLockService;
        this.writeQueueService = writeQueueService;
    }

    @GetMapping
    public ResponseEntity<RecordListResponse> getRecords(
            @PathVariable String id,
            @PathVariable String sheetName,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        RecordListResponse response = excelService.readRecords(
            entry.getPath(),
            sheetName,
            entry.getSheets().get(sheetName),
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
            @RequestParam(defaultValue = "native") String format) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        RecordItem record = excelService.readRecord(
            entry.getPath(),
            sheetName,
            recordIndex,
            entry.getSheets().get(sheetName),
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
            throw new WorkbookNotFoundException(id);
        }

        if (entry.isReadonly()) {
            throw new ReadonlyWorkbookException();
        }

        Map<String, Object> data = requireData(request);
        Integer afterRow = asInteger(request.get("after_row"));
        Integer copyStyleFrom = asInteger(request.get("copy_style_from"));

        return writeQueueService.submit(id, () -> {
            fileLockService.acquire(id);
            try {
                RecordItem record = excelService.addRecord(entry.getPath(), sheetName, data, entry.getSheets().get(sheetName), afterRow, copyStyleFrom);
                return ResponseEntity.status(STATUS_CREATED).body(record);
            } finally {
                fileLockService.release(id);
            }
        });
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
            throw new WorkbookNotFoundException(id);
        }

        if (entry.isReadonly()) {
            throw new ReadonlyWorkbookException();
        }

        Map<String, Object> data = requireData(request);

        return writeQueueService.submit(id, () -> {
            fileLockService.acquire(id);
            try {
                RecordItem record = excelService.updateRecord(entry.getPath(), sheetName, recordIndex, data, entry.getSheets().get(sheetName));
                return ResponseEntity.ok(record);
            } finally {
                fileLockService.release(id);
            }
        });
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
            throw new WorkbookNotFoundException(id);
        }

        if (entry.isReadonly()) {
            throw new ReadonlyWorkbookException();
        }

        return writeQueueService.submit(id, () -> {
            fileLockService.acquire(id);
            try {
                excelService.deleteRecord(entry.getPath(), sheetName, recordIndex, entry.getSheets().get(sheetName));
            } finally {
                fileLockService.release(id);
            }
            return ResponseEntity.noContent().build();
        });
    }
}
