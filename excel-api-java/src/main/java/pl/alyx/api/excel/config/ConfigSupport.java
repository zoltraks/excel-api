package pl.alyx.api.excel.config;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ConfigSupport {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\$\\{([^}]+)\\}");

    private ConfigSupport() {
    }

    public static String interpolateVariables(String content) {
        Matcher matcher = VAR_PATTERN.matcher(content);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String varName = matcher.group(1);
            String envValue = System.getenv(varName);
            if (envValue == null) {
                throw new RuntimeException("Environment variable " + varName + " not found for interpolation");
            }
            matcher.appendReplacement(result, envValue);
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
