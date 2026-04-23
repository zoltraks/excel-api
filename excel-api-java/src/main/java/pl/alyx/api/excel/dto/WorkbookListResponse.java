package pl.alyx.api.excel.dto;

import java.util.List;

public class WorkbookListResponse {
    private List<WorkbookInfo> items;
    private int total;

    public WorkbookListResponse() {
    }

    public WorkbookListResponse(List<WorkbookInfo> items, int total) {
        this.items = items;
        this.total = total;
    }

    public List<WorkbookInfo> getItems() {
        return items;
    }

    public void setItems(List<WorkbookInfo> items) {
        this.items = items;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }
}
