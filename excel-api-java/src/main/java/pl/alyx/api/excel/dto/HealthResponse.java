package pl.alyx.api.excel.dto;

public record HealthResponse(
        String status,
        long uptime_seconds,
        String implementation,
        String version,
        String server_time,
        String timezone) {
}
