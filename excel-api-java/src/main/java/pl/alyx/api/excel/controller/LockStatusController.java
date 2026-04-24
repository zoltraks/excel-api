package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.config.WorkbookConfig;

import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}")
public class LockStatusController {

    private final WorkbookConfig workbookConfig;

    public LockStatusController(WorkbookConfig workbookConfig) {
        this.workbookConfig = workbookConfig;
    }

    @GetMapping("/lock-status")
    public ResponseEntity<Map<String, Object>> getLockStatus(@PathVariable String id) {
        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            return ResponseEntity.notFound().build();
        }

        // TODO: Implement actual lock status checking
        return ResponseEntity.ok(Map.of(
                "locked", false,
                "queue_depth", 0
        ));
    }
}
