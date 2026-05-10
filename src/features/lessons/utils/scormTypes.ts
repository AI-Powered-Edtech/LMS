export interface ScormCommitPayload {
  cmiData: Record<string, string>;
  scoreRaw: number | null;
  scoreMax: number | null;
  lessonStatus: string;
  totalTimeSeconds: number;
  suspendData: string | null;
}
