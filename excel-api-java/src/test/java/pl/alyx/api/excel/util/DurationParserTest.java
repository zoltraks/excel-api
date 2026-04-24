package pl.alyx.api.excel.util;

import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

class DurationParserTest {

    @Test
    void shouldParseSecondsCorrectly() {
        assertEquals(Duration.ofSeconds(13), DurationParser.parse("13s"));
        assertEquals(Duration.ofSeconds(1), DurationParser.parse("1s"));
        assertEquals(Duration.ofSeconds(0), DurationParser.parse("0s"));
    }

    @Test
    void shouldParseMinutesCorrectly() {
        assertEquals(Duration.ofMinutes(3), DurationParser.parse("3m"));
        assertEquals(Duration.ofMinutes(1), DurationParser.parse("1m"));
    }

    @Test
    void shouldParseHoursCorrectly() {
        assertEquals(Duration.ofHours(154), DurationParser.parse("154h"));
        assertEquals(Duration.ofHours(1), DurationParser.parse("1h"));
    }

    @Test
    void shouldThrowErrorForInvalidFormat() {
        assertThrows(IllegalArgumentException.class, () -> DurationParser.parse("invalid"));
        assertThrows(IllegalArgumentException.class, () -> DurationParser.parse("13"));
        assertThrows(IllegalArgumentException.class, () -> DurationParser.parse("s"));
        assertThrows(IllegalArgumentException.class, () -> DurationParser.parse("13x"));
        assertThrows(IllegalArgumentException.class, () -> DurationParser.parse("3d"));
    }
}
