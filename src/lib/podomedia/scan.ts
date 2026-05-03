import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { DIMENSIONS, MARKETS, type Dimension, type Market } from "./types";

/** CSV 파일명 접두어. 레거시 데이터가 `노량진_*`인 경우 UI 상권명만 여의도로 둡니다. */
export function marketCsvStem(market: Market): string {
  return market === "여의도" ? "노량진" : market;
}

export type DataRootScan = {
  dataRoot: string;
  baselineDir: string | null;
  segmentDirs: { segmentId: string; segmentName: string; dirPath: string }[];
  warnings: string[];
};

/** 프로젝트 루트의 `data` 폴더. 배포 시 `PODOMEDIA_DATA_ROOT`로 다른 경로 지정 가능 */
export function getDataRoot(): string {
  const env = process.env.PODOMEDIA_DATA_ROOT?.trim();
  if (env) return env;
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data");
}

export async function scanDataRoot(dataRoot = getDataRoot()): Promise<DataRootScan> {
  const warnings: string[] = [];
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dataRoot, { withFileTypes: true });
  } catch {
    return {
      dataRoot,
      baselineDir: null,
      segmentDirs: [],
      warnings: [
        "데이터 폴더를 찾을 수 없습니다. 프로젝트 루트의 data 폴더를 확인하거나 환경 변수 PODOMEDIA_DATA_ROOT를 설정해 주세요.",
      ],
    };
  }

  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const baselineDirName = dirs.find((d) => d === "기본정보") ?? null;
  const baselineDir = baselineDirName ? path.join(dataRoot, baselineDirName) : null;

  if (!baselineDir) warnings.push("상권 기본 데이터(기본정보)를 찾지 못했습니다. 차트가 비어 있을 수 있습니다.");

  const segmentDirs = dirs
    .filter((d) => d !== "기본정보")
    .map((d) => ({
      segmentId: d,
      segmentName: d.replaceAll("_", " "),
      dirPath: path.join(dataRoot, d),
    }))
    .sort((a, b) => a.segmentName.localeCompare(b.segmentName, "ko"));

  return { dataRoot, baselineDir, segmentDirs, warnings };
}

export function expectedFileName(market: Market | "전체", dim: Dimension): string {
  const stem = market === "전체" ? "전체" : marketCsvStem(market);
  return `${stem}_${dim}.csv`;
}

export function listExpectedFilesForSegment(): string[] {
  const files: string[] = [];
  for (const dim of DIMENSIONS) {
    files.push(expectedFileName("전체", dim));
    for (const market of MARKETS) files.push(expectedFileName(market, dim));
  }
  return files;
}

export function listExpectedFilesForBaseline(): string[] {
  const files: string[] = [];
  for (const dim of DIMENSIONS) {
    for (const market of MARKETS) files.push(expectedFileName(market, dim));
  }
  return files;
}

