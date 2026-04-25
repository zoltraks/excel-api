namespace BigBytes.ExcelApi.Dto;

public class AddRecordRequest
{
    public Dictionary<string, object>? Data { get; set; }
    public int? AfterRow { get; set; }
    public int? CopyStyleFrom { get; set; }
}
