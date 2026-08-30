import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Effect, Either } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import {
	CliArgsInvalid,
	DEFAULT_OUTPUT_DIR,
	EXPECTED_MASCOT_POSE_PATHS,
	ExpectedMascotPosesMissing,
	formatVerifyPackageWarError,
	isUnsafeRelativeWarPath,
	ManifestInvalid,
	ManifestMissing,
	parseCliOutputDir,
	UnsafeWarPath,
	verifyPackageWar,
	WarPatternUnmatched,
} from './scripts/verify-package-war';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const mascotPoses = ['idle', 'working', 'happy', 'sad'] as const;

const tempDirs: string[] = [];

function makeTempOutput(): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'likes-to-go-war-'));
	tempDirs.push(dir);
	return dir;
}

function writeFiles(
	root: string,
	files: Readonly<Record<string, string>>,
): void {
	for (const relativePath of Object.keys(files)) {
		const contents = files[relativePath];
		if (contents === undefined) {
			continue;
		}
		const absolutePath = path.join(root, relativePath);
		mkdirSync(path.dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, contents);
	}
}

function manifestWithResources(
	resourceGroups: readonly (readonly string[])[],
): string {
	return JSON.stringify({
		web_accessible_resources: resourceGroups.map((resources) => ({
			resources: [...resources],
			matches: ['https://*.soundcloud.com/*'],
		})),
	});
}

function writeCompletePoseOutput(
	outputDir: string,
	resourceGroups: readonly (readonly string[])[] = [
		['mascot/*.webp'],
		['content-scripts/likes.css'],
	],
): void {
	writeFiles(outputDir, {
		'manifest.json': manifestWithResources(resourceGroups),
		'mascot/idle.webp': 'idle',
		'mascot/working.webp': 'working',
		'mascot/happy.webp': 'happy',
		'mascot/sad.webp': 'sad',
		'content-scripts/likes.css': 'css',
	});
}

function runVerify(outputDir: string) {
	return Effect.runSync(Effect.either(verifyPackageWar(outputDir)));
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe('verifyPackageWar', () => {
	it('matches WAR globs and literals when every declared file exists', () => {
		const outputDir = makeTempOutput();
		writeCompletePoseOutput(outputDir);

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect.fail(formatVerifyPackageWarError(error));
			},
			onRight: (verified) => {
				expect(verified.outputDir).toBe(outputDir);
				expect(verified.matchedResources).toEqual(
					['content-scripts/likes.css', ...EXPECTED_MASCOT_POSE_PATHS].sort(
						(left, right) => left.localeCompare(right),
					),
				);
			},
		});
	});

	it('matches an explicit literal list of every expected mascot pose', () => {
		const outputDir = makeTempOutput();
		writeCompletePoseOutput(outputDir, [
			EXPECTED_MASCOT_POSE_PATHS,
			['content-scripts/likes.css'],
		]);

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect.fail(formatVerifyPackageWarError(error));
			},
			onRight: (verified) => {
				for (const posePath of EXPECTED_MASCOT_POSE_PATHS) {
					expect(verified.matchedResources).toContain(posePath);
				}
			},
		});
	});

	it('fails when a WAR glob matches no files', () => {
		const outputDir = makeTempOutput();
		writeFiles(outputDir, {
			'manifest.json': manifestWithResources([['missing/*.png']]),
		});

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(WarPatternUnmatched);
				if (error instanceof WarPatternUnmatched) {
					expect(error.patterns).toEqual(['missing/*.png']);
				}
				expect(formatVerifyPackageWarError(error)).toContain('missing/*.png');
			},
			onRight: () => {
				expect.fail('expected a glob with no files to fail');
			},
		});
	});

	it('fails when a WAR literal is missing from the output', () => {
		const outputDir = makeTempOutput();
		writeFiles(outputDir, {
			'manifest.json': manifestWithResources([['mascot/idle.webp']]),
		});

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(WarPatternUnmatched);
				if (error instanceof WarPatternUnmatched) {
					expect(error.patterns).toEqual(['mascot/idle.webp']);
				}
			},
			onRight: () => {
				expect.fail('expected a missing literal to fail');
			},
		});
	});

	it('rejects a WAR path that escapes the output directory', () => {
		const outputDir = makeTempOutput();
		const outsideFile = path.join(outputDir, '..', 'secret.png');
		writeFileSync(outsideFile, 'secret');
		writeFiles(outputDir, {
			'manifest.json': manifestWithResources([['../secret.png']]),
		});

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(UnsafeWarPath);
				if (error instanceof UnsafeWarPath) {
					expect(error.pattern).toBe('../secret.png');
				}
				expect(formatVerifyPackageWarError(error)).toContain('../secret.png');
			},
			onRight: () => {
				expect.fail('expected an escaping WAR path to fail');
			},
		});
	});

	it('fails when the generated manifest is missing', () => {
		const outputDir = makeTempOutput();

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(ManifestMissing);
				expect(formatVerifyPackageWarError(error)).toContain('manifest.json');
			},
			onRight: () => {
				expect.fail('expected a missing manifest to fail');
			},
		});
	});

	it('fails when the generated manifest is not valid JSON', () => {
		const outputDir = makeTempOutput();
		writeFiles(outputDir, {
			'manifest.json': '{',
		});

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(ManifestInvalid);
			},
			onRight: () => {
				expect.fail('expected invalid JSON to fail');
			},
		});
	});

	it('does not accept a WAR glob that matches only a subset of poses', () => {
		const outputDir = makeTempOutput();
		writeFiles(outputDir, {
			'manifest.json': manifestWithResources([
				['mascot/*.webp'],
				['content-scripts/likes.css'],
			]),
			'mascot/idle.webp': 'idle',
			'content-scripts/likes.css': 'css',
		});

		Either.match(runVerify(outputDir), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(ExpectedMascotPosesMissing);
				if (error instanceof ExpectedMascotPosesMissing) {
					expect(error.missingPaths).toEqual([
						'mascot/working.webp',
						'mascot/happy.webp',
						'mascot/sad.webp',
					]);
				}
				expect(formatVerifyPackageWarError(error)).toContain(
					'mascot/working.webp',
				);
			},
			onRight: () => {
				expect.fail('expected a partial pose set to fail');
			},
		});
	});
});

describe('isUnsafeRelativeWarPath', () => {
	it('rejects absolute paths, parent segments, and empty patterns', () => {
		const outputDir = '/tmp/extension-output';
		expect(isUnsafeRelativeWarPath('../secret.png', outputDir)).toBe(true);
		expect(isUnsafeRelativeWarPath('/etc/passwd', outputDir)).toBe(true);
		expect(isUnsafeRelativeWarPath('mascot/../../secret.png', outputDir)).toBe(
			true,
		);
		expect(isUnsafeRelativeWarPath('', outputDir)).toBe(true);
	});

	it('allows relative literals and globs that stay inside output', () => {
		const outputDir = '/tmp/extension-output';
		expect(isUnsafeRelativeWarPath('mascot/idle.webp', outputDir)).toBe(false);
		expect(isUnsafeRelativeWarPath('mascot/*.webp', outputDir)).toBe(false);
		expect(
			isUnsafeRelativeWarPath('content-scripts/likes.css', outputDir),
		).toBe(false);
	});
});

describe('parseCliOutputDir', () => {
	it('defaults to the chrome-mv3 production output', () => {
		Either.match(parseCliOutputDir([]), {
			onLeft: (error) => {
				expect.fail(formatVerifyPackageWarError(error));
			},
			onRight: (outputDir) => {
				expect(outputDir).toBe(DEFAULT_OUTPUT_DIR);
			},
		});
	});

	it('accepts an explicit --output-dir override', () => {
		Either.match(parseCliOutputDir(['--output-dir', '/tmp/custom-output']), {
			onLeft: (error) => {
				expect.fail(formatVerifyPackageWarError(error));
			},
			onRight: (outputDir) => {
				expect(outputDir).toBe('/tmp/custom-output');
			},
		});
	});

	it('fails when --output-dir has no path', () => {
		Either.match(parseCliOutputDir(['--output-dir']), {
			onLeft: (error) => {
				expect(error).toBeInstanceOf(CliArgsInvalid);
			},
			onRight: () => {
				expect.fail('expected a missing --output-dir value to fail');
			},
		});
	});
});

describe('public mascot WebP copies', () => {
	it('tracks a WebP file for each pose', () => {
		for (const pose of mascotPoses) {
			const published = readFileSync(
				path.join(repoRoot, 'public/mascot', `${pose}.webp`),
			);
			expect(published.byteLength).toBeGreaterThan(0);
			expect(published.toString('ascii', 0, 4)).toBe('RIFF');
			expect(published.toString('ascii', 8, 12)).toBe('WEBP');
		}
	});
});
