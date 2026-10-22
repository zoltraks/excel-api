package pl.alyx.api.excel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;

public class ExcelFileServiceTest {
    private ExcelFileService excelService;

    @BeforeEach
    public void setUp() {
        excelService = new ExcelFileService();
    }

    @Test
    public void testReadSheetNamesThrowsOnNonExistentFile() {
        assertThrows(IOException.class, () -> {
            excelService.readSheetNames("/nonexistent/file.xlsx");
        });
    }

    @Test
    public void testServiceInstantiation() {
        assertNotNull(excelService);
    }
}
