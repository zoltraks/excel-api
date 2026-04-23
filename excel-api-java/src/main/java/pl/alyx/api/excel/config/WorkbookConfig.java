package pl.alyx.api.excel.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "workbooks")
public class WorkbookConfig {
    private List<WorkbookEntry> registry = new ArrayList<>();

    public List<WorkbookEntry> getRegistry() {
        return registry;
    }

    public void setRegistry(List<WorkbookEntry> registry) {
        this.registry = registry;
    }

    public static class WorkbookEntry {
        private String id;
        private String path;
        private boolean readonly = false;
        private Map<String, SheetHeaderConfig> sheets = new HashMap<>();

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public boolean isReadonly() {
            return readonly;
        }

        public void setReadonly(boolean readonly) {
            this.readonly = readonly;
        }

        public Map<String, SheetHeaderConfig> getSheets() {
            return sheets;
        }

        public void setSheets(Map<String, SheetHeaderConfig> sheets) {
            this.sheets = sheets;
        }
    }

    public static class SheetHeaderConfig {
        private String mode; // "single", "multi", "legend", "none"
        private Integer identifierRow;
        private Integer typeRow;
        private Integer descriptionRow;
        private String legendSheet;

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }

        public Integer getIdentifierRow() {
            return identifierRow;
        }

        public void setIdentifierRow(Integer identifierRow) {
            this.identifierRow = identifierRow;
        }

        public Integer getTypeRow() {
            return typeRow;
        }

        public void setTypeRow(Integer typeRow) {
            this.typeRow = typeRow;
        }

        public Integer getDescriptionRow() {
            return descriptionRow;
        }

        public void setDescriptionRow(Integer descriptionRow) {
            this.descriptionRow = descriptionRow;
        }

        public String getLegendSheet() {
            return legendSheet;
        }

        public void setLegendSheet(String legendSheet) {
            this.legendSheet = legendSheet;
        }
    }
}
