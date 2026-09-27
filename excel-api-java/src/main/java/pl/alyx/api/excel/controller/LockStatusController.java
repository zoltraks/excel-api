package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.exception.WorkbookNotFoundException;
import pl.alyx.api.excel.service.FileLockService;
import pl.alyx.api.excel.service.WriteQueueService;

import java.util.Map;

@RestController
@RequestMapping("/workbooks/{id}")
public class LockStatusController {

    private final WorkbookConfig workbookConfig;
    private final FileLockService fileLockService;
    private final WriteQueueService writeQueueService;

    public LockStatusController(WorkbookConfig workbookConfig, FileLockService fileLockService,
            WriteQueueService writeQueueService) {
        this.workbookConfig = workbookConfig;
        this.fileLockService = fileLockService;
        this.writeQueueService = writeQueueService;
    }

    @GetMapping("/lock-status")
    public ResponseEntity<Map<String, Object>> getLockStatus(@PathVariable String id) {
        WorkbookConfig.WorkbookEntry entry = workbookConfig.getWorkbooks().stream()
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
