package pl.alyx.api.excel.util;

import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DurationParser {
    private static final Pattern DURATION_PATTERN = Pattern.compile("^(\\d+)([smh])$");

    public static Duration parse(String duration) {
        Matcher matcher = DURATION_PATTERN.matcher(duration);
        if (!matcher.matches()) {
            throw new IllegalArgumentException(
                "Invalid duration format: " + duration + ". Expected format: <number><unit> where unit is s, m, or h."
            );
        }
        long value = Long.parseLong(matcher.group(1));
        String unit = matcher.group(2);
        return switch (unit) {
            case "s" -> Duration.ofSeconds(value);
            case "m" -> Duration.ofMinutes(value);
            case "h" -> Duration.ofHours(value);
            default -> throw new IllegalArgumentException(
                "Invalid duration unit: " + unit + ". Expected s, m, or h."
            );
        };
    }
}
