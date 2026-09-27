package pl.alyx.api.excel.dto;

import java.util.List;

public class RangeData {
    private String range;
    private List<RangeRow> rows;

    public RangeData() {
    }

    public RangeData(String range, List<RangeRow> rows) {
        this.range = range;
        this.rows = rows;
    }

    public String getRange() {
        return range;
    }

    public void setRange(String range) {
        this.range = range;
    }

    public List<RangeRow> getRows() {
        return rows;
    }

    public void setRows(List<RangeRow> rows) {
        this.rows = rows;
    }

    public static class RangeRow {
        private int row;
        private List<CellData> cells;

        public RangeRow() {
        }

        public RangeRow(int row, List<CellData> cells) {
            this.row = row;
            this.cells = cells;
        }

        public int getRow() {
            return row;
        }

        public void setRow(int row) {
            this.row = row;
        }

        public List<CellData> getCells() {
            return cells;
        }

        public void setCells(List<CellData> cells) {
            this.cells = cells;
        }
    }
}
