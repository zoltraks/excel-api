package pl.alyx.api.excel.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.utility.ContractInfo;

import java.io.IOException;

@RestController
public class OpenApiController {

    private final ContractInfo contractInfo;

    public OpenApiController(ContractInfo contractInfo) {
        this.contractInfo = contractInfo;
    }

    @GetMapping(value = "/openapi.yaml", produces = "application/yaml")
    public ResponseEntity<String> getOpenApiYaml() throws IOException {
        String content = contractInfo.getContent();

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/yaml"))
            .body(content);
    }

    @GetMapping(value = "/openapi.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getOpenApiJson() throws IOException {
        String content = contractInfo.getContent();

        // TODO: Convert YAML to JSON using SnakeYAML
        // For now, return YAML as JSON (not ideal but functional)
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(content);
    }
}
