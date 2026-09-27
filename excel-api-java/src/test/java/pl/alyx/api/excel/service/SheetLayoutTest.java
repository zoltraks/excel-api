package pl.alyx.api.excel.service;

import org.junit.jupiter.api.Test;
import pl.alyx.api.excel.config.WorkbookConfig;

import static org.junit.jupiter.api.Assertions.*;

class SheetLayoutTest {

    @Test
    void shouldDefaultToSingleMode() {
        SheetLayout layout = SheetLayout.resolve(null);
        assertEquals(SheetLayout.MODE_SINGLE, layout.getMode());
        assertEquals(1, layout.getIdentifierRow());
        assertEquals(2, layout.getFirstDataRow());
        assertEquals(1, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveSingleModeWithCustomIdentifierRow() {
        WorkbookConfig.SheetHeaderConfig config = new WorkbookConfig.SheetHeaderConfig();
        config.setMode("single");
        config.setIdentifierRow(3);
        SheetLayout layout = SheetLayout.resolve(config);
        assertEquals(3, layout.getIdentifierRow());
        assertEquals(4, layout.getFirstDataRow());
        assertEquals(3, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveMultiModeFirstDataRowAfterLastHeaderRow() {
        WorkbookConfig.SheetHeaderConfig config = new WorkbookConfig.SheetHeaderConfig();
        config.setMode("multi");
        config.setIdentifierRow(1);
        config.setTypeRow(2);
        config.setDescriptionRow(3);
        SheetLayout layout = SheetLayout.resolve(config);
        assertEquals(4, layout.getFirstDataRow());
        assertEquals(3, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveNoneModeWithDataFromRowOne() {
        WorkbookConfig.SheetHeaderConfig config = new WorkbookConfig.SheetHeaderConfig();
        config.setMode("none");
        SheetLayout layout = SheetLayout.resolve(config);
        assertEquals(0, layout.getIdentifierRow());
        assertEquals(1, layout.getFirstDataRow());
        assertEquals(0, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveLegendMode() {
        WorkbookConfig.SheetHeaderConfig config = new WorkbookConfig.SheetHeaderConfig();
        config.setMode("legend");
        config.setLegendSheet("legend");
        config.setIdentifierRow(1);
        SheetLayout layout = SheetLayout.resolve(config);
        assertEquals("legend", layout.getLegendSheet());
        assertEquals(2, layout.getFirstDataRow());
    }
}
