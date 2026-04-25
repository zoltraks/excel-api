package pl.alyx.api.excel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class WorkbookInfo {
    private String id;
    private String filename;
    private boolean readonly;
    @JsonProperty("modified_at")
    private String modifiedAt;
    @JsonProperty("size_bytes")
    private long sizeBytes;
    private List<String> sheets;

    public WorkbookInfo() {
    }

    public WorkbookInfo(String id, String filename, boolean readonly, String modifiedAt, long sizeBytes,
            List<String> sheets) {
        this.id = id;
        this.filename = filename;
        this.readonly = readonly;
        this.modifiedAt = modifiedAt;
        this.sizeBytes = sizeBytes;
        this.sheets = sheets;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public boolean isReadonly() {
        return readonly;
    }

    public void setReadonly(boolean readonly) {
        this.readonly = readonly;
    }

    public String getModifiedAt() {
        return modifiedAt;
    }

    public void setModifiedAt(String modifiedAt) {
        this.modifiedAt = modifiedAt;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public List<String> getSheets() {
        return sheets;
    }

    public void setSheets(List<String> sheets) {
        this.sheets = sheets;
    }
}
