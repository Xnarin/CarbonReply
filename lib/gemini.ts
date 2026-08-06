import "server-only";

const MODEL = "gemini-2.5-flash";
const MAX_INLINE_PDF_BYTES = 15 * 1024 * 1024;

export type BillExtraction = {
  billingYear: number;
  billingMonth: number;
  usageKwh: number;
};

function asExtraction(value: unknown): BillExtraction | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const billingYear = Number(record.billingYear);
  const billingMonth = Number(record.billingMonth);
  const usageKwh = Number(record.usageKwh);
  if (!Number.isInteger(billingYear) || billingYear < 2020 || billingYear > 2100) return null;
  if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) return null;
  if (!Number.isFinite(usageKwh)) return null;
  return { billingYear, billingMonth, usageKwh };
}

export async function extractElectricityBill(pdf: ArrayBuffer): Promise<BillExtraction> {
  if (pdf.byteLength > MAX_INLINE_PDF_BYTES) {
    throw new Error("PDF is too large for inline analysis.");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is missing.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
            { text: "Read this Korean electricity bill. Return only JSON with billingYear (integer), billingMonth (1-12), and usageKwh (number). Use the billed electricity consumption in kWh, not the amount charged. If a field is unclear, do not guess." },
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              billingYear: { type: "INTEGER" },
              billingMonth: { type: "INTEGER" },
              usageKwh: { type: "NUMBER" },
            },
            required: ["billingYear", "billingMonth", "usageKwh"],
          },
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error("[gemini:bill] Request failed", { status: response.status });
    throw new Error("Gemini bill extraction failed.");
  }
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no bill data.");
  const result = asExtraction(JSON.parse(text));
  if (!result) throw new Error("Gemini returned invalid bill data.");
  return result;
}
