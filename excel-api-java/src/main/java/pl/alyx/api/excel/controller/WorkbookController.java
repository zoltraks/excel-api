package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.dto.SheetInfo;
import pl.alyx.api.excel.dto.WorkbookInfo;
import pl.alyx.api.excel.dto.WorkbookListResponse;
import pl.alyx.api.excel.service.ExcelService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workbooks")
public class WorkbookController {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;

    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;

    public WorkbookController(ExcelService excelService, WorkbookConfig workbookConfig) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
    }

    @GetMapping
    public WorkbookListResponse listWorkbooks() throws IOException {
        List<WorkbookInfo> workbooks = new ArrayList<>();

        for (WorkbookConfig.WorkbookEntry entry : workbookConfig.getRegistry()) {
            java.nio.file.Path path = Paths.get(entry.getPath());
            if (Files.exists(path)) {
                long sizeBytes = Files.size(path);
                long modifiedTime = Files.getLastModifiedTime(path).toMillis();
                String modifiedAt = Instant.ofEpochMilli(modifiedTime)
                        .atZone(java.time.ZoneId.systemDefault())
                        .format(ISO_FORMATTER);

                workbooks.add(new WorkbookInfo(
                    entry.getId(),
                    entry.getPath(),
                    entry.isReadonly(),
                    modifiedAt,
                    sizeBytes
                ));
            }
        }

        return new WorkbookListResponse(workbooks, workbooks.size());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getWorkbook(@PathVariable String id) throws IOException {
        WorkbookConfig.WorkbookEntry entry = workbookConfig.getRegistry().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        java.nio.file.Path path = Paths.get(entry.getPath());
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        long sizeBytes = Files.size(path);
        long modifiedTime = Files.getLastModifiedTime(path).toMillis();
        String modifiedAt = Instant.ofEpochMilli(modifiedTime)
                .atZone(java.time.ZoneId.systemDefault())
                .format(ISO_FORMATTER);

        // Load actual sheets from Excel file
        List<SheetInfo> sheets = excelService.readSheetNames(entry.getPath());

        Map<String, Object> response = new HashMap<>();
        response.put("id", entry.getId());
        response.put("filename", entry.getPath());
        response.put("readonly", entry.isReadonly());
        response.put("modified_at", modifiedAt);
        response.put("size_bytes", sizeBytes);
        response.put("sheets", sheets);

        return ResponseEntity.ok(response);
    }
}
