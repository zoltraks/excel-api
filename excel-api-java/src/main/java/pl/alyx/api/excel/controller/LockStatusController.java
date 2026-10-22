package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.configuration.WorkbookConfiguration;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.service.FileLockService;
import pl.alyx.api.excel.service.WriteQueueService;

import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}")
public class LockStatusController {

    private final WorkbookConfiguration workbookConfiguration;
    private final FileLockService fileLockService;
    private final WriteQueueService writeQueueService;

    public LockStatusController(WorkbookConfiguration workbookConfiguration, FileLockService fileLockService,
            WriteQueueService writeQueueService) {
        this.workbookConfiguration = workbookConfiguration;
        this.fileLockService = fileLockService;
        this.writeQueueService = writeQueueService;
    }

    @GetMapping("/lock-status")
    public ResponseEntity<Map<String, Object>> getLockStatus(@PathVariable String id) {
        WorkbookConfiguration.WorkbookEntry entry = workbookConfiguration.getWorkbooks().stream()
                .filter(w -> w.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            throw new WorkbookNotFoundException(id);
        }

        Map<String, Object> status = fileLockService.getLockInfo(id);
        status.put("queue_depth", writeQueueService.getDepth(id));
        return ResponseEntity.ok(status);
    }
}
