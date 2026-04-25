using Microsoft.VisualStudio.TestTools.UnitTesting;
using BigBytes.ExcelApi;
using BigBytes.ExcelApi.Services;

namespace ExcelApi.Tests;

[TestClass]
public class ExcelServiceTest
{
    [TestMethod]
    public void TestServiceInstantiation()
    {
        var service = new ExcelService();
        Assert.IsNotNull(service);
    }

    [TestMethod]
    public void TestReadSheetNamesThrowsOnNonExistentFile()
    {
        var service = new ExcelService();
        Assert.ThrowsException<System.IO.FileNotFoundException>(() =>
        {
            service.ReadSheetNames("/nonexistent/file.xlsx");
        });
    }
}
