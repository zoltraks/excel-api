package pl.alyx.api.excel.config;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class WorkbookConfig {
    private static final long DEFAULT_LOCK_TIMEOUT_MS = 10000L;
    private static final int DEFAULT_BATCH_MAX_SIZE = 50;
    private static final long DEFAULT_BATCH_DEBOUNCE_MS = 100L;

    private String directory;
    private List<WorkbookEntry> workbooks = new ArrayList<>();
    private String lockDir;
    private long lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS;
    private int batchMaxSize = DEFAULT_BATCH_MAX_SIZE;
    private long batchDebounceMs = DEFAULT_BATCH_DEBOUNCE_MS;

    public String getDirectory() {
        return directory;
    }

    public void setDirectory(String directory) {
        this.directory = directory;
    }

    public String getLockDir() {
        return lockDir;
    }

    public void setLockDir(String lockDir) {
        this.lockDir = lockDir;
    }

    public long getLockTimeoutMs() {
        return lockTimeoutMs;
    }

    public void setLockTimeoutMs(long lockTimeoutMs) {
        this.lockTimeoutMs = lockTimeoutMs;
    }

    public int getBatchMaxSize() {
        return batchMaxSize;
    }

    public void setBatchMaxSize(int batchMaxSize) {
        this.batchMaxSize = batchMaxSize;
    }

    public long getBatchDebounceMs() {
        return batchDebounceMs;
    }

    public void setBatchDebounceMs(long batchDebounceMs) {
        this.batchDebounceMs = batchDebounceMs;
    }

    public List<WorkbookEntry> getWorkbooks() {
        return workbooks;
    }

    public void setWorkbooks(List<WorkbookEntry> workbooks) {
        this.workbooks = workbooks;
    }

    @SuppressWarnings("unchecked")
    public void loadFromConfigMap(Map<String, Object> config) {
        if (config.containsKey("registry") && config.get("registry") instanceof Map) {
            Map<String, Object> registry = (Map<String, Object>) config.get("registry");
            if (registry.containsKey("directory")) {
                this.directory = (String) registry.get("directory");
            }
            if (registry.containsKey("workbooks") && registry.get("workbooks") instanceof List) {
                List<Map<String, Object>> workbookMaps = (List<Map<String, Object>>) registry.get("workbooks");
                this.workbooks = new ArrayList<>();
                for (Map<String, Object> workbookMap : workbookMaps) {
                    WorkbookEntry entry = new WorkbookEntry();
                    if (workbookMap.containsKey("id")) {
                        entry.setId((String) workbookMap.get("id"));
                    }
                    if (workbookMap.containsKey("path")) {
                        entry.setPath((String) workbookMap.get("path"));
                    }
                    if (workbookMap.containsKey("readonly")) {
                        entry.setReadonly((Boolean) workbookMap.get("readonly"));
                    }
                    if (workbookMap.containsKey("sheets") && workbookMap.get("sheets") instanceof Map) {
                        Map<String, Map<String, Object>> sheetsMap =
                            (Map<String, Map<String, Object>>) workbookMap.get("sheets");
                        Map<String, SheetHeaderConfig> sheets = new HashMap<>();
                        for (Map.Entry<String, Map<String, Object>> sheetEntry : sheetsMap.entrySet()) {
                            SheetHeaderConfig sheetConfig = new SheetHeaderConfig();
                            Map<String, Object> sheetConfigMap = sheetEntry.getValue();
                            if (sheetConfigMap.containsKey("mode")) {
                                sheetConfig.setMode((String) sheetConfigMap.get("mode"));
                            }
                            if (sheetConfigMap.containsKey("identifier_row")) {
                                sheetConfig.setIdentifierRow((Integer) sheetConfigMap.get("identifier_row"));
                            }
                            if (sheetConfigMap.containsKey("type_row")) {
                                sheetConfig.setTypeRow((Integer) sheetConfigMap.get("type_row"));
                            }
                            if (sheetConfigMap.containsKey("description_row")) {
                                sheetConfig.setDescriptionRow((Integer) sheetConfigMap.get("description_row"));
                            }
                            if (sheetConfigMap.containsKey("legend_sheet")) {
                                sheetConfig.setLegendSheet((String) sheetConfigMap.get("legend_sheet"));
                            }
                            sheets.put(sheetEntry.getKey(), sheetConfig);
                        }
                        entry.setSheets(sheets);
                    }
                    this.workbooks.add(entry);
                }
            }
        }

        if (config.containsKey("queue") && config.get("queue") instanceof Map) {
            Map<String, Object> queue = (Map<String, Object>) config.get("queue");
            if (queue.get("lock_dir") instanceof String) {
                this.lockDir = (String) queue.get("lock_dir");
            }
            if (queue.get("lock_timeout_ms") instanceof Number) {
                this.lockTimeoutMs = ((Number) queue.get("lock_timeout_ms")).longValue();
            }
            if (queue.get("batch_max_size") instanceof Number) {
                this.batchMaxSize = ((Number) queue.get("batch_max_size")).intValue();
            }
            if (queue.get("batch_debounce_ms") instanceof Number) {
                this.batchDebounceMs = ((Number) queue.get("batch_debounce_ms")).longValue();
            }
        }
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
        private String mode;
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
