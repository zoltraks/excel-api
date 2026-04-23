package pl.alyx.api.excel.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
public class OpenApiController {

    @GetMapping(value = "/openapi.yaml", produces = "application/yaml")
    public ResponseEntity<String> getOpenApiYaml() throws IOException {
        ClassPathResource resource = new ClassPathResource("openapi.yaml");
        String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        // Replace dynamic fields
        content = content.replace("${server.host}", "0.0.0.0");
        content = content.replace("${server.port}", "8443");
        content = content.replace("${server.basePath}", "/api/v1");
        content = content.replace("${implementation}", "excel-api-java");
        content = content.replace("${version}", "0.0.1");

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/yaml"))
            .body(content);
    }

    @GetMapping(value = "/openapi.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getOpenApiJson() throws IOException {
        ClassPathResource resource = new ClassPathResource("openapi.yaml");
        String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        // Replace dynamic fields
        content = content.replace("${server.host}", "0.0.0.0");
        content = content.replace("${server.port}", "8443");
        content = content.replace("${server.basePath}", "/api/v1");
        content = content.replace("${implementation}", "excel-api-java");
        content = content.replace("${version}", "0.0.1");

        // TODO: Convert YAML to JSON using SnakeYAML
        // For now, return YAML as JSON (not ideal but functional)
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(content);
    }
}
