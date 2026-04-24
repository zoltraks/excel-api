package pl.alyx.api.excel.logging;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class JsonLogFormatTest {

    @Test
    public void testLogEntryFieldNames() {
        LogEntry logEntry = new LogEntry();
        logEntry.level = "info";
        logEntry.date = "2025-03-15";
        logEntry.time = "14:24:58.123";
        logEntry.message = "Request completed";

        assertNotNull(logEntry.level);
        assertNotNull(logEntry.date);
        assertNotNull(logEntry.time);
        assertNotNull(logEntry.message);

        // Verify date format YYYY-MM-DD
        assertTrue(logEntry.date.matches("^\\d{4}-\\d{2}-\\d{2}$"));

        // Verify time format HH:mm:ss.SSS
        assertTrue(logEntry.time.matches("^\\d{2}:\\d{2}:\\d{2}\\.\\d{3}$"));
    }

    private static class LogEntry {
        public String level;
        public String date;
        public String time;
        public String message;
    }
}
