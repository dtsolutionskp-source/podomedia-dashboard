import fs from "node:fs/promises";
import path from "node:path";
import chardet from "chardet";
import iconv from "iconv-lite";
import Papa from "papaparse";

const DATA_ROOT = process.env.PODOMEDIA_DATA_ROOT?.trim() || "D:\\2026\\포도미디어";
const MARKETS = ["코엑스", "명동", "노량진"];

function expectedFileName(market, dim) {
  return `${market}_${dim}.csv`;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function pickEncoding(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return "utf8";
  return chardet.detect(buf) ?? "utf8";
}

async function readCsvText(filePath) {
  const buf = await fs.readFile(filePath);
  const enc = pickEncoding(buf);
  return iconv.decode(buf, enc);
}

async function parseCsvRows(filePath) {
  const text = await readCsvText(filePath);
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors?.length) {
    return { ok: false, error: `papaparse errors: ${parsed.errors[0]?.message ?? "unknown"}` };
  }
  return { ok: true, rows: parsed.data };
}

async function resolveFile(dir, market, dim) {
  const expected = path.join(dir, expectedFileName(market, dim));
  if (await fileExists(expected)) return { path: expected, usedFallback: false };
  if (dim === "성별") {
    const fb = path.join(dir, `${market}_셩별.csv`);
    if (await fileExists(fb)) return { path: fb, usedFallback: true };
  }
  return { path: null, usedFallback: false };
}

async function checkGender(filePath) {
  const parsed = await parseCsvRows(filePath);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const rows = parsed.rows ?? [];
  const hasCategory = rows.some((r) => Object.prototype.hasOwnProperty.call(r, "Category"));
  const hasValue = rows.some((r) => Object.prototype.hasOwnProperty.call(r, "성별"));
  if (!hasCategory || !hasValue) return { ok: false, error: "missing columns (Category/성별)" };
  return { ok: true };
}

async function checkAge(filePath) {
  const parsed = await parseCsvRows(filePath);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const rows = parsed.rows ?? [];
  const hasCategory = rows.some((r) => Object.prototype.hasOwnProperty.call(r, "Category"));
  const hasValue = rows.some((r) => Object.prototype.hasOwnProperty.call(r, "연령대"));
  if (!hasCategory || !hasValue) return { ok: false, error: "missing columns (Category/연령대)" };
  return { ok: true };
}

async function checkPair(dir, market) {
  const gender = await resolveFile(dir, market, "성별");
  const age = await resolveFile(dir, market, "연령");

  const result = {
    gender: { status: "missing", path: null, usedFallback: false, error: null },
    age: { status: "missing", path: null, usedFallback: false, error: null },
    missing: [],
    notes: [],
  };

  if (gender.path) {
    result.gender.path = gender.path;
    result.gender.usedFallback = gender.usedFallback;
    if (gender.usedFallback) result.notes.push(`gender fallback: ${path.basename(gender.path)}`);
    const chk = await checkGender(gender.path);
    if (chk.ok) result.gender.status = "ok";
    else {
      result.gender.status = "error";
      result.gender.error = chk.error;
    }
  } else {
    result.missing.push(expectedFileName(market, "성별"));
  }

  if (age.path) {
    result.age.path = age.path;
    result.age.usedFallback = age.usedFallback;
    const chk = await checkAge(age.path);
    if (chk.ok) result.age.status = "ok";
    else {
      result.age.status = "error";
      result.age.error = chk.error;
    }
  } else {
    result.missing.push(expectedFileName(market, "연령"));
  }

  return result;
}

function penaltyFor(check) {
  const baseBad = check.gender.status !== "ok" && check.age.status !== "ok" ? 6 : 0;
  const segBad = check.gender.status !== "ok" && check.age.status !== "ok" ? 8 : check.missing.length ? 2 : 0;
  // Note: 여기선 baseline/segment 구분 없이 "pair" 자체만 평가.
  // 실제 앱은 baseline과 segment를 따로 계산하므로, 결과는 '원인 파악용'으로 충분.
  return { segBad, reasons: explainPenalty(check, segBad) };
}

function explainPenalty(check, segBad) {
  const reasons = [];
  if (segBad === 8) reasons.push("성별/연령 둘 다 ok가 아님(둘 다 missing 또는 error)");
  if (segBad === 2) reasons.push("일부 파일 누락");
  if (check.missing.length) reasons.push(`missing: ${check.missing.join(", ")}`);
  if (check.gender.status === "error") reasons.push(`gender parse error: ${check.gender.error}`);
  if (check.age.status === "error") reasons.push(`age parse error: ${check.age.error}`);
  if (check.notes.length) reasons.push(`notes: ${check.notes.join(" | ")}`);
  return reasons;
}

async function main() {
  const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
  const segmentDirs = entries.filter((e) => e.isDirectory() && e.name !== "기본정보").map((e) => e.name);

  const problems = [];
  for (const seg of segmentDirs) {
    const dir = path.join(DATA_ROOT, seg);
    for (const m of MARKETS) {
      const chk = await checkPair(dir, m);
      const { segBad, reasons } = penaltyFor(chk);
      if (segBad) {
        problems.push({
          segment: seg,
          market: m,
          penalty: segBad,
          reasons,
        });
      }
    }
  }

  const summary = {
    dataRoot: DATA_ROOT,
    totalSegments: segmentDirs.length,
    totalProblems: problems.length,
    byPenalty: problems.reduce((acc, p) => {
      acc[p.penalty] = (acc[p.penalty] ?? 0) + 1;
      return acc;
    }, {}),
  };

  console.log(JSON.stringify({ summary, problems }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

