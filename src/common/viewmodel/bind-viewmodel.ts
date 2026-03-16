import { Effect, Record as EffectRecord, Runtime } from 'effect';

export type ViewModelEffect = Effect.Effect<void, unknown>;

type EffectFactory<Env> = (
	...args: ReadonlyArray<unknown>
) => Effect.Effect<unknown, unknown, Env>;

type EffectEntry<Env> =
	| EffectFactory<Env>
	| Effect.Effect<unknown, unknown, Env>;

type ViewModelWithEffects<Env> = {
	readonly effects: Readonly<Record<string, EffectEntry<Env>>>;
};

export type BoundEffects<E> = {
	readonly [K in keyof E]: E[K] extends (
		...args: infer A
	) => Effect.Effect<unknown, unknown, unknown>
		? (...args: A) => void
		: E[K] extends Effect.Effect<unknown, unknown, unknown>
			? () => void
			: never;
};

export type BoundViewModel<VM extends ViewModelWithEffects<unknown>> = VM & {
	readonly actions: BoundEffects<VM['effects']>;
};

export function bindViewModel<Env, VM extends ViewModelWithEffects<Env>>(
	runtime: Runtime.Runtime<Env>,
	viewModel: VM,
	name: string,
): BoundViewModel<VM> {
	const run = Runtime.runPromise(runtime);
	const actions = EffectRecord.map(
		viewModel.effects,
		(effectOrFactory, key) => {
			return (...args: ReadonlyArray<unknown>): void => {
				const effect = Effect.isEffect(effectOrFactory)
					? effectOrFactory
					: effectOrFactory(...args);
				void run(
					effect.pipe(Effect.withLogSpan(name), Effect.withLogSpan(key)),
				);
			};
		},
	);

	return {
		...viewModel,
		actions,
	} as BoundViewModel<VM>;
}
