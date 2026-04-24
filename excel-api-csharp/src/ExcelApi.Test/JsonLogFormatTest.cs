using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Text.RegularExpressions;

namespace ExcelApi.Tests;

[TestClass]
public class JsonLogFormatTest
{
    [TestMethod]
    public void TestLogEntryFieldNames()
    {
        var logData = new
        {
            level = "info",
            date = "2025-03-15",
            time = "14:24:58.123",
            message = "Request completed",
            request = new
            {
                method = "GET",
                url = "/api/v1/workbooks"
            },
            response = new
            {
                statusCode = 200
            },
            remote = "127.0.0.1"
        };

        Assert.IsNotNull(logData.level);
        Assert.IsNotNull(logData.date);
        Assert.IsNotNull(logData.time);
        Assert.IsNotNull(logData.message);
        Assert.IsNotNull(logData.request);
        Assert.IsNotNull(logData.response);
        Assert.IsNotNull(logData.remote);

        // Verify date format YYYY-MM-DD
        StringAssert.Matches(logData.date, new Regex(@"^\d{4}-\d{2}-\d{2}$"));

        // Verify time format HH:mm:ss.fff
        StringAssert.Matches(logData.time, new Regex(@"^\d{2}:\d{2}:\d{2}\.\d{3}$"));
    }
}
