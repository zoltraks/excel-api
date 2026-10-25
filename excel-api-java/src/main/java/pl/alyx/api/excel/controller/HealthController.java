package pl.alyx.api.excel.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.dto.HealthResponse;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping
public class HealthController {

    private static final String IMPLEMENTATION = "excel-api-java";
    private static final String VERSION = "0.0.6";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final int MILLIS_PER_SECOND = 1000;

    private final long startTime = System.currentTimeMillis();

    @GetMapping("/health")
    public HealthResponse health() {
        long uptimeSeconds = (System.currentTimeMillis() - startTime) / MILLIS_PER_SECOND;
        String time = LocalDateTime.now().format(TIME_FORMATTER);
        String timezone = ZoneId.systemDefault().getId();

        return new HealthResponse(
            "ok",
            uptimeSeconds,
            IMPLEMENTATION,
            VERSION,
            time,
            timezone
        );
    }
}
