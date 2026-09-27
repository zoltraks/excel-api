namespace BigBytes.ExcelApi.Excel;

/// <summary>
/// Resolved header layout for a sheet. Canonical semantics (all
/// implementations): record index is 1-based; record N lives at row
/// <c>FirstDataRow + N - 1</c> (ClosedXML row numbers are 1-based).
/// <list type="bullet">
///   <item><c>single</c> (default): column ids on <c>identifier_row</c> (default 1).</item>
///   <item><c>multi</c>: ids on <c>identifier_row</c>, types on <c>type_row</c>,
///     descriptions on <c>description_row</c>; data starts after the last
///     configured header row.</item>
///   <item><c>legend</c>: column ids come from <c>legend_sheet</c> (rows:
///     letter,id,type,description starting at row 1); data starts at
///     <c>identifier_row + 1</c> when set, else 1.</item>
///   <item><c>none</c>: no header; record data is keyed by column letters; data
///     starts at row 1.</item>
/// </list>
/// </summary>
public sealed class SheetLayout
{
    public const string ModeSingle = "single";
    public const string ModeMulti = "multi";
    public const string ModeLegend = "legend";
    public const string ModeNone = "none";

    public string Mode { get; private set; } = ModeSingle;

    /// <summary>1-based identifier row; 0 when mode is <c>none</c>.</summary>
    public int IdentifierRow { get; private set; } = 1;
    public int TypeRow { get; private set; }
    public int DescriptionRow { get; private set; }
    public string? LegendSheet { get; private set; }

    /// <summary>1-based sheet row of record index 1.</summary>
    public int FirstDataRow { get; private set; } = 2;

    public static SheetLayout Resolve(SheetHeaderConfig? config)
    {
        var mode = string.IsNullOrEmpty(config?.Mode) ? ModeSingle : config!.Mode;
        int identifierRow = mode == ModeNone ? 0 : config?.IdentifierRow ?? 1;
        int typeRow = config?.TypeRow ?? 0;
        int descriptionRow = config?.DescriptionRow ?? 0;
        string? legendSheet = string.IsNullOrEmpty(config?.LegendSheet) ? null : config!.LegendSheet;

        int firstDataRow = mode switch
        {
            ModeNone => 1,
            ModeLegend => identifierRow + 1,
            _ => Math.Max(identifierRow, Math.Max(typeRow, descriptionRow)) + 1,
        };

        return new SheetLayout
        {
            Mode = mode,
            IdentifierRow = identifierRow,
            TypeRow = typeRow,
            DescriptionRow = descriptionRow,
            LegendSheet = legendSheet,
            FirstDataRow = firstDataRow
        };
    }
}
