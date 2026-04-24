using BigBytes.ExcelApi.Util;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class DurationParserTest
{
    [TestMethod]
    public void ShouldParseSecondsCorrectly()
    {
        Assert.AreEqual(TimeSpan.FromSeconds(13), DurationParser.Parse("13s"));
        Assert.AreEqual(TimeSpan.FromSeconds(1), DurationParser.Parse("1s"));
        Assert.AreEqual(TimeSpan.FromSeconds(0), DurationParser.Parse("0s"));
    }

    [TestMethod]
    public void ShouldParseMinutesCorrectly()
    {
        Assert.AreEqual(TimeSpan.FromMinutes(3), DurationParser.Parse("3m"));
        Assert.AreEqual(TimeSpan.FromMinutes(1), DurationParser.Parse("1m"));
    }

    [TestMethod]
    public void ShouldParseHoursCorrectly()
    {
        Assert.AreEqual(TimeSpan.FromHours(154), DurationParser.Parse("154h"));
        Assert.AreEqual(TimeSpan.FromHours(1), DurationParser.Parse("1h"));
    }

    [TestMethod]
    public void ShouldThrowErrorForInvalidFormat()
    {
        Assert.ThrowsException<ArgumentException>(() => DurationParser.Parse("invalid"));
        Assert.ThrowsException<ArgumentException>(() => DurationParser.Parse("13"));
        Assert.ThrowsException<ArgumentException>(() => DurationParser.Parse("s"));
        Assert.ThrowsException<ArgumentException>(() => DurationParser.Parse("13x"));
        Assert.ThrowsException<ArgumentException>(() => DurationParser.Parse("3d"));
    }
}
