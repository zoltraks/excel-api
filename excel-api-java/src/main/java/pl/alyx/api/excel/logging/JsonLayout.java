package pl.alyx.api.excel.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.LayoutBase;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class JsonLayout extends LayoutBase<ILoggingEvent> {
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private SimpleDateFormat timestampPattern = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");

    public void setTimestampPattern(String pattern) {
        this.timestampPattern = new SimpleDateFormat(pattern);
    }

    @Override
    public String doLayout(ILoggingEvent event) {
        Map<String, Object> logEntry = new HashMap<>();
        
        // Format timestamp
        Date now = new Date(event.getTimeStamp());
        String timestamp = timestampPattern.format(now);
        String[] parts = timestamp.split(" ");
        
        logEntry.put("level", event.getLevel().toString().toLowerCase());
        logEntry.put("date", parts[0]);
        logEntry.put("time", parts[1]);
        logEntry.put("message", event.getFormattedMessage());
        
        // Add MDC properties for request/response/remote if available
        Map<String, String> mdc = event.getMDCPropertyMap();
        if (mdc != null) {
            if (mdc.containsKey("request_method") || mdc.containsKey("request_url")) {
                Map<String, Object> request = new HashMap<>();
                if (mdc.containsKey("request_method")) {
                    request.put("method", mdc.get("request_method"));
                }
                if (mdc.containsKey("request_url")) {
                    request.put("url", mdc.get("request_url"));
                }
                logEntry.put("request", request);
            }
            if (mdc.containsKey("response_status") || mdc.containsKey("response_time")) {
                Map<String, Object> response = new HashMap<>();
                if (mdc.containsKey("response_status")) {
                    response.put("statusCode", Integer.parseInt(mdc.get("response_status")));
                }
                if (mdc.containsKey("response_time")) {
                    response.put("responseTime", Long.parseLong(mdc.get("response_time")));
                }
                logEntry.put("response", response);
            }
            if (mdc.containsKey("remote")) {
                logEntry.put("remote", mdc.get("remote"));
            }
        }
        
        try {
            return objectMapper.writeValueAsString(logEntry) + "\n";
        } catch (IOException e) {
            return "{\"level\":\"error\",\"message\":\"Failed to format log entry\"}\n";
        }
    }
}
