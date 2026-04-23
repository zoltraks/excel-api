package pl.alyx.api.excel.dto;

import java.util.List;

public class RecordListResponse {
    private List<RecordItem> items;
    private int total;
    private int offset;
    private int limit;
    private String format;

    public RecordListResponse() {
    }

    public RecordListResponse(List<RecordItem> items, int total, int offset, int limit, String format) {
        this.items = items;
        this.total = total;
        this.offset = offset;
        this.limit = limit;
        this.format = format;
    }

    public List<RecordItem> getItems() {
        return items;
    }

    public void setItems(List<RecordItem> items) {
        this.items = items;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getOffset() {
        return offset;
    }

    public void setOffset(int offset) {
        this.offset = offset;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }
}
