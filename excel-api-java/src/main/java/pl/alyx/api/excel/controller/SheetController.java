package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.configuration.WorkbookConfiguration;
import pl.alyx.api.excel.exception.SheetNotFoundException;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.dto.SheetInfo;
import pl.alyx.api.excel.dto.SheetMetadata;
import pl.alyx.api.excel.service.ExcelFileService;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/workbooks/{id}/sheets")
public class SheetController {

    private final ExcelFileService excelService;
    private final WorkbookConfiguration workbookConfiguration;

    public SheetController(ExcelFileService excelService, WorkbookConfiguration workbookConfiguration) {
        this.excelService = excelService;
        this.workbookConfiguration = workbookConfiguration;
    }

    @GetMapping("/{sheetName}")
    public ResponseEntity<SheetMetadata> getSheet(
            @PathVariable String id,
            @PathVariable String sheetName) throws IOException {

        WorkbookConfiguration.WorkbookEntry entry = workbookConfiguration.getWorkbooks().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        List<SheetInfo> sheets = excelService.readSheetNames(entry.getPath());
        SheetInfo sheet = sheets.stream()
            .filter(s -> s.getName().equals(sheetName))
            .findFirst()
            .orElse(null);

        if (sheet == null) {
            throw new SheetNotFoundException(sheetName);
        }

        SheetMetadata metadata = excelService.getSheetMetadata(
                entry.getPath(), sheetName, entry.getSheets().get(sheetName));
        return ResponseEntity.ok(metadata);
    }
}
