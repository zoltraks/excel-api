package pl.alyx.api.excel.utility;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Loads the synced OpenAPI contract once and exposes its identity fields.
 */
@Component
public class ContractInfo {

    private final String content;
    private final String version;

    public ContractInfo() throws IOException {
        ClassPathResource resource = new ClassPathResource("openapi.yaml");
        this.content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, Object> document = new Yaml().load(this.content);
        Object info = document.get("info");
        this.version = info instanceof Map
                ? String.valueOf(((Map<?, ?>) info).get("version"))
                : null;
    }

    public String getContent() {
        return content;
    }

    public String getVersion() {
        return version;
    }
}
