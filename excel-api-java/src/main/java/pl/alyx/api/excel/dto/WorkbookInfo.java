package pl.alyx.api.excel.dto;

public class WorkbookInfo {
    private String id;
    private String filename;
    private boolean readonly;
    private String modifiedAt;
    private long sizeBytes;

    public WorkbookInfo() {
    }

    public WorkbookInfo(String id, String filename, boolean readonly, String modifiedAt, long sizeBytes) {
        this.id = id;
        this.filename = filename;
        this.readonly = readonly;
        this.modifiedAt = modifiedAt;
        this.sizeBytes = sizeBytes;
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
}
