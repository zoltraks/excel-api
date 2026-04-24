namespace BigBytes.ExcelApi;

public class WorkbookConfig
{
    public string Directory { get; set; } = "";
    public List<WorkbookEntry> Workbooks { get; set; } = new List<WorkbookEntry>();
    public Dictionary<string, WorkbookProfile> Profiles { get; set; } = new Dictionary<string, WorkbookProfile>();
}

public class WorkbookEntry
{
    public string Id { get; set; } = "";
    public string Path { get; set; } = "";
    public bool Readonly { get; set; }
    public Dictionary<string, SheetHeaderConfig> Sheets { get; set; } = new Dictionary<string, SheetHeaderConfig>();
}

public class WorkbookProfile
{
    public List<WorkbookEntry> Entries { get; set; } = new List<WorkbookEntry>();
}

public class SheetHeaderConfig
{
    public string Mode { get; set; } = "none"; // "single", "multi", "legend", "none"
    public int? IdentifierRow { get; set; }
    public int? TypeRow { get; set; }
    public int? DescriptionRow { get; set; }
    public string LegendSheet { get; set; } = "";
}
