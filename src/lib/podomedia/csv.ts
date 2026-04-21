import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import iconv from "iconv-lite";
import chardet from "chardet";

import type {
  AgeDistribution,
  GenderDistribution,
  GenderKey,
  RatioCount,
} from "./types";

function normalizeNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const cleaned = v.replaceAll(",", "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pickEncoding(buf: Buffer): BufferEncoding | string {
  // 우선 BOM(utf-8-sig) 처리
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return "utf8";
  }
  const detected = chardet.detect(buf);
  // chardet는 'UTF-8', 'EUC-KR', 'CP949' 등 다양한 값을 줄 수 있음
  return detected ?? "utf8";
}

export async function readCsvText(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  const encoding = pickEncoding(buf);
  // iconv-lite는 'utf8', 'cp949', 'euc-kr' 등을 잘 처리함
  return iconv.decode(buf, encoding);
}

export async function parseCsvRows(filePath: string): Promise<Record<string, string>[]> {
  const text = await readCsvText(filePath);
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors?.length && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[CSV parse warning]", path.basename(filePath), parsed.errors.slice(0, 3));
  }

  return parsed.data.filter(Boolean);
}

function ratioize(items: { key: string; count: number }[]): RatioCount[] {
  const total = items.reduce((acc, it) => acc + it.count, 0);
  return items.map((it) => ({
    key: it.key,
    count: it.count,
    ratio: total > 0 ? it.count / total : 0,
  }));
}

function parseGenderKey(label: string): GenderKey | null {
  const s = label.trim();
  if (s.startsWith("남성")) return "남성";
  if (s.startsWith("여성")) return "여성";
  return null;
}

export async function loadGenderCsv(filePath: string): Promise<GenderDistribution> {
  const rows = await parseCsvRows(filePath);
  // 기대 형태:
  // "Category","성별"
  // "남성[67.2%]",161880
  // "여성[32.8%]",78976

  // 최소한의 유효성 검사: 성별 컬럼이 없으면 "잘못된 파일"로 판단
  if (rows.length && !("성별" in (rows[0] ?? {}))) {
    throw new Error(`Invalid gender CSV (missing column '성별'): ${filePath}`);
  }

  const itemsRaw: { key: string; count: number }[] = [];
  for (const r of rows) {
    const category = String(r["Category"] ?? "").trim();
    const count = normalizeNumber(r["성별"]);
    const key = parseGenderKey(category);
    if (!key) continue;
    itemsRaw.push({ key, count });
  }

  const ratioItems = ratioize(itemsRaw);
  const total = ratioItems.reduce((a, it) => a + it.count, 0);
  if (rows.length && total === 0) {
    // 파일은 있는데 파싱 결과가 0이면 포맷이 다른 경우(예: 연령 파일이 들어온 경우)로 처리
    throw new Error(`Invalid gender CSV (total=0): ${filePath}`);
  }
  const byKey = Object.fromEntries(ratioItems.map((x) => [x.key, x])) as Record<
    GenderKey,
    RatioCount
  >;

  return {
    total,
    items: {
      남성: byKey["남성"] ?? { key: "남성", count: 0, ratio: 0 },
      여성: byKey["여성"] ?? { key: "여성", count: 0, ratio: 0 },
    },
  };
}

export async function loadAgeCsv(filePath: string): Promise<AgeDistribution> {
  const rows = await parseCsvRows(filePath);
  // 기대 형태:
  // "Category","연령대"
  // "20세 ~ 24세",884
  // 최소한의 유효성 검사: 연령대 컬럼이 없으면 "잘못된 파일"로 판단
  if (rows.length && !("연령대" in (rows[0] ?? {}))) {
    throw new Error(`Invalid age CSV (missing column '연령대'): ${filePath}`);
  }

  const itemsRaw: { key: string; count: number }[] = [];
  for (const r of rows) {
    const key = String(r["Category"] ?? "").trim();
    const count = normalizeNumber(r["연령대"]);
    if (!key) continue;
    itemsRaw.push({ key, count });
  }
  const items = ratioize(itemsRaw);
  const total = items.reduce((a, it) => a + it.count, 0);
  if (rows.length && total === 0) {
    throw new Error(`Invalid age CSV (total=0): ${filePath}`);
  }
  return { total, items };
}

