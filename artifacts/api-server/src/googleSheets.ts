import { ReplitConnectors, type ProxyOptions } from "@replit/connectors-sdk";
import type { MachineRow } from "@workspace/db";

const SPREADSHEET_ID = "1qESJ_m_TXZEO3PQItIL4KKYpUObsDFL0kGyTLJXU7Jg";
const SHEET_NAME = "Sheet1";
const SHEET_ROWS = 1000;
const DATA_START_ROW = 2;

function rangePath(range: string) {
  return encodeURIComponent(range);
}

async function sheetsRequest(path: string, init?: ProxyOptions) {
  const response = await new ReplitConnectors().proxy("google-sheet", path, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  return response;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function machineRow(machine: MachineRow) {
  return [
    formatDate(machine.createdAt),
    machine.name,
    machine.bedNumber,
    machine.workNo,
    machine.processes.reliability?.done ?? false,
    machine.processes.laser?.done ?? false,
    machine.processes.lkc?.done ?? false,
    machine.processes.fuc?.done ?? false,
    machine.processes.ct?.done ?? false,
    machine.processes.tag?.done ?? false,
    machine.remarks,
  ];
}

export async function syncMachinesToSheet(machines: MachineRow[]) {
  const valuesRange = `${SHEET_NAME}!A${DATA_START_ROW}:K${SHEET_ROWS}`;
  const readResponse = await sheetsRequest(
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${rangePath(valuesRange)}?valueRenderOption=FORMATTED_VALUE`,
  );
  const existing = (await readResponse.json()) as { values?: string[][] };
  const existingRows = existing.values ?? [];
  let lastUsedRow = DATA_START_ROW - 1;
  existingRows.forEach((row, index) => {
    if (row.some((cell) => String(cell ?? "").trim().length > 0)) {
      lastUsedRow = DATA_START_ROW + index;
    }
  });

  const clearEndRow = Math.max(lastUsedRow, DATA_START_ROW + machines.length - 1);
  await sheetsRequest(
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${rangePath(`${SHEET_NAME}!A${DATA_START_ROW}:K${Math.max(clearEndRow, DATA_START_ROW)}`)}:clear`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  );

  if (machines.length === 0) return;

  const rows = [...machines]
    .sort((left, right) => left.id - right.id)
    .map(machineRow);
  const writeRange = `${SHEET_NAME}!A${DATA_START_ROW}:K${DATA_START_ROW + rows.length - 1}`;
  await sheetsRequest(
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${rangePath(writeRange)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ majorDimension: "ROWS", values: rows }),
    },
  );
}