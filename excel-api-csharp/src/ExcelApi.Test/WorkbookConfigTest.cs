using Microsoft.VisualStudio.TestTools.UnitTesting;
using BigBytes.ExcelApi;

namespace ExcelApi.Tests;

[TestClass]
public class WorkbookConfigTest
{
    [TestMethod]
    public void TestConfigInitialization()
    {
        var config = new WorkbookConfig();
        Assert.IsNotNull(config);
    }

    [TestMethod]
    public void TestConfigEntries()
    {
        var config = new WorkbookConfig();
        Assert.IsNotNull(config.Workbooks);
    }

    [TestMethod]
    public void TestConfigDirectory()
    {
        var config = new WorkbookConfig();
        Assert.IsNotNull(config.Directory);
    }

    [TestMethod]
    public void TestConfigProfiles()
    {
        var config = new WorkbookConfig();
        Assert.IsNotNull(config.Profiles);
    }

    [TestMethod]
    public void TestConfigAddEntry()
    {
        var config = new WorkbookConfig();
        config.Workbooks.Add(new WorkbookEntry
        {
            Id = "test1",
            Path = "test.xlsx",
            Readonly = false
        });
        Assert.AreEqual(1, config.Workbooks.Count);
    }
}
