package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static pl.alyx.api.excel.utility.RequestGuards.requireOperations;
import pl.alyx.api.excel.configuration.WorkbookConfiguration;
import pl.alyx.api.excel.exception.ReadonlyWorkbookException;
import pl.alyx.api.excel.exception.ValidationException;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.service.ExcelFileService;
import pl.alyx.api.excel.service.FileLockService;
import pl.alyx.api.excel.service.WriteQueueService;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}/sheets/{sheetName}")
public class OperationsController {

    private final ExcelFileService excelService;
    private final WorkbookConfiguration workbookConfiguration;
    private final FileLockService fileLockService;
    private final WriteQueueService writeQueueService;

    public OperationsController(ExcelFileService excelService, WorkbookConfiguration workbookConfiguration,
            FileLockService fileLockService, WriteQueueService writeQueueService) {
        this.excelService = excelService;
        this.workbookConfiguration = workbookConfiguration;
        this.fileLockService = fileLockService;
        this.writeQueueService = writeQueueService;
    }

    @PostMapping("/operations")
    public ResponseEntity<Map<String, Object>> batchRecordOperations(
            @PathVariable String id,
            @PathVariable String sheetName,
            @RequestBody Map<String, Object> request) throws IOException {

        WorkbookConfiguration.WorkbookEntry entry = workbookConfiguration.getWorkbooks().stream()
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
                return excelService.batchRecordOperations(
                        entry.getPath(), sheetName, operations, entry.getSheetConfig(sheetName));
            } finally {
                fileLockService.release(id);
            }
        });

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("results", results);
        body.put("applied_at", Instant.now().toString());
        return ResponseEntity.ok(body);
    }
}
