package pl.alyx.api.excel.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping
public class MetricsController {

    private static final String IMPLEMENTATION = "excel-api-java";
    private static final int MILLIS_PER_SECOND = 1000;
    private final long startTime = System.currentTimeMillis();

    @GetMapping(value = "/metrics", produces = "text/plain")
    public String metrics() {
        long now = Instant.now().toEpochMilli() / MILLIS_PER_SECOND;
        long uptimeSeconds = (System.currentTimeMillis() - startTime) / MILLIS_PER_SECOND;

        StringBuilder sb = new StringBuilder();
        sb.append("# HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds\n");
        sb.append("# TYPE excel_api_uptime_seconds gauge\n");
        sb.append(String.format("excel_api_uptime_seconds %.3f %d\n", uptimeSeconds, now));
        
        sb.append("# HELP excel_api_implementation_info Implementation information\n");
        sb.append("# TYPE excel_api_implementation_info gauge\n");
        sb.append(String.format("excel_api_implementation_info{implementation=\"%s\"} 1 %d\n", IMPLEMENTATION, now));

        return sb.toString();
    }
}
