package pl.alyx.api.excel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CellData {
    private String ref;
    private String column;
    private Integer row;
    private Object value;
    private String type;
    @JsonProperty("number_format")
    private String numberFormat;
    @JsonProperty("is_formula")
    private boolean isFormula;
    private String formatted;

    public CellData() {
    }

    public CellData(Object value, String type, String numberFormat, boolean isFormula, String formatted) {
        this.value = value;
        this.type = type;
        this.numberFormat = numberFormat;
        this.isFormula = isFormula;
        this.formatted = formatted;
    }

    public String getRef() {
        return ref;
    }

    public void setRef(String ref) {
        this.ref = ref;
    }

    public String getColumn() {
        return column;
    }

    public void setColumn(String column) {
        this.column = column;
    }

    public Integer getRow() {
        return row;
    }

    public void setRow(Integer row) {
        this.row = row;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getNumberFormat() {
        return numberFormat;
    }

    public void setNumberFormat(String numberFormat) {
        this.numberFormat = numberFormat;
    }

    public boolean isFormula() {
        return isFormula;
    }

    public void setFormula(boolean formula) {
        isFormula = formula;
    }

    public String getFormatted() {
        return formatted;
    }

    public void setFormatted(String formatted) {
        this.formatted = formatted;
    }
}
