// Excel operations unit tests

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import ExcelJS from "exceljs";
import { addRecord, readRange, readRecords, getSheetMetadata, getColumnDefinitions } from "./operations.js";

describe("addRecord", () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel-api-ops-"));
    filePath = path.join(tempDir, "test.xlsx");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("data");
    sheet.getRow(1).values = ["name", "value"];
    sheet.getRow(2).values = ["alpha", 1];
    sheet.getRow(3).values = ["beta", 2];
    sheet.getRow(4).values = ["gamma", 3];
    await workbook.xlsx.writeFile(filePath);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should insert after the given record index by shifting existing rows down", async () => {
    const result = await addRecord(filePath, "data", { name: "inserted", value: 99 }, undefined, 2);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("data");

    // after_row 2 = record index 2 = row 3 ('beta'); new record lands at row 4
    expect(result.index).toBe(3);
    expect(sheet?.getRow(3).getCell(1).value).toBe("beta");
    expect(sheet?.getRow(4).getCell(1).value).toBe("inserted");
    expect(sheet?.getRow(4).getCell(2).value).toBe(99);
    expect(sheet?.getRow(5).getCell(1).value).toBe("gamma");
    expect(sheet?.getRow(5).getCell(2).value).toBe(3);
  });

  it("should insert as first record when after_row is 0", async () => {
    const result = await addRecord(filePath, "data", { name: "first", value: 0 }, undefined, 0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("data");

    expect(result.index).toBe(1);
    expect(sheet?.getRow(1).getCell(1).value).toBe("name");
    expect(sheet?.getRow(2).getCell(1).value).toBe("first");
    expect(sheet?.getRow(3).getCell(1).value).toBe("alpha");
  });

  it("should append at end when after_row is not given", async () => {
    await addRecord(filePath, "data", { name: "appended", value: 4 });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("data");

    expect(sheet?.getRow(5).getCell(1).value).toBe("appended");
    expect(sheet?.getRow(4).getCell(1).value).toBe("gamma");
  });
});

describe("readRange", () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel-api-ops-"));
    filePath = path.join(tempDir, "test.xlsx");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("data");
    sheet.getRow(1).values = ["a1", "b1", "c1"];
    sheet.getRow(2).values = ["a2", "b2", "c2"];
    sheet.getRow(3).values = ["a3", "b3", "c3"];
    sheet.getRow(4).values = ["a4", "b4", "c4"];
    await workbook.xlsx.writeFile(filePath);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return exactly the requested bounds", async () => {
    const data = await readRange(filePath, "data", "B2:C3");

    expect(data.range).toBe("B2:C3");
    expect(data.rows.length).toBe(2);
    expect(data.rows[0].row).toBe(2);
    expect(data.rows[0].cells.length).toBe(2);
    expect(data.rows[0].cells[0].ref).toBe("B2");
    expect(data.rows[0].cells[0].value).toBe("b2");
    expect(data.rows[0].cells[1].value).toBe("c2");
    expect(data.rows[1].cells[0].value).toBe("b3");
    expect(data.rows[1].cells[1].value).toBe("c3");
  });

  it("should reject malformed or inverted ranges", async () => {
    await expect(readRange(filePath, "data", "B2")).rejects.toThrow("Invalid range");
    await expect(readRange(filePath, "data", "C3:B2")).rejects.toThrow("Invalid range");
  });
});

describe("header modes", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel-api-hdr-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function writeWorkbook(
    name: string,
    build: (workbook: ExcelJS.Workbook) => void
  ): Promise<string> {
    const filePath = path.join(tempDir, name);
    const workbook = new ExcelJS.Workbook();
    build(workbook);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  it("single mode (default) uses row 1 as identifiers and row 2 as first data", async () => {
    const filePath = await writeWorkbook("single.xlsx", (wb) => {
      const sheet = wb.addWorksheet("data");
      sheet.getRow(1).values = ["id", "name"];
      sheet.getRow(2).values = [1, "alpha"];
      sheet.getRow(3).values = [2, "beta"];
    });

    const meta = await getSheetMetadata(filePath, "data", { mode: "single" });
    expect(meta.mode).toBe("table");
    expect(meta.header_row).toBe(1);
    expect(meta.first_data_row).toBe(2);

    const records = await readRecords(filePath, "data", { mode: "single" });
    expect(records.total).toBe(2);
    expect(records.items[0].data).toEqual({ id: 1, name: "alpha" });
  });

  it("unconfigured sheet defaults to single mode", async () => {
    const filePath = await writeWorkbook("plain.xlsx", (wb) => {
      const sheet = wb.addWorksheet("data");
      sheet.getRow(1).values = ["id"];
      sheet.getRow(2).values = [7];
    });

    const meta = await getSheetMetadata(filePath, "data");
    expect(meta.mode).toBe("table");
    expect(meta.first_data_row).toBe(2);
    const records = await readRecords(filePath, "data");
    expect(records.items[0].data).toEqual({ id: 7 });
  });

  it("multi mode uses identifier_row and skips type/description rows", async () => {
    const filePath = await writeWorkbook("multi.xlsx", (wb) => {
      const sheet = wb.addWorksheet("data");
      sheet.getRow(1).values = ["id", "name"]; // identifiers
      sheet.getRow(2).values = ["number", "string"]; // types
      sheet.getRow(3).values = ["identifier", "display name"]; // descriptions
      sheet.getRow(4).values = [1, "alpha"];
      sheet.getRow(5).values = [2, "beta"];
    });
    const config = { mode: "multi" as const, identifier_row: 1, type_row: 2, description_row: 3 };

    const meta = await getSheetMetadata(filePath, "data", config);
    expect(meta.mode).toBe("table");
    expect(meta.first_data_row).toBe(4);

    const records = await readRecords(filePath, "data", config);
    expect(records.total).toBe(2);
    expect(records.items[0].index).toBe(1);
    expect(records.items[0].data).toEqual({ id: 1, name: "alpha" });

    const columns = await getColumnDefinitions(filePath, "data", config);
    expect(columns.source).toBe("multi_row");
    expect(columns.columns[0].type).toBe("number");
    expect(columns.columns[0].descriptions?.default).toBe("identifier");
    expect(columns.columns[1].id).toBe("name");
  });

  it("none mode keys records by column letters starting at row 1", async () => {
    const filePath = await writeWorkbook("none.xlsx", (wb) => {
      const sheet = wb.addWorksheet("data");
      sheet.getRow(1).values = [10, "x"];
      sheet.getRow(2).values = [20, "y"];
    });
    const config = { mode: "none" as const };

    const meta = await getSheetMetadata(filePath, "data", config);
    expect(meta.mode).toBe("raw");
    expect(meta.first_data_row).toBe(1);

    const records = await readRecords(filePath, "data", config);
    expect(records.total).toBe(2);
    expect(records.items[0].index).toBe(1);
    expect(records.items[0].data).toEqual({ A: 10, B: "x" });
  });

  it("legend mode reads column ids from the legend sheet", async () => {
    const filePath = await writeWorkbook("legend.xlsx", (wb) => {
      const legend = wb.addWorksheet("legend");
      legend.getRow(1).values = ["A", "order_id"];
      legend.getRow(2).values = ["B", "amount"];
      const sheet = wb.addWorksheet("data");
      sheet.getRow(1).values = ["", ""];
      sheet.getRow(2).values = [7, 2.5];
      sheet.getRow(3).values = [8, 3.5];
    });
    const config = { mode: "legend" as const, legend_sheet: "legend", identifier_row: 1 };

    const columns = await getColumnDefinitions(filePath, "data", config);
    expect(columns.source).toBe("legend_sheet");
    expect(columns.columns.map((c) => c.id)).toEqual(["order_id", "amount"]);

    const records = await readRecords(filePath, "data", config);
    expect(records.items[0].data).toEqual({ order_id: 7, amount: 2.5 });
  });

  it("legend mode without legend_sheet throws", async () => {
    const filePath = await writeWorkbook("badlegend.xlsx", (wb) => {
      const sheet = wb.addWorksheet("data");
      sheet.getRow(1).values = [1];
    });
    await expect(readRecords(filePath, "data", { mode: "legend" })).rejects.toThrow(
      "legend_sheet is not configured"
    );
  });
});
