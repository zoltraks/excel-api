package pl.alyx.api.excel.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.metrics.MetricsCollector;

@RestController
@RequestMapping
public class MetricsController {

    private final MetricsCollector metricsCollector;

    public MetricsController(final MetricsCollector metricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    @GetMapping(value = "/metrics", produces = "text/plain")
    public String metrics() {
        return metricsCollector.toExposition()
                + "# HELP excel_api_implementation_info Implementation information\n"
                + "# TYPE excel_api_implementation_info gauge\n"
                + "excel_api_implementation_info{implementation=\"excel-api-java\"} 1\n";
    }
}
