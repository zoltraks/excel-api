using Microsoft.VisualStudio.TestTools.UnitTesting;
using BigBytes.ExcelApi;
using BigBytes.ExcelApi.Services;

namespace ExcelApi.Tests.Services;

[TestClass]
public class ExcelServiceTests
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
