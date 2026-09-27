package pl.alyx.api.excel.service;

import pl.alyx.api.excel.config.WorkbookConfig;

/**
 * Resolved header layout for a sheet. Canonical semantics (all implementations):
 * record index is 1-based; record N lives at row {@code firstDataRow + N - 1}
 * (1-based sheet row; POI's 0-based row index is {@code firstDataRowPoi}).
 * <ul>
 *   <li>{@code single} (default): column ids on {@code identifier_row} (default 1).</li>
 *   <li>{@code multi}: ids on {@code identifier_row}, types on {@code type_row},
 *       descriptions on {@code description_row}; data starts after the last
 *       configured header row.</li>
 *   <li>{@code legend}: column ids come from {@code legend_sheet} (rows:
 *       letter,id,type,description starting at row 1); data starts at
 *       {@code identifier_row + 1} when set, else 1.</li>
 *   <li>{@code none}: no header; record data is keyed by column letters; data
 *       starts at row 1.</li>
 * </ul>
 */
public final class SheetLayout {

    public static final String MODE_SINGLE = "single";
    public static final String MODE_MULTI = "multi";
    public static final String MODE_LEGEND = "legend";
    public static final String MODE_NONE = "none";

    private final String mode;
    private final int identifierRow;
    private final int typeRow;
    private final int descriptionRow;
    private final String legendSheet;
    private final int firstDataRow;

    private SheetLayout(
            final String mode,
            final int identifierRow,
            final int typeRow,
            final int descriptionRow,
            final String legendSheet,
            final int firstDataRow) {
        this.mode = mode;
        this.identifierRow = identifierRow;
        this.typeRow = typeRow;
        this.descriptionRow = descriptionRow;
        this.legendSheet = legendSheet;
        this.firstDataRow = firstDataRow;
    }

    public static SheetLayout resolve(final WorkbookConfig.SheetHeaderConfig config) {
        final String mode = config != null && config.getMode() != null
                ? config.getMode() : MODE_SINGLE;
        final int identifierRow = MODE_NONE.equals(mode)
                ? 0
                : config != null && config.getIdentifierRow() != null
                        ? config.getIdentifierRow() : 1;
        final int typeRow = config != null && config.getTypeRow() != null
                ? config.getTypeRow() : 0;
        final int descriptionRow = config != null && config.getDescriptionRow() != null
                ? config.getDescriptionRow() : 0;
        final String legendSheet = config != null ? config.getLegendSheet() : null;

        final int firstDataRow;
        switch (mode) {
            case MODE_NONE:
                firstDataRow = 1;
                break;
            case MODE_LEGEND:
                firstDataRow = identifierRow + 1;
                break;
            default:
                firstDataRow = Math.max(identifierRow, Math.max(typeRow, descriptionRow)) + 1;
                break;
        }
        return new SheetLayout(mode, identifierRow, typeRow, descriptionRow, legendSheet, firstDataRow);
    }

    public String getMode() {
        return mode;
    }

    /** 1-based identifier row; 0 when mode is {@code none}. */
    public int getIdentifierRow() {
        return identifierRow;
    }

    public int getTypeRow() {
        return typeRow;
    }

    public int getDescriptionRow() {
        return descriptionRow;
    }

    public String getLegendSheet() {
        return legendSheet;
    }

    /** 1-based sheet row of record index 1. */
    public int getFirstDataRow() {
        return firstDataRow;
    }

    /** 0-based POI row index of record index 1. */
    public int getFirstDataRowPoi() {
        return firstDataRow - 1;
    }
}
