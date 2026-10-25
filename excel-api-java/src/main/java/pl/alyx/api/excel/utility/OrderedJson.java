package pl.alyx.api.excel.utility;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds JSON bodies whose keys serialize in the order written.
 */
public final class OrderedJson {

    private OrderedJson() {
    }

    /**
     * Creates an insertion-ordered map from alternating key/value arguments.
     * @param pairs key1, value1, key2, value2, ...
     * @return an ordered map
     */
    public static Map<String, Object> body(final Object... pairs) {
        final Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            map.put((String) pairs[i], pairs[i + 1]);
        }
        return map;
    }
}
