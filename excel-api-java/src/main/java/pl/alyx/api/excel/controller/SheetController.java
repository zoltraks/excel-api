package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.dto.SheetInfo;
import pl.alyx.api.excel.dto.SheetMetadata;
import pl.alyx.api.excel.service.ExcelService;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/workbooks/{id}/sheets")
public class SheetController {

    private final ExcelService excelService;
    private final WorkbookConfig workbookConfig;

    public SheetController(ExcelService excelService, WorkbookConfig workbookConfig) {
        this.excelService = excelService;
        this.workbookConfig = workbookConfig;
    }

    @GetMapping("/{sheetName}")
    public ResponseEntity<SheetMetadata> getSheet(
            @PathVariable String id,
            @PathVariable String sheetName) throws IOException {

        WorkbookConfig.WorkbookEntry entry = workbookConfig.getRegistry().stream()
            .filter(w -> w.getId().equals(id))
            .findFirst()
            .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        List<SheetInfo> sheets = excelService.readSheetNames(entry.getPath());
        SheetInfo sheet = sheets.stream()
            .filter(s -> s.getName().equals(sheetName))
            .findFirst()
            .orElse(null);

        if (sheet == null) {
            return ResponseEntity.notFound().build();
        }

        SheetMetadata metadata = excelService.getSheetMetadata(entry.getPath(), sheetName);
        return ResponseEntity.ok(metadata);
    }
}
