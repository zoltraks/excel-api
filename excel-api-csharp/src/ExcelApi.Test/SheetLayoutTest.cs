using Microsoft.VisualStudio.TestTools.UnitTesting;
using BigBytes.ExcelApi.Excel;

namespace ExcelApi.Test;

[TestClass]
public class SheetLayoutTest
{
    [TestMethod]
    public void DefaultsToSingleMode()
    {
        var layout = SheetLayout.Resolve(null);
        Assert.AreEqual(SheetLayout.ModeSingle, layout.Mode);
        Assert.AreEqual(1, layout.IdentifierRow);
        Assert.AreEqual(2, layout.FirstDataRow);
    }

    [TestMethod]
    public void SingleModeHonorsIdentifierRow()
    {
        var layout = SheetLayout.Resolve(new SheetHeaderConfig { Mode = "single", IdentifierRow = 3 });
        Assert.AreEqual(3, layout.IdentifierRow);
        Assert.AreEqual(4, layout.FirstDataRow);
    }

    [TestMethod]
    public void MultiModeFirstDataRowFollowsLastHeaderRow()
    {
        var layout = SheetLayout.Resolve(new SheetHeaderConfig
        {
            Mode = "multi",
            IdentifierRow = 1,
            TypeRow = 2,
            DescriptionRow = 3
        });
        Assert.AreEqual(4, layout.FirstDataRow);
    }

    [TestMethod]
    public void NoneModeStartsDataAtRowOne()
    {
        var layout = SheetLayout.Resolve(new SheetHeaderConfig { Mode = "none" });
        Assert.AreEqual(0, layout.IdentifierRow);
        Assert.AreEqual(1, layout.FirstDataRow);
    }

    [TestMethod]
    public void LegendModeResolvesLegendSheet()
    {
        var layout = SheetLayout.Resolve(new SheetHeaderConfig
        {
            Mode = "legend",
            LegendSheet = "legend",
            IdentifierRow = 1
        });
        Assert.AreEqual("legend", layout.LegendSheet);
        Assert.AreEqual(2, layout.FirstDataRow);
    }
}
