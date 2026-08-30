import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect, Either, Schema } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { EXPECTED_MASCOT_POSE_PATHS } from './scripts/verify-package-war';
import {
	ClassOverBudget,
	CliArgsInvalid,
	DEFAULT_BUDGET_FILE,
	DEFAULT_OUTPUT_DIR,
	DuplicateMatch,
	ForbiddenArtifact,
	formatPackageSizeCliError,
	formatPackageSizeReport,
	MissingMatch,
	OutputDirMissing,
	PackageSizeBudgetsSchema,
	PackageSizeCheckFailed,
	parsePackageSizeCli,
	recordPackageSizeBudgets,
	runPackageSizeCli,
	TotalOverBudget,
	writeJsonAtomically,
	type PackageSizeBudgets,
} from './scripts/verify-package-size';

const FILE_BYTES = {
	background: 10,
	likesJs: 20,
	likesCss: 5,
	popupJs: 50,
	popupCss: 8,
	mascot: 7,
	icon: 3,
	popupHtml: 4,
	manifest: 6,
} as const;

const ICON_PATHS = [
	'icons/16.png',
	'icons/32.png',
	'icons/48.png',
	'icons/128.png',
] as const;

const DEFAULT_TOTAL_BYTES =
	FILE_BYTES.background +
	FILE_BYTES.likesJs +
	FILE_BYTES.likesCss +
	FILE_BYTES.popupJs +
	FILE_BYTES.popupCss +
	FILE_BYTES.mascot * EXPECTED_MASCOT_POSE_PATHS.length +
	FILE_BYTES.icon * ICON_PATHS.length +
	FILE_BYTES.popupHtml +
	FILE_BYTES.manifest;

const tempDirs: string[] = [];

function makeTempDir(): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'likes-to-go-size-'));
	tempDirs.push(dir);
	return dir;
}

function writeSizedFiles(
	root: string,
	files: Readonly<Record<string, number>>,
): void {
	for (const relativePath of Object.keys(files)) {
		const size = files[relativePath];
		if (size === undefined) {
			continue;
		}
		const absolutePath = path.join(root, relativePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, Buffer.alloc(size));
	}
}

function testBudgets(
	overrides: {
		readonly totalBytes?: number;
		readonly classBytes?: Readonly<Record<string, number>>;
	} = {},
): PackageSizeBudgets {
	const classBytes = overrides.classBytes ?? {};
	const bytesFor = (id: string, fallback: number): number => {
		const override = classBytes[id];
		return override === undefined ? fallback : override;
	};
	return {
		format_version: 1,
		recorded_at: '2020-01-01T00:00:00.000Z',
		total_bytes: overrides.totalBytes ?? DEFAULT_TOTAL_BYTES,
		classes: [
			{
				id: 'background.js',
				type: 'path',
				path: 'background.js',
				max_bytes: bytesFor('background.js', FILE_BYTES.background),
			},
			{
				id: 'content-scripts/likes.js',
				type: 'path',
				path: 'content-scripts/likes.js',
				max_bytes: bytesFor('content-scripts/likes.js', FILE_BYTES.likesJs),
			},
			{
				id: 'content-scripts/likes.css',
				type: 'path',
				path: 'content-scripts/likes.css',
				max_bytes: bytesFor('content-scripts/likes.css', FILE_BYTES.likesCss),
			},
			{
				id: 'chunks/popup.js',
				type: 'glob',
				glob: 'chunks/popup-*.js',
				expected_count: 1,
				max_bytes: bytesFor('chunks/popup.js', FILE_BYTES.popupJs),
			},
			{
				id: 'assets/popup.css',
				type: 'glob',
				glob: 'assets/popup-*.css',
				expected_count: 1,
				max_bytes: bytesFor('assets/popup.css', FILE_BYTES.popupCss),
			},
			{
				id: 'mascot',
				type: 'glob',
				glob: 'mascot/*.webp',
				expected_count: 4,
				expected_files: [...EXPECTED_MASCOT_POSE_PATHS],
				max_bytes: bytesFor(
					'mascot',
					FILE_BYTES.mascot * EXPECTED_MASCOT_POSE_PATHS.length,
				),
			},
			{
				id: 'icons',
				type: 'glob',
				glob: 'icons/*.png',
				expected_count: 4,
				expected_files: [...ICON_PATHS],
				max_bytes: bytesFor('icons', FILE_BYTES.icon * ICON_PATHS.length),
			},
			{
				id: 'popup.html',
				type: 'path',
				path: 'popup.html',
				max_bytes: bytesFor('popup.html', FILE_BYTES.popupHtml),
			},
			{
				id: 'manifest.json',
				type: 'path',
				path: 'manifest.json',
				max_bytes: bytesFor('manifest.json', FILE_BYTES.manifest),
			},
		],
		forbidden: ['assets/*.png', 'mascot/*.png'],
	};
}

function writeBudget(dir: string, budgets: unknown): string {
	const budgetFile = path.join(dir, 'package-size-budgets.json');
	writeFileSync(budgetFile, `${JSON.stringify(budgets, null, '\t')}\n`);
	return budgetFile;
}

function writeCompleteTree(
	outputDir: string,
	options: {
		readonly popupHash?: string;
		readonly extraFiles?: Readonly<Record<string, number>>;
		readonly omit?: readonly string[];
	} = {},
): void {
	const popupHash = options.popupHash ?? 'aaa11111';
	const files: Record<string, number> = {
		'background.js': FILE_BYTES.background,
		'content-scripts/likes.js': FILE_BYTES.likesJs,
		'content-scripts/likes.css': FILE_BYTES.likesCss,
		[`chunks/popup-${popupHash}.js`]: FILE_BYTES.popupJs,
		[`assets/popup-${popupHash}.css`]: FILE_BYTES.popupCss,
		'popup.html': FILE_BYTES.popupHtml,
		'manifest.json': FILE_BYTES.manifest,
	};
	for (const posePath of EXPECTED_MASCOT_POSE_PATHS) {
		files[posePath] = FILE_BYTES.mascot;
	}
	for (const iconPath of ICON_PATHS) {
		files[iconPath] = FILE_BYTES.icon;
	}
	const extraFiles = options.extraFiles ?? {};
	for (const extraPath of Object.keys(extraFiles)) {
		const size = extraFiles[extraPath];
		if (size !== undefined) {
			files[extraPath] = size;
		}
	}
	const omit = new Set(options.omit ?? []);
	const kept: Record<string, number> = {};
	for (const relativePath of Object.keys(files)) {
		const size = files[relativePath];
		if (size === undefined || omit.has(relativePath)) {
			continue;
		}
		kept[relativePath] = size;
	}
	writeSizedFiles(outputDir, kept);
}

function runCli(
	argv: readonly string[],
	recordedAt = '2026-08-30T12:00:00.000Z',
) {
	return Effect.runSync(Effect.either(runPackageSizeCli(argv, recordedAt)));
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe('parsePackageSizeCli', () => {
	it('defaults to production output and the committed budget file', () => {
		Either.match(parsePackageSizeCli(['--report']), {
			onLeft: (error) => {
				expect.fail(formatPackageSizeCliError(error));
			},
			onRight: (options) => {
				expect(options.mode).toBe('report');
				expect(options.outputDir).toBe(DEFAULT_OUTPUT_DIR);
				expect(options.budgetFile).toBe(DEFAULT_BUDGET_FILE);
			},
		});
	});

	it('accepts output-dir and budget-file overrides', () => {
		Either.match(
			parsePackageSizeCli([
				'--check',
				'--output-dir',
				'/tmp/custom-output',
				'--budget-file',
				'/tmp/custom-budget.json',
			]),
			{
				onLeft: (error) => {
					expect.fail(formatPackageSizeCliError(error));
				},
				onRight: (options) => {
					expect(options.mode).toBe('check');
					expect(options.outputDir).toBe('/tmp/custom-output');
					expect(options.budgetFile).toBe('/tmp/custom-budget.json');
				},
			},
		);
	});

	it('fails when no mode is passed', () => {
		Either.match(parsePackageSizeCli([]), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(CliArgsInvalid);
			},
			onRight: () => {
				expect.fail('expected a missing mode to fail');
			},
		});
	});

	it('fails when more than one mode is passed', () => {
		Either.match(parsePackageSizeCli(['--report', '--check']), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(CliArgsInvalid);
			},
			onRight: () => {
				expect.fail('expected multiple modes to fail');
			},
		});
	});

	it('fails when --output-dir has no path', () => {
		Either.match(parsePackageSizeCli(['--report', '--output-dir']), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(CliArgsInvalid);
			},
			onRight: () => {
				expect.fail('expected a missing --output-dir value to fail');
			},
		});
	});
});

describe('package size discovery and check', () => {
	it('accepts alternate popup hashes for the same globs', () => {
		for (const popupHash of ['aaa11111', 'bbb22222']) {
			const root = makeTempDir();
			const outputDir = path.join(root, 'output');
			mkdirSync(outputDir);
			writeCompleteTree(outputDir, { popupHash });
			const budgetFile = writeBudget(root, testBudgets());

			Either.match(
				runCli([
					'--check',
					'--output-dir',
					outputDir,
					'--budget-file',
					budgetFile,
				]),
				{
					onLeft: (error) => {
						expect.fail(formatPackageSizeCliError(error));
					},
					onRight: (success) => {
						expect(success.kind).toBe('inspected');
						if (success.kind !== 'inspected') {
							return;
						}
						const popupJs = success.evaluation.classes.find(
							(item) => item.id === 'chunks/popup.js',
						);
						const popupCss = success.evaluation.classes.find(
							(item) => item.id === 'assets/popup.css',
						);
						expect(popupJs?.files.map((file) => file.path)).toEqual([
							`chunks/popup-${popupHash}.js`,
						]);
						expect(popupCss?.files.map((file) => file.path)).toEqual([
							`assets/popup-${popupHash}.css`,
						]);
						expect(success.evaluation.issues).toEqual([]);
					},
				},
			);
		}
	});

	it('fails check when a class is over budget and still reports the class', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir);
		const budgetFile = writeBudget(
			root,
			testBudgets({
				classBytes: { 'background.js': FILE_BYTES.background - 1 },
			}),
		);

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					expect(
						error.evaluation.issues.some(
							(issue) => issue instanceof ClassOverBudget,
						),
					).toBe(true);
					const report = formatPackageSizeReport(error.evaluation);
					expect(report).toContain('background.js');
					expect(report).toContain('bytes');
					expect(report).toContain('budget');
					expect(report).toContain('delta');
					expect(report).toContain('+1');
				},
				onRight: () => {
					expect.fail('expected an over-budget class to fail check');
				},
			},
		);
	});

	it('report succeeds when a class is over budget', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir);
		const budgetFile = writeBudget(
			root,
			testBudgets({
				classBytes: { 'background.js': FILE_BYTES.background - 1 },
			}),
		);

		Either.match(
			runCli([
				'--report',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect.fail(formatPackageSizeCliError(error));
				},
				onRight: (success) => {
					expect(success.kind).toBe('inspected');
					if (success.kind !== 'inspected') {
						return;
					}
					expect(success.evaluation.issues.length).toBeGreaterThan(0);
					expect(formatPackageSizeReport(success.evaluation)).toContain(
						'result: fail',
					);
				},
			},
		);
	});

	it('fails when a hashed popup glob matches no files', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir, { omit: ['chunks/popup-aaa11111.js'] });
		const budgetFile = writeBudget(root, testBudgets());

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					const missing = error.evaluation.issues.find(
						(issue) => issue instanceof MissingMatch,
					);
					expect(missing).toBeInstanceOf(MissingMatch);
					if (missing instanceof MissingMatch) {
						expect(missing.classId).toBe('chunks/popup.js');
					}
				},
				onRight: () => {
					expect.fail('expected a missing popup chunk to fail');
				},
			},
		);
	});

	it('fails when a hashed popup glob matches more than one file', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir, {
			extraFiles: { 'chunks/popup-ccc33333.js': FILE_BYTES.popupJs },
		});
		const budgetFile = writeBudget(root, testBudgets());

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					const duplicate = error.evaluation.issues.find(
						(issue) => issue instanceof DuplicateMatch,
					);
					expect(duplicate).toBeInstanceOf(DuplicateMatch);
					if (duplicate instanceof DuplicateMatch) {
						expect(duplicate.classId).toBe('chunks/popup.js');
						expect(duplicate.matched).toEqual([
							'chunks/popup-aaa11111.js',
							'chunks/popup-ccc33333.js',
						]);
					}
				},
				onRight: () => {
					expect.fail('expected a duplicate popup chunk to fail');
				},
			},
		);
	});

	it('fails when a forbidden pose PNG is present under assets/', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir, {
			extraFiles: { 'assets/idle.png': 12 },
		});
		const budgetFile = writeBudget(root, testBudgets());

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					const forbidden = error.evaluation.issues.find(
						(issue) => issue instanceof ForbiddenArtifact,
					);
					expect(forbidden).toBeInstanceOf(ForbiddenArtifact);
					if (forbidden instanceof ForbiddenArtifact) {
						expect(forbidden.pattern).toBe('assets/*.png');
						expect(forbidden.matched).toEqual(['assets/idle.png']);
					}
				},
				onRight: () => {
					expect.fail('expected a forbidden assets PNG to fail');
				},
			},
		);
	});

	it('fails when a forbidden pose PNG is present under mascot/', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir, {
			extraFiles: { 'mascot/idle.png': 12 },
		});
		const budgetFile = writeBudget(root, testBudgets());

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					const forbidden = error.evaluation.issues.find(
						(issue) => issue instanceof ForbiddenArtifact,
					);
					expect(forbidden).toBeInstanceOf(ForbiddenArtifact);
					if (forbidden instanceof ForbiddenArtifact) {
						expect(forbidden.pattern).toBe('mascot/*.png');
						expect(forbidden.matched).toEqual(['mascot/idle.png']);
					}
				},
				onRight: () => {
					expect.fail('expected a forbidden mascot PNG to fail');
				},
			},
		);
	});

	it('fails when an expected mascot pose is missing', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir, { omit: ['mascot/sad.webp'] });
		const budgetFile = writeBudget(root, testBudgets());

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					const missing = error.evaluation.issues.find(
						(issue) => issue instanceof MissingMatch,
					);
					expect(missing).toBeInstanceOf(MissingMatch);
					if (missing instanceof MissingMatch) {
						expect(missing.classId).toBe('mascot');
						expect(missing.matched).not.toContain('mascot/sad.webp');
					}
					expect(formatPackageSizeReport(error.evaluation)).toContain(
						'mascot/idle.webp',
					);
				},
				onRight: () => {
					expect.fail('expected a missing pose to fail');
				},
			},
		);
	});

	it('fails when total unpacked bytes exceed the ceiling', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir, {
			extraFiles: { 'notes.txt': 9 },
		});
		const budgetFile = writeBudget(root, testBudgets());

		Either.match(
			runCli([
				'--check',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					if (!(error instanceof PackageSizeCheckFailed)) {
						return;
					}
					const total = error.evaluation.issues.find(
						(issue) => issue instanceof TotalOverBudget,
					);
					expect(total).toBeInstanceOf(TotalOverBudget);
					if (total instanceof TotalOverBudget) {
						expect(total.deltaBytes).toBe(9);
					}
					expect(
						error.evaluation.unclassified.map((file) => file.path),
					).toEqual(['notes.txt']);
				},
				onRight: () => {
					expect.fail('expected total overage to fail');
				},
			},
		);
	});

	it('fails when the output directory is missing', () => {
		const root = makeTempDir();
		const budgetFile = writeBudget(root, testBudgets());
		const outputDir = path.join(root, 'missing-output');

		Either.match(
			runCli([
				'--report',
				'--output-dir',
				outputDir,
				'--budget-file',
				budgetFile,
			]),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(OutputDirMissing);
					expect(formatPackageSizeCliError(error)).toContain('pnpm package');
				},
				onRight: () => {
					expect.fail('expected a missing output dir to fail');
				},
			},
		);
	});
});

describe('atomic record mode', () => {
	it('writes measured ceilings via a temp file that is not left behind', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir);
		const budgetFile = writeBudget(
			root,
			testBudgets({
				totalBytes: 0,
				classBytes: { 'background.js': 0 },
			}),
		);
		const recordedAt = '2026-08-30T12:00:00.000Z';

		Either.match(
			Effect.runSync(
				Effect.either(
					recordPackageSizeBudgets(outputDir, budgetFile, recordedAt),
				),
			),
			{
				onLeft: (error) => {
					expect.fail(formatPackageSizeCliError(error));
				},
				onRight: (recorded) => {
					expect(recorded.kind).toBe('recorded');
					expect(recorded.budgets.recorded_at).toBe(recordedAt);
					expect(recorded.budgets.total_bytes).toBe(DEFAULT_TOTAL_BYTES);
					expect(existsSync(`${budgetFile}.tmp`)).toBe(false);

					const raw: unknown = JSON.parse(readFileSync(budgetFile, 'utf8'));
					Either.match(
						Schema.decodeUnknownEither(PackageSizeBudgetsSchema)(raw),
						{
							onLeft: (parseError) => {
								expect.fail(parseError.message);
							},
							onRight: (decoded) => {
								expect(decoded.total_bytes).toBe(DEFAULT_TOTAL_BYTES);
								expect(decoded.recorded_at).toBe(recordedAt);
								const background = decoded.classes.find(
									(rule) => rule.id === 'background.js',
								);
								expect(background?.max_bytes).toBe(FILE_BYTES.background);
							},
						},
					);
				},
			},
		);
	});

	it('does not overwrite the budget file when discovery fails', () => {
		const root = makeTempDir();
		const outputDir = path.join(root, 'output');
		mkdirSync(outputDir);
		writeCompleteTree(outputDir);
		const original = testBudgets();
		const budgetFile = writeBudget(root, original);
		const before = readFileSync(budgetFile, 'utf8');
		unlinkSync(path.join(outputDir, 'mascot/sad.webp'));

		Either.match(
			Effect.runSync(
				Effect.either(
					recordPackageSizeBudgets(
						outputDir,
						budgetFile,
						'2026-08-30T12:00:00.000Z',
					),
				),
			),
			{
				onLeft: (error) => {
					expect(error).toBeInstanceOf(PackageSizeCheckFailed);
					expect(readFileSync(budgetFile, 'utf8')).toBe(before);
					expect(existsSync(`${budgetFile}.tmp`)).toBe(false);
				},
				onRight: () => {
					expect.fail('expected record to refuse an incomplete output tree');
				},
			},
		);
	});

	it('replaces an existing JSON file atomically', () => {
		const root = makeTempDir();
		const destPath = path.join(root, 'target.json');
		writeFileSync(destPath, '{"stale":true}\n');

		Either.match(
			Effect.runSync(
				Effect.either(writeJsonAtomically(destPath, { replaced: true })),
			),
			{
				onLeft: (error) => {
					expect.fail(formatPackageSizeCliError(error));
				},
				onRight: () => {
					expect(existsSync(`${destPath}.tmp`)).toBe(false);
					expect(readFileSync(destPath, 'utf8')).toBe(
						'{\n\t"replaced": true\n}\n',
					);
				},
			},
		);
	});
});
