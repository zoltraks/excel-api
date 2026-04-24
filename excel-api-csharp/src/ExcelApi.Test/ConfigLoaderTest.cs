using BigBytes.ExcelApi;
using BigBytes.ExcelApi.Config;
using System;
using System.IO;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class ConfigLoaderTest
{
    private const string TempDir = "/tmp/excel-api-test-csharp";
    private const string ConfigPath = TempDir + "/config.yaml";

    public ConfigLoaderTest()
    {
        if (!Directory.Exists(TempDir))
        {
            Directory.CreateDirectory(TempDir);
        }
    }

    [TestMethod]
    public void ShouldResolveLifecycleFromConfigFile()
    {
        string configContent = """
directory: /data/workbooks
workbooks: []
profiles: {}
lifecycle:
  life: 30s
""";
        File.WriteAllText(ConfigPath, configContent);
        Environment.SetEnvironmentVariable("CONFIG", ConfigPath);

        var config = ConfigLoader.LoadConfig<WorkbookConfig>(null, ConfigPath, false);

        Assert.IsNotNull(config.Lifecycle);
        Assert.AreEqual("30s", config.Lifecycle.Life);

        Environment.SetEnvironmentVariable("CONFIG", null);
        File.Delete(ConfigPath);
    }

    [TestMethod]
    public void ShouldOverrideLifecycleWithEnvironmentVariable()
    {
        string configContent = """
directory: /data/workbooks
workbooks: []
profiles: {}
lifecycle:
  life: 30s
""";
        File.WriteAllText(ConfigPath, configContent);
        Environment.SetEnvironmentVariable("CONFIG", ConfigPath);
        Environment.SetEnvironmentVariable("LIFE", "60s");

        var config = ConfigLoader.LoadConfig<WorkbookConfig>(null, ConfigPath, false);

        Assert.IsNotNull(config.Lifecycle);
        Assert.AreEqual("60s", config.Lifecycle.Life);

        Environment.SetEnvironmentVariable("CONFIG", null);
        Environment.SetEnvironmentVariable("LIFE", null);
        File.Delete(ConfigPath);
    }

    [TestMethod]
    public void ShouldOverrideLifecycleWithCLIArgument()
    {
        string configContent = """
directory: /data/workbooks
workbooks: []
profiles: {}
lifecycle:
  life: 30s
""";
        File.WriteAllText(ConfigPath, configContent);
        Environment.SetEnvironmentVariable("CONFIG", ConfigPath);
        Environment.SetEnvironmentVariable("LIFE", "60s");

        var config = ConfigLoader.LoadConfig<WorkbookConfig>(null, ConfigPath, false);

        Assert.IsNotNull(config.Lifecycle);
        Assert.AreEqual("60s", config.Lifecycle.Life);

        Environment.SetEnvironmentVariable("CONFIG", null);
        Environment.SetEnvironmentVariable("LIFE", null);
        File.Delete(ConfigPath);
    }

    [TestMethod]
    public void ShouldNotSetLifecycleIfNoneProvided()
    {
        string configContent = """
directory: /data/workbooks
workbooks: []
profiles: {}
""";
        File.WriteAllText(ConfigPath, configContent);
        Environment.SetEnvironmentVariable("CONFIG", ConfigPath);

        var config = ConfigLoader.LoadConfig<WorkbookConfig>(null, ConfigPath, false);

        Assert.IsNull(config.Lifecycle);

        Environment.SetEnvironmentVariable("CONFIG", null);
        File.Delete(ConfigPath);
    }
}
