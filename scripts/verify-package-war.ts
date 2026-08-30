import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Data, Effect, Either, Schema } from 'effect';

export const DEFAULT_OUTPUT_DIR = '.output/chrome-mv3';

export const EXPECTED_MASCOT_POSE_PATHS: readonly string[] = [
	'mascot/idle.webp',
	'mascot/working.webp',
	'mascot/happy.webp',
	'mascot/sad.webp',
];

const GLOB_META_CHARACTERS = /[*?[]/u;

const WebAccessibleResourceSchema = Schema.Struct({
	resources: Schema.Array(Schema.String),
});

export const GeneratedManifestSchema = Schema.Struct({
	web_accessible_resources: Schema.Array(WebAccessibleResourceSchema),
});

const GeneratedManifestFromJson = Schema.parseJson(GeneratedManifestSchema);

export type GeneratedManifest = Schema.Schema.Type<
	typeof GeneratedManifestSchema
>;

export class ManifestMissing extends Data.TaggedError('ManifestMissing')<{
	readonly outputDir: string;
	readonly manifestPath: string;
}> {}

export class ManifestInvalid extends Data.TaggedError('ManifestInvalid')<{
	readonly manifestPath: string;
	readonly reason: string;
}> {}

export class UnsafeWarPath extends Data.TaggedError('UnsafeWarPath')<{
	readonly pattern: string;
	readonly outputDir: string;
}> {}

export class WarPatternUnmatched extends Data.TaggedError(
	'WarPatternUnmatched',
)<{
	readonly patterns: readonly string[];
	readonly outputDir: string;
}> {}

export class ExpectedMascotPosesMissing extends Data.TaggedError(
	'ExpectedMascotPosesMissing',
)<{
	readonly missingPaths: readonly string[];
	readonly outputDir: string;
}> {}

export class CliArgsInvalid extends Data.TaggedError('CliArgsInvalid')<{
	readonly reason: string;
}> {}

export type VerifyPackageWarError =
	| ManifestMissing
	| ManifestInvalid
	| UnsafeWarPath
	| WarPatternUnmatched
	| ExpectedMascotPosesMissing;

export type VerifyPackageWarCliError = VerifyPackageWarError | CliArgsInvalid;

export interface PackageWarVerification {
	readonly outputDir: string;
	readonly matchedResources: readonly string[];
}

function unknownReason(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
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

function isExistingFile(absolutePath: string): boolean {
	return existsSync(absolutePath) && statSync(absolutePath).isFile();
}

export function isUnsafeRelativeWarPath(
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

function collectLiteralMatch(pattern: string): readonly string[] {
	return [pattern];
}

export function matchWarPattern(
	outputDir: string,
	pattern: string,
): readonly string[] {
	const outputRoot = path.resolve(outputDir);
	const candidates = GLOB_META_CHARACTERS.test(pattern)
		? collectGlobMatches(outputRoot, pattern)
		: collectLiteralMatch(pattern);
	const matches: string[] = [];
	for (const candidate of candidates) {
		const absolute = path.resolve(outputRoot, candidate);
		if (isPathInsideOutput(outputRoot, absolute) && isExistingFile(absolute)) {
			matches.push(toPosixRelative(candidate));
		}
	}
	return matches.sort((left, right) => {
		if (left < right) {
			return -1;
		}
		if (left > right) {
			return 1;
		}
		return 0;
	});
}

function readGeneratedManifest(
	outputDir: string,
): Effect.Effect<GeneratedManifest, ManifestMissing | ManifestInvalid> {
	const manifestPath = path.join(outputDir, 'manifest.json');
	if (!existsSync(manifestPath)) {
		return Effect.fail(new ManifestMissing({ outputDir, manifestPath }));
	}
	return Effect.try({
		try: () => readFileSync(manifestPath, 'utf8'),
		catch: (cause) =>
			new ManifestInvalid({
				manifestPath,
				reason: unknownReason(cause),
			}),
	}).pipe(
		Effect.flatMap((rawText) =>
			Either.match(
				Schema.decodeUnknownEither(GeneratedManifestFromJson)(rawText),
				{
					onLeft: (parseError) =>
						Effect.fail(
							new ManifestInvalid({
								manifestPath,
								reason: parseError.message,
							}),
						),
					onRight: (manifest) => Effect.succeed(manifest),
				},
			),
		),
	);
}

function resourcePatterns(manifest: GeneratedManifest): readonly string[] {
	const patterns: string[] = [];
	for (const entry of manifest.web_accessible_resources) {
		for (const resource of entry.resources) {
			patterns.push(resource);
		}
	}
	return patterns;
}

export function verifyPackageWar(
	outputDir: string,
): Effect.Effect<PackageWarVerification, VerifyPackageWarError> {
	return Effect.gen(function* () {
		const manifest = yield* readGeneratedManifest(outputDir);
		const patterns = resourcePatterns(manifest);
		const matchedResources: string[] = [];
		const unmatchedPatterns: string[] = [];

		for (const pattern of patterns) {
			if (isUnsafeRelativeWarPath(pattern, outputDir)) {
				return yield* Effect.fail(new UnsafeWarPath({ pattern, outputDir }));
			}
			const matches = matchWarPattern(outputDir, pattern);
			if (matches.length === 0) {
				unmatchedPatterns.push(pattern);
				continue;
			}
			for (const match of matches) {
				matchedResources.push(match);
			}
		}

		if (unmatchedPatterns.length > 0) {
			return yield* Effect.fail(
				new WarPatternUnmatched({
					patterns: unmatchedPatterns,
					outputDir,
				}),
			);
		}

		const matchedSet = new Set(matchedResources);
		const missingPaths = EXPECTED_MASCOT_POSE_PATHS.filter(
			(posePath) => !matchedSet.has(posePath),
		);
		if (missingPaths.length > 0) {
			return yield* Effect.fail(
				new ExpectedMascotPosesMissing({
					missingPaths,
					outputDir,
				}),
			);
		}

		return {
			outputDir,
			matchedResources: [...new Set(matchedResources)].sort((left, right) => {
				if (left < right) {
					return -1;
				}
				if (left > right) {
					return 1;
				}
				return 0;
			}),
		};
	});
}

export function parseCliOutputDir(
	argv: readonly string[],
): Either.Either<string, CliArgsInvalid> {
	const flag = '--output-dir';
	const flagIndex = argv.indexOf(flag);
	if (flagIndex === -1) {
		return Either.right(DEFAULT_OUTPUT_DIR);
	}
	const value = argv[flagIndex + 1];
	if (value === undefined || value.startsWith('-')) {
		return Either.left(
			new CliArgsInvalid({
				reason: `${flag} requires a directory path`,
			}),
		);
	}
	return Either.right(value);
}

export function formatVerifyPackageWarError(
	error: VerifyPackageWarCliError,
): string {
	if (error instanceof ManifestMissing) {
		return `Generated manifest not found at ${error.manifestPath}. Run \`pnpm package\` first, or pass --output-dir to an existing unpacked output.`;
	}
	if (error instanceof ManifestInvalid) {
		return `Generated manifest at ${error.manifestPath} failed validation: ${error.reason}`;
	}
	if (error instanceof UnsafeWarPath) {
		return `Web-accessible resource "${error.pattern}" is not a safe path relative to ${error.outputDir}. Paths must stay inside the output directory.`;
	}
	if (error instanceof WarPatternUnmatched) {
		return `Web-accessible resource(s) matched no files under ${error.outputDir}: ${error.patterns.join(', ')}. Declared resources must exist in the packaged output.`;
	}
	if (error instanceof ExpectedMascotPosesMissing) {
		return `Packaged output is missing expected mascot pose(s): ${error.missingPaths.join(', ')}. A WAR glob that matches only a subset of poses is not enough; all of ${EXPECTED_MASCOT_POSE_PATHS.join(', ')} must ship.`;
	}
	if (error instanceof CliArgsInvalid) {
		return error.reason;
	}
	const exhaustive: never = error;
	return exhaustive;
}

export function runVerifyPackageWarCli(
	argv: readonly string[],
): Effect.Effect<PackageWarVerification, VerifyPackageWarCliError> {
	return Either.match(parseCliOutputDir(argv), {
		onLeft: (error) => Effect.fail(error),
		onRight: (outputDir) => verifyPackageWar(outputDir),
	});
}

function isExecutedAsCli(argv: readonly string[], moduleUrl: string): boolean {
	const entry = argv[1];
	if (entry === undefined) {
		return false;
	}
	return path.resolve(entry) === path.resolve(fileURLToPath(moduleUrl));
}

function printCliResult(argv: readonly string[]): void {
	const outcome = Effect.runSync(Effect.either(runVerifyPackageWarCli(argv)));
	Either.match(outcome, {
		onLeft: (error) => {
			console.error(formatVerifyPackageWarError(error));
			process.exitCode = 1;
		},
		onRight: (verified) => {
			console.log(
				`Verified ${String(verified.matchedResources.length)} web-accessible resource path(s) under ${verified.outputDir}.`,
			);
		},
	});
}

if (isExecutedAsCli(process.argv, import.meta.url)) {
	printCliResult(process.argv.slice(2));
}
