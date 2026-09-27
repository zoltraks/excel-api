namespace BigBytes.ExcelApi.Dto;

public class BatchCellRequest
{
    public List<Dictionary<string, object?>>? Operations { get; set; }
}

public class BatchRecordRequest
{
    public List<Dictionary<string, object?>>? Operations { get; set; }
}
