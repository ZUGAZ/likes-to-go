import {
	existsSync,
	globSync,
	readFileSync,
	readdirSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Data, Effect, Either, Schema } from 'effect';

export const DEFAULT_OUTPUT_DIR = '.output/chrome-mv3';
export const DEFAULT_BUDGET_FILE = 'scripts/package-size-budgets.json';

const NonNegativeInt = Schema.Number.pipe(
	Schema.int(),
	Schema.greaterThanOrEqualTo(0),
);
const PositiveInt = Schema.Number.pipe(Schema.int(), Schema.positive());

const IsoTimestamp = Schema.String.pipe(
	Schema.filter((value) => !Number.isNaN(Date.parse(value)), {
		message: () => 'recorded_at must be an ISO 8601 timestamp',
	}),
);

export const PathClassRuleSchema = Schema.Struct({
	id: Schema.String,
	type: Schema.Literal('path'),
	path: Schema.String,
	max_bytes: NonNegativeInt,
});

export const GlobClassRuleSchema = Schema.Struct({
	id: Schema.String,
	type: Schema.Literal('glob'),
	glob: Schema.String,
	expected_count: PositiveInt,
	expected_files: Schema.optional(Schema.Array(Schema.String)),
	max_bytes: NonNegativeInt,
});

export const ArtifactClassRuleSchema = Schema.Union(
	PathClassRuleSchema,
	GlobClassRuleSchema,
);

export const isPathClassRule = Schema.is(PathClassRuleSchema);
export const isGlobClassRule = Schema.is(GlobClassRuleSchema);

export type ArtifactClassRule = Schema.Schema.Type<
	typeof ArtifactClassRuleSchema
>;

function classIdsAreUnique(
	classes: readonly { readonly id: string }[],
): boolean {
	const ids = classes.map((item) => item.id);
	return new Set(ids).size === ids.length;
}

export const PackageSizeBudgetsSchema = Schema.Struct({
	format_version: Schema.Literal(1),
	recorded_at: IsoTimestamp,
	total_bytes: NonNegativeInt,
	classes: Schema.Array(ArtifactClassRuleSchema).pipe(Schema.minItems(1)),
	forbidden: Schema.Array(Schema.String),
}).pipe(
	Schema.filter((budgets) => classIdsAreUnique(budgets.classes), {
		message: () => 'class ids must be unique',
	}),
);

const PackageSizeBudgetsFromJson = Schema.parseJson(PackageSizeBudgetsSchema);

export type PackageSizeBudgets = Schema.Schema.Type<
	typeof PackageSizeBudgetsSchema
>;

export class OutputDirMissing extends Data.TaggedError('OutputDirMissing')<{
	readonly outputDir: string;
}> {}

export class BudgetFileMissing extends Data.TaggedError('BudgetFileMissing')<{
	readonly budgetFile: string;
}> {}

export class BudgetFileInvalid extends Data.TaggedError('BudgetFileInvalid')<{
	readonly budgetFile: string;
	readonly reason: string;
}> {}

export class UnsafeDiscoveryPath extends Data.TaggedError(
	'UnsafeDiscoveryPath',
)<{
	readonly pattern: string;
	readonly outputDir: string;
}> {}

export class AtomicWriteFailed extends Data.TaggedError('AtomicWriteFailed')<{
	readonly destPath: string;
	readonly reason: string;
}> {}

export class CliArgsInvalid extends Data.TaggedError('CliArgsInvalid')<{
	readonly reason: string;
}> {}

export class MissingMatch extends Data.TaggedClass('MissingMatch')<{
	readonly classId: string;
	readonly expectedCount: number;
	readonly matched: readonly string[];
}> {}

export class DuplicateMatch extends Data.TaggedClass('DuplicateMatch')<{
	readonly classId: string;
	readonly expectedCount: number;
	readonly matched: readonly string[];
}> {}

export class ExpectedFilesMismatch extends Data.TaggedClass(
	'ExpectedFilesMismatch',
)<{
	readonly classId: string;
	readonly expectedFiles: readonly string[];
	readonly matched: readonly string[];
}> {}

export class ForbiddenArtifact extends Data.TaggedClass('ForbiddenArtifact')<{
	readonly pattern: string;
	readonly matched: readonly string[];
}> {}

export class ClassOverBudget extends Data.TaggedClass('ClassOverBudget')<{
	readonly classId: string;
	readonly measuredBytes: number;
	readonly budgetBytes: number;
	readonly deltaBytes: number;
}> {}

export class TotalOverBudget extends Data.TaggedClass('TotalOverBudget')<{
	readonly measuredBytes: number;
	readonly budgetBytes: number;
	readonly deltaBytes: number;
}> {}

export type PackageSizeIssue =
	| MissingMatch
	| DuplicateMatch
	| ExpectedFilesMismatch
	| ForbiddenArtifact
	| ClassOverBudget
	| TotalOverBudget;

export class PackageSizeCheckFailed extends Data.TaggedError(
	'PackageSizeCheckFailed',
)<{
	readonly evaluation: PackageSizeEvaluation;
}> {}

export type PackageSizeCliError =
	| CliArgsInvalid
	| OutputDirMissing
	| BudgetFileMissing
	| BudgetFileInvalid
	| UnsafeDiscoveryPath
	| AtomicWriteFailed
	| PackageSizeCheckFailed;

export interface FileMeasurement {
	readonly path: string;
	readonly bytes: number;
}

export interface ClassMeasurement {
	readonly id: string;
	readonly files: readonly FileMeasurement[];
	readonly measuredBytes: number;
	readonly budgetBytes: number;
	readonly deltaBytes: number;
}

export interface PackageSizeEvaluation {
	readonly outputDir: string;
	readonly budgetFile: string;
	readonly classes: readonly ClassMeasurement[];
	readonly totalBytes: number;
	readonly totalBudgetBytes: number;
	readonly totalDeltaBytes: number;
	readonly fileCount: number;
	readonly unclassified: readonly FileMeasurement[];
	readonly issues: readonly PackageSizeIssue[];
}

export type PackageSizeCliMode = 'report' | 'check' | 'record';

export interface PackageSizeCliOptions {
	readonly mode: PackageSizeCliMode;
	readonly outputDir: string;
	readonly budgetFile: string;
}

export interface InspectedPackageSize {
	readonly kind: 'inspected';
	readonly evaluation: PackageSizeEvaluation;
}

export interface RecordedPackageSize {
	readonly kind: 'recorded';
	readonly budgets: PackageSizeBudgets;
	readonly evaluation: PackageSizeEvaluation;
}

export type PackageSizeCliSuccess = InspectedPackageSize | RecordedPackageSize;

function unknownReason(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

function compareStrings(left: string, right: string): number {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
}

function toPosixRelative(relativePath: string): string {
	return relativePath
		.split(path.sep)
		.filter((segment) => segment !== '' && segment !== '.')
		.join('/');
}

function isPathInsideOutput(outputRoot: string, absolutePath: string): boolean {
	const relative = path.relative(outputRoot, absolutePath);
	return (
		relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
	);
}

const GLOB_META_CHARACTERS = /[*?[]/u;

function isExistingFile(absolutePath: string): boolean {
	return existsSync(absolutePath) && statSync(absolutePath).isFile();
}

export function isUnsafeRelativePath(
	pattern: string,
	outputDir: string,
): boolean {
	if (pattern === '' || pattern.includes('\0')) {
		return true;
	}
	if (path.isAbsolute(pattern)) {
		return true;
	}
	const segments = pattern.split(/[\\/]/u);
	for (const segment of segments) {
		if (segment === '..') {
			return true;
		}
	}
	const outputRoot = path.resolve(outputDir);
	const resolved = path.resolve(outputRoot, pattern);
	return !isPathInsideOutput(outputRoot, resolved);
}

function collectGlobMatches(
	outputRoot: string,
	pattern: string,
): readonly string[] {
	try {
		return globSync(pattern, { cwd: outputRoot });
	} catch {
		return [];
	}
}

export function matchOutputPattern(
	outputDir: string,
	pattern: string,
): readonly string[] {
	const outputRoot = path.resolve(outputDir);
	const candidates = GLOB_META_CHARACTERS.test(pattern)
		? collectGlobMatches(outputRoot, pattern)
		: [pattern];
	const matches: string[] = [];
	for (const candidate of candidates) {
		const absolute = path.resolve(outputRoot, candidate);
		if (isPathInsideOutput(outputRoot, absolute) && isExistingFile(absolute)) {
			matches.push(toPosixRelative(candidate));
		}
	}
	return matches.sort(compareStrings);
}

function discoveryPattern(rule: ArtifactClassRule): string {
	if (isPathClassRule(rule)) {
		return rule.path;
	}
	return rule.glob;
}

function expectedCountFor(rule: ArtifactClassRule): number {
	if (isPathClassRule(rule)) {
		return 1;
	}
	return rule.expected_count;
}

function expectedFilesFor(
	rule: ArtifactClassRule,
): readonly string[] | undefined {
	if (isPathClassRule(rule)) {
		return undefined;
	}
	return rule.expected_files;
}

function bytesForPath(
	sizes: ReadonlyMap<string, number>,
	relativePath: string,
	outputDir: string,
): number {
	const fromMap = sizes.get(relativePath);
	if (fromMap !== undefined) {
		return fromMap;
	}
	return statSync(path.join(outputDir, relativePath)).size;
}

export function collectOutputFiles(outputDir: string): readonly string[] {
	const outputRoot = path.resolve(outputDir);
	const collected: string[] = [];

	function walk(directory: string): void {
		const entries = readdirSync(directory, { withFileTypes: true });
		for (const entry of entries) {
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				walk(absolute);
				continue;
			}
			if (entry.isFile() && isPathInsideOutput(outputRoot, absolute)) {
				collected.push(toPosixRelative(path.relative(outputRoot, absolute)));
			}
		}
	}

	walk(outputRoot);
	return [...collected].sort(compareStrings);
}

function measureOutputFiles(outputDir: string): ReadonlyMap<string, number> {
	const sizes = new Map<string, number>();
	for (const relativePath of collectOutputFiles(outputDir)) {
		sizes.set(relativePath, statSync(path.join(outputDir, relativePath)).size);
	}
	return sizes;
}

function matchedFileSetEquals(
	matched: readonly string[],
	expectedFiles: readonly string[],
): boolean {
	if (matched.length !== expectedFiles.length) {
		return false;
	}
	const matchedSet = new Set(matched);
	return expectedFiles.every((file) => matchedSet.has(file));
}

function discoveryIssuesForClass(
	rule: ArtifactClassRule,
	matched: readonly string[],
): readonly PackageSizeIssue[] {
	const expectedCount = expectedCountFor(rule);
	const issues: PackageSizeIssue[] = [];
	if (matched.length < expectedCount) {
		issues.push(
			new MissingMatch({
				classId: rule.id,
				expectedCount,
				matched,
			}),
		);
	} else if (matched.length > expectedCount) {
		issues.push(
			new DuplicateMatch({
				classId: rule.id,
				expectedCount,
				matched,
			}),
		);
	}
	const expectedFiles = expectedFilesFor(rule);
	if (
		expectedFiles !== undefined &&
		matched.length === expectedCount &&
		!matchedFileSetEquals(matched, expectedFiles)
	) {
		issues.push(
			new ExpectedFilesMismatch({
				classId: rule.id,
				expectedFiles,
				matched,
			}),
		);
	}
	return issues;
}

function isDiscoveryOrForbiddenIssue(issue: PackageSizeIssue): boolean {
	return (
		issue instanceof MissingMatch ||
		issue instanceof DuplicateMatch ||
		issue instanceof ExpectedFilesMismatch ||
		issue instanceof ForbiddenArtifact
	);
}

export function evaluatePackageSize(
	outputDir: string,
	budgetFile: string,
	budgets: PackageSizeBudgets,
	sizes: ReadonlyMap<string, number>,
): PackageSizeEvaluation {
	const issues: PackageSizeIssue[] = [];
	const classes: ClassMeasurement[] = [];
	const classified = new Set<string>();

	for (const rule of budgets.classes) {
		const matched = matchOutputPattern(outputDir, discoveryPattern(rule));
		const files = matched.map((relativePath) => ({
			path: relativePath,
			bytes: bytesForPath(sizes, relativePath, outputDir),
		}));
		let measuredBytes = 0;
		for (const file of files) {
			measuredBytes += file.bytes;
			classified.add(file.path);
		}
		const budgetBytes = rule.max_bytes;
		const deltaBytes = measuredBytes - budgetBytes;
		classes.push({
			id: rule.id,
			files,
			measuredBytes,
			budgetBytes,
			deltaBytes,
		});
		for (const issue of discoveryIssuesForClass(rule, matched)) {
			issues.push(issue);
		}
		if (measuredBytes > budgetBytes) {
			issues.push(
				new ClassOverBudget({
					classId: rule.id,
					measuredBytes,
					budgetBytes,
					deltaBytes,
				}),
			);
		}
	}

	const unclassified: FileMeasurement[] = [];
	let totalBytes = 0;
	for (const [relativePath, bytes] of sizes) {
		totalBytes += bytes;
		if (!classified.has(relativePath)) {
			unclassified.push({ path: relativePath, bytes });
		}
	}
	unclassified.sort((left, right) => compareStrings(left.path, right.path));

	for (const pattern of budgets.forbidden) {
		const matched = matchOutputPattern(outputDir, pattern);
		if (matched.length > 0) {
			issues.push(new ForbiddenArtifact({ pattern, matched }));
		}
	}

	const totalBudgetBytes = budgets.total_bytes;
	const totalDeltaBytes = totalBytes - totalBudgetBytes;
	if (totalBytes > totalBudgetBytes) {
		issues.push(
			new TotalOverBudget({
				measuredBytes: totalBytes,
				budgetBytes: totalBudgetBytes,
				deltaBytes: totalDeltaBytes,
			}),
		);
	}

	return {
		outputDir,
		budgetFile,
		classes,
		totalBytes,
		totalBudgetBytes,
		totalDeltaBytes,
		fileCount: sizes.size,
		unclassified,
		issues,
	};
}

export function readPackageSizeBudgets(
	budgetFile: string,
): Effect.Effect<PackageSizeBudgets, BudgetFileMissing | BudgetFileInvalid> {
	if (!existsSync(budgetFile) || !statSync(budgetFile).isFile()) {
		return Effect.fail(new BudgetFileMissing({ budgetFile }));
	}
	return Effect.try({
		try: () => readFileSync(budgetFile, 'utf8'),
		catch: (cause) =>
			new BudgetFileInvalid({
				budgetFile,
				reason: unknownReason(cause),
			}),
	}).pipe(
		Effect.flatMap((rawText) =>
			Either.match(
				Schema.decodeUnknownEither(PackageSizeBudgetsFromJson)(rawText),
				{
					onLeft: (parseError) =>
						Effect.fail(
							new BudgetFileInvalid({
								budgetFile,
								reason: parseError.message,
							}),
						),
					onRight: (budgets) => Effect.succeed(budgets),
				},
			),
		),
	);
}

function discoveryPatterns(budgets: PackageSizeBudgets): readonly string[] {
	const patterns: string[] = [];
	for (const rule of budgets.classes) {
		patterns.push(discoveryPattern(rule));
	}
	for (const pattern of budgets.forbidden) {
		patterns.push(pattern);
	}
	return patterns;
}

export function inspectPackageSize(
	outputDir: string,
	budgets: PackageSizeBudgets,
	budgetFile: string,
): Effect.Effect<
	PackageSizeEvaluation,
	OutputDirMissing | UnsafeDiscoveryPath
> {
	return Effect.gen(function* () {
		if (!existsSync(outputDir) || !statSync(outputDir).isDirectory()) {
			return yield* Effect.fail(new OutputDirMissing({ outputDir }));
		}
		for (const pattern of discoveryPatterns(budgets)) {
			if (isUnsafeRelativePath(pattern, outputDir)) {
				return yield* Effect.fail(
					new UnsafeDiscoveryPath({ pattern, outputDir }),
				);
			}
		}
		return evaluatePackageSize(
			outputDir,
			budgetFile,
			budgets,
			measureOutputFiles(outputDir),
		);
	});
}

export function inspectPackageSizeFromFiles(
	outputDir: string,
	budgetFile: string,
): Effect.Effect<
	PackageSizeEvaluation,
	OutputDirMissing | BudgetFileMissing | BudgetFileInvalid | UnsafeDiscoveryPath
> {
	return Effect.gen(function* () {
		const budgets = yield* readPackageSizeBudgets(budgetFile);
		return yield* inspectPackageSize(outputDir, budgets, budgetFile);
	});
}

export function applyRecordedCeilings(
	existing: PackageSizeBudgets,
	evaluation: PackageSizeEvaluation,
	recordedAt: string,
): PackageSizeBudgets {
	const measuredById = new Map(
		evaluation.classes.map((item) => [item.id, item.measuredBytes]),
	);
	return {
		format_version: existing.format_version,
		recorded_at: recordedAt,
		total_bytes: evaluation.totalBytes,
		classes: existing.classes.map((rule) => {
			const measured = measuredById.get(rule.id);
			if (measured === undefined) {
				return rule;
			}
			return { ...rule, max_bytes: measured };
		}),
		forbidden: existing.forbidden,
	};
}

export function writeJsonAtomically(
	destPath: string,
	value: unknown,
): Effect.Effect<void, AtomicWriteFailed> {
	return Effect.try({
		try: () => {
			const contents = `${JSON.stringify(value, null, '\t')}\n`;
			const tempPath = `${destPath}.tmp`;
			writeFileSync(tempPath, contents, 'utf8');
			try {
				renameSync(tempPath, destPath);
			} catch (error) {
				if (existsSync(tempPath)) {
					unlinkSync(tempPath);
				}
				throw error;
			}
		},
		catch: (cause) =>
			new AtomicWriteFailed({
				destPath,
				reason: unknownReason(cause),
			}),
	});
}

export function recordPackageSizeBudgets(
	outputDir: string,
	budgetFile: string,
	recordedAt: string,
): Effect.Effect<
	RecordedPackageSize,
	| OutputDirMissing
	| BudgetFileMissing
	| BudgetFileInvalid
	| UnsafeDiscoveryPath
	| AtomicWriteFailed
	| PackageSizeCheckFailed
> {
	return Effect.gen(function* () {
		const existing = yield* readPackageSizeBudgets(budgetFile);
		const evaluation = yield* inspectPackageSize(
			outputDir,
			existing,
			budgetFile,
		);
		const blockingIssues = evaluation.issues.filter(
			isDiscoveryOrForbiddenIssue,
		);
		if (blockingIssues.length > 0) {
			return yield* Effect.fail(new PackageSizeCheckFailed({ evaluation }));
		}
		const updated = applyRecordedCeilings(existing, evaluation, recordedAt);
		const encoded = yield* Either.match(
			Schema.encodeUnknownEither(PackageSizeBudgetsSchema)(updated),
			{
				onLeft: (encodeError) =>
					Effect.fail(
						new BudgetFileInvalid({
							budgetFile,
							reason: encodeError.message,
						}),
					),
				onRight: (value) => Effect.succeed(value),
			},
		);
		yield* writeJsonAtomically(budgetFile, encoded);
		return {
			kind: 'recorded' as const,
			budgets: updated,
			evaluation: evaluatePackageSize(
				outputDir,
				budgetFile,
				updated,
				measureOutputFiles(outputDir),
			),
		};
	});
}

function parseFlagValue(
	argv: readonly string[],
	flag: string,
	defaultValue: string,
): Either.Either<string, CliArgsInvalid> {
	const flagIndex = argv.indexOf(flag);
	if (flagIndex === -1) {
		return Either.right(defaultValue);
	}
	const value = argv[flagIndex + 1];
	if (value === undefined || value.startsWith('-')) {
		return Either.left(
			new CliArgsInvalid({
				reason: `${flag} requires a path`,
			}),
		);
	}
	return Either.right(value);
}

export function parsePackageSizeCli(
	argv: readonly string[],
): Either.Either<PackageSizeCliOptions, CliArgsInvalid> {
	const modes: PackageSizeCliMode[] = [];
	if (argv.includes('--report')) {
		modes.push('report');
	}
	if (argv.includes('--check')) {
		modes.push('check');
	}
	if (argv.includes('--record')) {
		modes.push('record');
	}
	if (modes.length !== 1) {
		return Either.left(
			new CliArgsInvalid({
				reason: 'Exactly one of --report, --check, or --record is required',
			}),
		);
	}
	const [mode] = modes;
	if (mode === undefined) {
		return Either.left(
			new CliArgsInvalid({
				reason: 'Exactly one of --report, --check, or --record is required',
			}),
		);
	}
	return Either.match(
		parseFlagValue(argv, '--output-dir', DEFAULT_OUTPUT_DIR),
		{
			onLeft: (error) => Either.left(error),
			onRight: (outputDir) =>
				Either.match(
					parseFlagValue(argv, '--budget-file', DEFAULT_BUDGET_FILE),
					{
						onLeft: (error) => Either.left(error),
						onRight: (budgetFile) =>
							Either.right({
								mode,
								outputDir,
								budgetFile,
							}),
					},
				),
		},
	);
}

function executePackageSizeCli(
	options: PackageSizeCliOptions,
	recordedAt: string,
): Effect.Effect<PackageSizeCliSuccess, PackageSizeCliError> {
	if (options.mode === 'record') {
		return recordPackageSizeBudgets(
			options.outputDir,
			options.budgetFile,
			recordedAt,
		);
	}
	return inspectPackageSizeFromFiles(
		options.outputDir,
		options.budgetFile,
	).pipe(
		Effect.flatMap((evaluation) => {
			if (options.mode === 'check' && evaluation.issues.length > 0) {
				return Effect.fail(new PackageSizeCheckFailed({ evaluation }));
			}
			return Effect.succeed({
				kind: 'inspected' as const,
				evaluation,
			});
		}),
	);
}

export function runPackageSizeCli(
	argv: readonly string[],
	recordedAt: string,
): Effect.Effect<PackageSizeCliSuccess, PackageSizeCliError> {
	return Either.match(parsePackageSizeCli(argv), {
		onLeft: (error) => Effect.fail(error),
		onRight: (options) => executePackageSizeCli(options, recordedAt),
	});
}

function formatDelta(delta: number): string {
	if (delta > 0) {
		return `+${String(delta)}`;
	}
	return String(delta);
}

function padRight(value: string, width: number): string {
	if (value.length >= width) {
		return value;
	}
	return `${value}${' '.repeat(width - value.length)}`;
}

function padLeft(value: string, width: number): string {
	if (value.length >= width) {
		return value;
	}
	return `${' '.repeat(width - value.length)}${value}`;
}

function joinedFilePaths(files: readonly FileMeasurement[]): string {
	if (files.length === 0) {
		return '(none)';
	}
	return files.map((file) => file.path).join(', ');
}

function formatIssue(issue: PackageSizeIssue): string {
	if (issue instanceof MissingMatch) {
		return `class ${issue.classId}: expected ${String(issue.expectedCount)} file(s), found ${String(issue.matched.length)}${issue.matched.length > 0 ? ` (${issue.matched.join(', ')})` : ''}`;
	}
	if (issue instanceof DuplicateMatch) {
		return `class ${issue.classId}: expected ${String(issue.expectedCount)} file(s), found ${String(issue.matched.length)} (${issue.matched.join(', ')})`;
	}
	if (issue instanceof ExpectedFilesMismatch) {
		return `class ${issue.classId}: expected files ${issue.expectedFiles.join(', ')}; found ${issue.matched.join(', ')}`;
	}
	if (issue instanceof ForbiddenArtifact) {
		return `forbidden ${issue.pattern}: ${issue.matched.join(', ')}`;
	}
	if (issue instanceof ClassOverBudget) {
		return `class ${issue.classId}: over budget by ${String(issue.deltaBytes)} (measured ${String(issue.measuredBytes)}, budget ${String(issue.budgetBytes)})`;
	}
	if (issue instanceof TotalOverBudget) {
		return `total: over budget by ${String(issue.deltaBytes)} (measured ${String(issue.measuredBytes)}, budget ${String(issue.budgetBytes)})`;
	}
	const exhaustive: never = issue;
	return exhaustive;
}

export function formatPackageSizeReport(
	evaluation: PackageSizeEvaluation,
): string {
	const rows = [
		...evaluation.classes.map((item) => ({
			classLabel: item.id,
			files: joinedFilePaths(item.files),
			bytes: String(item.measuredBytes),
			budget: String(item.budgetBytes),
			delta: formatDelta(item.deltaBytes),
		})),
		{
			classLabel: 'total',
			files: `${String(evaluation.fileCount)} files`,
			bytes: String(evaluation.totalBytes),
			budget: String(evaluation.totalBudgetBytes),
			delta: formatDelta(evaluation.totalDeltaBytes),
		},
	];
	const classWidth = Math.max(5, ...rows.map((row) => row.classLabel.length));
	const filesWidth = Math.max(5, ...rows.map((row) => row.files.length));
	const bytesWidth = Math.max(5, ...rows.map((row) => row.bytes.length));
	const budgetWidth = Math.max(6, ...rows.map((row) => row.budget.length));
	const deltaWidth = Math.max(5, ...rows.map((row) => row.delta.length));

	const header = `${padRight('class', classWidth)}  ${padRight('files', filesWidth)}  ${padLeft('bytes', bytesWidth)}  ${padLeft('budget', budgetWidth)}  ${padLeft('delta', deltaWidth)}`;
	const body = rows.map(
		(row) =>
			`${padRight(row.classLabel, classWidth)}  ${padRight(row.files, filesWidth)}  ${padLeft(row.bytes, bytesWidth)}  ${padLeft(row.budget, budgetWidth)}  ${padLeft(row.delta, deltaWidth)}`,
	);

	const lines = [
		'Package size',
		`output: ${evaluation.outputDir}`,
		`budget: ${evaluation.budgetFile}`,
		'',
		header,
		...body,
	];

	if (evaluation.unclassified.length > 0) {
		lines.push('');
		lines.push('unclassified');
		for (const file of evaluation.unclassified) {
			lines.push(`  ${file.path}  ${String(file.bytes)}`);
		}
	}

	if (evaluation.issues.length > 0) {
		lines.push('');
		lines.push('issues');
		for (const issue of evaluation.issues) {
			lines.push(`  ${formatIssue(issue)}`);
		}
		lines.push('');
		lines.push('result: fail');
	} else {
		lines.push('');
		lines.push('result: ok');
	}

	return lines.join('\n');
}

export function formatPackageSizeCliError(error: PackageSizeCliError): string {
	if (error instanceof OutputDirMissing) {
		return `Packaged output not found at ${error.outputDir}. Run \`pnpm package\` first, or pass --output-dir to an existing unpacked output.`;
	}
	if (error instanceof BudgetFileMissing) {
		return `Budget file not found at ${error.budgetFile}. Pass --budget-file or add ${DEFAULT_BUDGET_FILE}.`;
	}
	if (error instanceof BudgetFileInvalid) {
		return `Budget file at ${error.budgetFile} failed validation: ${error.reason}`;
	}
	if (error instanceof UnsafeDiscoveryPath) {
		return `Budget path "${error.pattern}" is not a safe path relative to ${error.outputDir}. Paths must stay inside the output directory.`;
	}
	if (error instanceof AtomicWriteFailed) {
		return `Failed to write budget file at ${error.destPath}: ${error.reason}`;
	}
	if (error instanceof PackageSizeCheckFailed) {
		return formatPackageSizeReport(error.evaluation);
	}
	if (error instanceof CliArgsInvalid) {
		return error.reason;
	}
	const exhaustive: never = error;
	return exhaustive;
}

function isExecutedAsCli(argv: readonly string[], moduleUrl: string): boolean {
	const entry = argv[1];
	if (entry === undefined) {
		return false;
	}
	return path.resolve(entry) === path.resolve(fileURLToPath(moduleUrl));
}

function printCliResult(argv: readonly string[]): void {
	const recordedAt = new Date().toISOString();
	const outcome = Effect.runSync(
		Effect.either(runPackageSizeCli(argv, recordedAt)),
	);
	Either.match(outcome, {
		onLeft: (error) => {
			console.error(formatPackageSizeCliError(error));
			process.exitCode = 1;
		},
		onRight: (success) => {
			if (success.kind === 'recorded') {
				console.log(
					`Recorded package size budgets at ${success.evaluation.budgetFile}`,
				);
				console.log(formatPackageSizeReport(success.evaluation));
				return;
			}
			console.log(formatPackageSizeReport(success.evaluation));
		},
	});
}

if (isExecutedAsCli(process.argv, import.meta.url)) {
	printCliResult(process.argv.slice(2));
}
