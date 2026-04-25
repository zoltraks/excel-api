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
import java.util.List;

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
        String registryDir = workbookConfig.getDirectory();

        for (WorkbookConfig.WorkbookEntry entry : workbookConfig.getWorkbooks()) {
            java.nio.file.Path path;
            if (registryDir != null && !registryDir.isEmpty()) {
                path = Paths.get(registryDir, entry.getPath());
            } else {
                path = Paths.get(entry.getPath());
            }
            if (Files.exists(path)) {
                long sizeBytes = Files.size(path);
                long modifiedTime = Files.getLastModifiedTime(path).toMillis();
                String modifiedAt = ISO_FORMATTER.format(Instant.ofEpochMilli(modifiedTime));

                List<String> sheetNames = excelService.readSheetNames(path.toString()).stream()
                        .map(SheetInfo::getName)
                        .toList();

                workbooks.add(new WorkbookInfo(
                    entry.getId(),
                    entry.getPath(),
                    entry.isReadonly(),
                    modifiedAt,
                    sizeBytes,
                    sheetNames
                ));
            }
        }

        return new WorkbookListResponse(workbooks, workbooks.size());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkbookInfo> getWorkbook(@PathVariable String id) throws IOException {
        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        String registryDir = workbookConfig.getDirectory();
        java.nio.file.Path path;
        if (registryDir != null && !registryDir.isEmpty()) {
            path = Paths.get(registryDir, entry.getPath());
        } else {
            path = Paths.get(entry.getPath());
        }
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        long sizeBytes = Files.size(path);
        long modifiedTime = Files.getLastModifiedTime(path).toMillis();
        String modifiedAt = ISO_FORMATTER.format(Instant.ofEpochMilli(modifiedTime));

        List<String> sheetNames = excelService.readSheetNames(path.toString()).stream()
                .map(SheetInfo::getName)
                .toList();

        WorkbookInfo response = new WorkbookInfo(
                entry.getId(),
                entry.getPath(),
                entry.isReadonly(),
                modifiedAt,
                sizeBytes,
                sheetNames);

        return ResponseEntity.ok(response);
    }
}
