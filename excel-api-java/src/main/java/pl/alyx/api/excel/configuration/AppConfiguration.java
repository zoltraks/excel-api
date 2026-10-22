package pl.alyx.api.excel.configuration;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The loaded application configuration, keyed by top-level config.yaml section.
 *
 * <p>This is a distinct type rather than a plain {@code Map<String, Object>} so
 * that Spring injection points resolve this bean unambiguously. A declared
 * {@code Map<K, V>} injection point is interpreted by Spring as "all beans of
 * type V keyed by name" instead of a lookup for a Map-typed bean.
 */
public class AppConfiguration extends LinkedHashMap<String, Object> {

    private static final long serialVersionUID = 1L;

    /**
     * Wraps the parsed config.yaml content.
     * @param values the parsed configuration map
     */
    public AppConfiguration(final Map<String, Object> values) {
        super(values);
    }
}
