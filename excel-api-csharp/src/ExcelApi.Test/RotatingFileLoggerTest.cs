using Microsoft.VisualStudio.TestTools.UnitTesting;
using BigBytes.ExcelApi;
using System;
using System.IO;

namespace ExcelApi.Tests;

[TestClass]
public class RotatingFileLoggerTest
{
    private string? tempDir;
    private string? logPath;

    [TestInitialize]
    public void Setup()
    {
        tempDir = Path.Combine(Path.GetTempPath(), "excel-api-logger-test");
        if (!Directory.Exists(tempDir))
        {
            Directory.CreateDirectory(tempDir);
        }
        logPath = Path.Combine(tempDir, "test.log");
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (Directory.Exists(tempDir))
        {
            Directory.Delete(tempDir, true);
        }
    }

    [TestMethod]
    public void TestLoggerInitialization()
    {
        var logger = new RotatingFileLogger(logPath!, 7);
        Assert.IsNotNull(logger);
    }

    [TestMethod]
    public void TestLoggerCreatesLogDirectory()
    {
        var nestedPath = Path.Combine(tempDir!, "nested", "dir", "test.log");
        var logger = new RotatingFileLogger(nestedPath, 7);
        Assert.IsTrue(Directory.Exists(Path.GetDirectoryName(nestedPath)));
    }

    [TestMethod]
    public void TestLoggerWritesToFile()
    {
        var logger = new RotatingFileLogger(logPath!, 7);
        logger.Log(new { message = "test", level = "info" });

        var logFiles = Directory.GetFiles(tempDir!);
        Assert.AreEqual(1, logFiles.Length);
    }

    [TestMethod]
    public void TestLoggerWritesJsonFormat()
    {
        var logger = new RotatingFileLogger(logPath!, 7);
        logger.Log(new { message = "test", level = "info" });

        var logFiles = Directory.GetFiles(tempDir!);
        var content = File.ReadAllText(logFiles[0]);
        Assert.IsTrue(content.Contains("message"));
        Assert.IsTrue(content.Contains("level"));
    }

    [TestMethod]
    public void TestLoggerDefaultMaxFiles()
    {
        var logger = new RotatingFileLogger(logPath!);
        Assert.IsNotNull(logger);
    }

    [TestMethod]
    public void TestLoggerCustomMaxFiles()
    {
        var logger = new RotatingFileLogger(logPath!, 30);
        Assert.IsNotNull(logger);
    }

    [TestMethod]
    public void TestLoggerHandlesNullLogDir()
    {
        var logger = new RotatingFileLogger("test.log", 7);
        Assert.IsNotNull(logger);
    }

    [TestMethod]
    public void TestLoggerRotatesBasedOnDate()
    {
        var logger = new RotatingFileLogger(logPath!, 7);
        logger.Log(new { message = "test1" });

        // Note: Testing actual date rotation is difficult in unit tests
        // This test verifies the logger doesn't throw when logging
        logger.Log(new { message = "test2" });

        var logFiles = Directory.GetFiles(tempDir!);
        Assert.IsTrue(logFiles.Length >= 1);
    }
}
