package pl.alyx.api.excel.dto;

public record HealthResponse(
        String status,
        long uptime,
        String implementation,
        String version,
        String time,
        String zone) {
}
