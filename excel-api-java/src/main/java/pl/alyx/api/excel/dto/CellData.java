package pl.alyx.api.excel.dto;

public class CellData {
    private Object value;
    private String type;
    private String numberFormat;
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
