const DEFAULT_RUBIS_API_URL = "https://api.rubis.app/v2";

export interface RubisScrap {
  success: boolean;
  scrapID: string;
  public: boolean;
  raw: string;
  raw_with_key?: string;
  view: string;
  view_with_key?: string;
  title: string;
}

function rubisApiUrl(): string {
  return process.env.RUBIS_API_URL?.trim() || DEFAULT_RUBIS_API_URL;
}

export async function createRubisScrap(source: string, title: string): Promise<RubisScrap> {
  const url = new URL(`${rubisApiUrl().replace(/\/$/, "")}/scrap`);
  url.searchParams.set("public", "false");
  url.searchParams.set("title", title);

  const response = await fetch(url, {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "text/plain; charset=utf-8" },
    body: source,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Rubis upload failed (${response.status}).`);

  const result = await response.json() as Partial<RubisScrap>;
  if (!result.success || !result.scrapID || !result.raw || !result.view) {
    throw new Error("Rubis returned an invalid scrap response.");
  }
  return result as RubisScrap;
}

export function createRubisFetchSnippet(scrap: RubisScrap): string {
  const rawUrl = scrap.raw_with_key || scrap.raw;
  return `const response = await fetch(${JSON.stringify(rawUrl)});\nconst data = await response.text();\n\nconsole.log(data);`;
}