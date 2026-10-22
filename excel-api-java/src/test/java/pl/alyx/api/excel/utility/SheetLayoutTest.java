package pl.alyx.api.excel.utility;

import org.junit.jupiter.api.Test;
import pl.alyx.api.excel.configuration.WorkbookConfiguration;

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
        WorkbookConfiguration.SheetHeaderConfiguration configuration = new WorkbookConfiguration.SheetHeaderConfiguration();
        configuration.setMode("single");
        configuration.setIdentifierRow(3);
        SheetLayout layout = SheetLayout.resolve(configuration);
        assertEquals(3, layout.getIdentifierRow());
        assertEquals(4, layout.getFirstDataRow());
        assertEquals(3, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveMultiModeFirstDataRowAfterLastHeaderRow() {
        WorkbookConfiguration.SheetHeaderConfiguration configuration = new WorkbookConfiguration.SheetHeaderConfiguration();
        configuration.setMode("multi");
        configuration.setIdentifierRow(1);
        configuration.setTypeRow(2);
        configuration.setDescriptionRow(3);
        SheetLayout layout = SheetLayout.resolve(configuration);
        assertEquals(4, layout.getFirstDataRow());
        assertEquals(3, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveNoneModeWithDataFromRowOne() {
        WorkbookConfiguration.SheetHeaderConfiguration configuration = new WorkbookConfiguration.SheetHeaderConfiguration();
        configuration.setMode("none");
        SheetLayout layout = SheetLayout.resolve(configuration);
        assertEquals(0, layout.getIdentifierRow());
        assertEquals(1, layout.getFirstDataRow());
        assertEquals(0, layout.getFirstDataRowPoi());
    }

    @Test
    void shouldResolveLegendMode() {
        WorkbookConfiguration.SheetHeaderConfiguration configuration = new WorkbookConfiguration.SheetHeaderConfiguration();
        configuration.setMode("legend");
        configuration.setLegendSheet("legend");
        configuration.setIdentifierRow(1);
        SheetLayout layout = SheetLayout.resolve(configuration);
        assertEquals("legend", layout.getLegendSheet());
        assertEquals(2, layout.getFirstDataRow());
    }
}
