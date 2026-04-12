import type { DrumPattern, TimeSignature } from "../theory/model";
import { db } from "./db";

export async function getAllCustomPatterns(): Promise<DrumPattern[]> {
	return db.drumPatterns.toArray();
}

export async function saveCustomPattern(pattern: DrumPattern): Promise<void> {
	await db.drumPatterns.put(pattern);
}

export async function deleteCustomPattern(id: string): Promise<void> {
	await db.drumPatterns.delete(id);
}

export function tsMatchesPattern(ts: TimeSignature, pattern: DrumPattern) {
	return (
		pattern.timeSignature.numerator === ts.numerator &&
		pattern.timeSignature.denominator === ts.denominator
	);
}
