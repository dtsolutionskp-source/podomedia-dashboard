import fs from "node:fs/promises";
import path from "node:path";

import { loadAgeCsv, loadGenderCsv } from "./csv";
import { getDataRoot, scanDataRoot, expectedFileName, marketCsvStem } from "./scan";
import type {
  BaselineMarketData,
  Market,
  SegmentMarketData,
} from "./types";

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveFilePath(opts: {
  dir: string;
  market: Market | "전체";
  dim: "성별" | "연령";
}): Promise<{ path: string | null; usedFallback: boolean }> {
  const expected = path.join(opts.dir, expectedFileName(opts.market, opts.dim));
  if (await fileExists(expected)) return { path: expected, usedFallback: false };

  // 표시명 여의도인데 파일만 여의도_* 로 바꾼 배포 대비(선택)
  if (opts.market === "여의도") {
    const displayStem = path.join(opts.dir, `여의도_${opts.dim}.csv`);
    if (await fileExists(displayStem)) return { path: displayStem, usedFallback: true };
  }

  // 실데이터에서 자주 발생하는 파일명 오타/변형을 허용
  // 예: "명동_셩별.csv" (성별 오타)
  if (opts.dim === "성별") {
    const stem = opts.market === "전체" ? "전체" : marketCsvStem(opts.market);
    const fallbackNames = [
      `${stem}_셩별.csv`,
      `${stem}_성별 .csv`, // trailing space case (rare)
    ];
    for (const n of fallbackNames) {
      const p = path.join(opts.dir, n);
      if (await fileExists(p)) return { path: p, usedFallback: true };
    }
  }

  return { path: null, usedFallback: false };
}

export async function loadBaselineForMarket(
  market: Market,
  dataRoot = getDataRoot(),
): Promise<BaselineMarketData> {
  const scan = await scanDataRoot(dataRoot);
  const missingFiles: string[] = [];
  if (!scan.baselineDir) {
    return {
      market,
      gender: undefined,
      age: undefined,
      sourceFiles: {},
      status: { gender: "missing", age: "missing" },
      parseNotes: ["기본정보 폴더를 찾을 수 없습니다."],
      missingFiles: ["기본정보"],
    };
  }

  const genderResolved = await resolveFilePath({ dir: scan.baselineDir, market, dim: "성별" });
  const ageResolved = await resolveFilePath({ dir: scan.baselineDir, market, dim: "연령" });

  const parseNotes: string[] = [];
  let gender: BaselineMarketData["gender"];
  let age: BaselineMarketData["age"];
  const sourceFiles: BaselineMarketData["sourceFiles"] = {};
  const status: BaselineMarketData["status"] = { gender: "missing", age: "missing" };

  if (genderResolved.path) {
    sourceFiles.gender = genderResolved.path;
    try {
      gender = await loadGenderCsv(genderResolved.path);
      status.gender = "ok";
      if (genderResolved.usedFallback) {
        parseNotes.push(`성별 파일명을 대체로 인식했습니다: ${path.basename(genderResolved.path)}`);
      }
    } catch {
      status.gender = "error";
      parseNotes.push(`성별 파일 파싱 실패: ${path.basename(genderResolved.path)}`);
    }
  } else {
    missingFiles.push(path.join(scan.baselineDir, expectedFileName(market, "성별")));
  }

  if (ageResolved.path) {
    sourceFiles.age = ageResolved.path;
    try {
      age = await loadAgeCsv(ageResolved.path);
      status.age = "ok";
      if (ageResolved.usedFallback) {
        parseNotes.push(`연령 파일명을 대체로 인식했습니다: ${path.basename(ageResolved.path)}`);
      }
    } catch {
      status.age = "error";
      parseNotes.push(`연령 파일 파싱 실패: ${path.basename(ageResolved.path)}`);
    }
  } else {
    missingFiles.push(path.join(scan.baselineDir, expectedFileName(market, "연령")));
  }

  return { market, gender, age, sourceFiles, status, parseNotes, missingFiles };
}

export async function loadSegmentForMarket(
  segmentId: string,
  market: Market | "전체",
  dataRoot = getDataRoot(),
): Promise<SegmentMarketData> {
  const segmentDir = path.join(dataRoot, segmentId);
  const missingFiles: string[] = [];

  const genderResolved = await resolveFilePath({ dir: segmentDir, market, dim: "성별" });
  const ageResolved = await resolveFilePath({ dir: segmentDir, market, dim: "연령" });

  const parseNotes: string[] = [];
  let gender: SegmentMarketData["gender"];
  let age: SegmentMarketData["age"];
  const sourceFiles: SegmentMarketData["sourceFiles"] = {};
  const status: SegmentMarketData["status"] = { gender: "missing", age: "missing" };

  if (genderResolved.path) {
    sourceFiles.gender = genderResolved.path;
    try {
      gender = await loadGenderCsv(genderResolved.path);
      status.gender = "ok";
      if (genderResolved.usedFallback) {
        parseNotes.push(`성별 파일명을 대체로 인식했습니다: ${path.basename(genderResolved.path)}`);
      }
    } catch {
      status.gender = "error";
      parseNotes.push(`성별 파일 파싱 실패: ${path.basename(genderResolved.path)}`);
    }
  } else {
    missingFiles.push(path.join(segmentDir, expectedFileName(market, "성별")));
  }

  if (ageResolved.path) {
    sourceFiles.age = ageResolved.path;
    try {
      age = await loadAgeCsv(ageResolved.path);
      status.age = "ok";
      if (ageResolved.usedFallback) {
        parseNotes.push(`연령 파일명을 대체로 인식했습니다: ${path.basename(ageResolved.path)}`);
      }
    } catch {
      status.age = "error";
      parseNotes.push(`연령 파일 파싱 실패: ${path.basename(ageResolved.path)}`);
    }
  } else {
    missingFiles.push(path.join(segmentDir, expectedFileName(market, "연령")));
  }

  return {
    segmentId,
    segmentName: segmentId.replaceAll("_", " "),
    market,
    gender,
    age,
    sourceFiles,
    status,
    parseNotes,
    missingFiles,
  };
}

export async function listSegments(dataRoot = getDataRoot()): Promise<
  { segmentId: string; segmentName: string }[]
> {
  const scan = await scanDataRoot(dataRoot);
  return scan.segmentDirs.map((d) => ({ segmentId: d.segmentId, segmentName: d.segmentName }));
}

