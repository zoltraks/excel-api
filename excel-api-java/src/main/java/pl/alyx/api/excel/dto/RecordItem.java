package pl.alyx.api.excel.dto;

import java.util.Map;

public class RecordItem {
    private int index;
    private Map<String, Object> data;

    public RecordItem() {
    }

    public RecordItem(int index, Map<String, Object> data) {
        this.index = index;
        this.data = data;
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }
}
