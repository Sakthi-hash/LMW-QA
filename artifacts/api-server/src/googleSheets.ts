import type { MachineRow } from "@workspace/db";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1qESJ_m_TXZEO3PQItIL4KKYpUObsDFL0kGyTLJXU7Jg";
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1";

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

/**
 * Sync machines to Google Sheets.
 * Supports:
 * 1. GOOGLE_SHEETS_WEBHOOK_URL (Google Apps Script Web App Endpoint)
 * 2. GOOGLE_SHEETS_API_KEY / Access Token
 */
export async function syncMachinesToSheet(machines: MachineRow[]) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;

  const rows = [...machines]
    .sort((left, right) => left.id - right.id)
    .map(machineRow);

  // Method 1: Google Apps Script Webhook (Recommended for easy setup)
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          machines: rows,
        }),
      });
      if (!response.ok) {
        console.warn(`Google Sheets Webhook sync status: ${response.status}`);
      } else {
        console.log("Instant Google Sheets sync complete via Webhook!");
      }
    } catch (err) {
      console.warn("Google Sheets Webhook sync error:", err);
    }
    return;
  }

  // Method 2: Google Sheets API v4 with Bearer Access Token / API Key
  if (accessToken || apiKey) {
    try {
      const range = `${SHEET_NAME}!A2:K${Math.max(100, 1 + rows.length)}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED${apiKey ? `&key=${apiKey}` : ""}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ majorDimension: "ROWS", values: rows }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.warn(`Google Sheets API sync failed (${response.status}): ${text.slice(0, 200)}`);
      } else {
        console.log("Instant Google Sheets sync complete via Google Sheets API!");
      }
    } catch (err) {
      console.warn("Google Sheets API sync error:", err);
    }
    return;
  }
}