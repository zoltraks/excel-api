using Microsoft.VisualStudio.TestTools.UnitTesting;
using BigBytes.ExcelApi;
using BigBytes.ExcelApi.Options;

namespace ExcelApi.Tests.Options;

[TestClass]
public class WorkbookOptionsTests
{
    [TestMethod]
    public void TestConfigInitialization()
    {
        var config = new WorkbookOptions();
        Assert.IsNotNull(config);
    }

    [TestMethod]
    public void TestConfigEntries()
    {
        var config = new WorkbookOptions();
        Assert.IsNotNull(config.Workbooks);
    }

    [TestMethod]
    public void TestConfigDirectory()
    {
        var config = new WorkbookOptions();
        Assert.IsNotNull(config.Directory);
    }

    [TestMethod]
    public void TestConfigProfiles()
    {
        var config = new WorkbookOptions();
        Assert.IsNotNull(config.Profiles);
    }

    [TestMethod]
    public void TestConfigAddEntry()
    {
        var config = new WorkbookOptions();
        config.Workbooks.Add(new WorkbookEntry
        {
            Id = "test1",
            Path = "test.xlsx",
            Readonly = false
        });
        Assert.AreEqual(1, config.Workbooks.Count);
    }
}
