package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.configuration.WorkbookConfiguration;
import pl.alyx.api.excel.exception.ReadonlyWorkbookException;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.dto.SheetInfo;
import pl.alyx.api.excel.dto.WorkbookInfo;
import pl.alyx.api.excel.dto.WorkbookListResponse;
import pl.alyx.api.excel.service.ExcelFileService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/workbooks")
public class WorkbookController {

    private static final DateTimeFormatter TS_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    private final ExcelFileService excelService;
    private final WorkbookConfiguration workbookConfiguration;

    public WorkbookController(ExcelFileService excelService, WorkbookConfiguration workbookConfiguration) {
        this.excelService = excelService;
        this.workbookConfiguration = workbookConfiguration;
    }

    @GetMapping
    public WorkbookListResponse listWorkbooks() throws IOException {
        List<WorkbookInfo> workbooks = new ArrayList<>();

        for (WorkbookConfiguration.WorkbookEntry entry : workbookConfiguration.getWorkbooks()) {
            java.nio.file.Path path = Paths.get(entry.getPath());
            if (Files.exists(path)) {
                long sizeBytes = Files.size(path);
                long modifiedTime = Files.getLastModifiedTime(path).toMillis();
                String modifiedAt = Instant.ofEpochMilli(modifiedTime).atZone(ZoneId.systemDefault()).format(TS_FORMATTER);

                List<String> sheetNames = excelService.readSheetNames(path.toString()).stream()
                        .map(SheetInfo::getName)
                        .toList();

                workbooks.add(new WorkbookInfo(
                    entry.getId(),
                    path.getFileName().toString(),
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
        WorkbookConfiguration.WorkbookEntry entry = workbookConfiguration.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        java.nio.file.Path path = Paths.get(entry.getPath());
        if (!Files.exists(path)) {
            throw new WorkbookNotFoundException(id);
        }

        long sizeBytes = Files.size(path);
        long modifiedTime = Files.getLastModifiedTime(path).toMillis();
        String modifiedAt = Instant.ofEpochMilli(modifiedTime).atZone(ZoneId.systemDefault()).format(TS_FORMATTER);

        List<String> sheetNames = excelService.readSheetNames(path.toString()).stream()
                .map(SheetInfo::getName)
                .toList();

        WorkbookInfo response = new WorkbookInfo(
                entry.getId(),
                path.getFileName().toString(),
                entry.isReadonly(),
                modifiedAt,
                sizeBytes,
                sheetNames);

        return ResponseEntity.ok(response);
    }
}
