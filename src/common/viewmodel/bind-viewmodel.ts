import { Effect, Runtime } from 'effect';

export type ViewModelEffect = Effect.Effect<void, unknown>;

/**
 * An effect map entry is either an Effect value or a function returning one.
 * The factory's parameters are typed as `never[]` so a factory with concrete
 * parameters (e.g. `(id: ActionId) => Effect`) still assigns here despite
 * parameter contravariance, while `BindEffectEntry` recovers the real argument
 * tuple for the bound action.
 */
type EffectEntry<Env> =
	| Effect.Effect<unknown, unknown, Env>
	| ((...args: never[]) => Effect.Effect<unknown, unknown, Env>);

/** A factory narrowed to a callable signature for invocation at runtime. */
type CallableEffectFactory<Env> = (
	...args: ReadonlyArray<unknown>
) => Effect.Effect<unknown, unknown, Env>;

function isEffectFactory<Env>(
	entry: EffectEntry<Env>,
): entry is CallableEffectFactory<Env> {
	return typeof entry === 'function';
}

type BindEffectEntry<Entry> = Entry extends (
	...args: infer Args
) => Effect.Effect<unknown, unknown, unknown>
	? (...args: Args) => void
	: Entry extends Effect.Effect<unknown, unknown, unknown>
		? () => void
		: never;

type BoundEffects<E> = {
	readonly [K in keyof E]: BindEffectEntry<E[K]>;
};

export type BoundViewModel<
	VM extends {
		readonly effects: Readonly<Record<string, EffectEntry<unknown>>>;
	},
> = VM & {
	readonly actions: BoundEffects<VM['effects']>;
};

function isKeyOfEffects<Effects extends object>(
	effects: Effects,
	key: PropertyKey,
): key is keyof Effects & string {
	return typeof key === 'string' && Object.hasOwn(effects, key);
}

function isBoundEffectsRecord<Effects extends object>(
	effects: Effects,
	bound: Record<string, (...args: ReadonlyArray<unknown>) => void>,
): bound is BoundEffects<Effects> {
	for (const key of Reflect.ownKeys(effects)) {
		if (!isKeyOfEffects(effects, key)) {
			continue;
		}

		if (typeof bound[key] !== 'function') {
			return false;
		}
	}

	return true;
}

function bindEffectValue<Env>(
	runtime: Runtime.Runtime<Env>,
	key: string,
	name: string,
	effect: Effect.Effect<unknown, unknown, Env>,
): () => void {
	const run = Runtime.runPromise(runtime);

	return (): void => {
		void run(effect.pipe(Effect.withLogSpan(key), Effect.withLogSpan(name)));
	};
}

function bindEffectFactory<Env>(
	runtime: Runtime.Runtime<Env>,
	key: string,
	name: string,
	factory: CallableEffectFactory<Env>,
): (...args: ReadonlyArray<unknown>) => void {
	const run = Runtime.runPromise(runtime);

	return (...args: ReadonlyArray<unknown>): void => {
		void run(
			factory(...args).pipe(Effect.withLogSpan(key), Effect.withLogSpan(name)),
		);
	};
}

function bindEffectsRecord<
	Env,
	Effects extends Readonly<Record<string, EffectEntry<Env>>>,
>(
	runtime: Runtime.Runtime<Env>,
	name: string,
	effects: Effects,
): BoundEffects<Effects> {
	const bound: Record<string, (...args: ReadonlyArray<unknown>) => void> = {};

	for (const key of Reflect.ownKeys(effects)) {
		if (!isKeyOfEffects(effects, key)) {
			continue;
		}

		const entry = effects[key];
		if (entry === undefined) {
			continue;
		}

		if (Effect.isEffect(entry)) {
			bound[key] = bindEffectValue(runtime, key, name, entry);
			continue;
		}

		if (isEffectFactory(entry)) {
			bound[key] = bindEffectFactory(runtime, key, name, entry);
		}
	}

	if (!isBoundEffectsRecord(effects, bound)) {
		throw new Error('bindViewModel failed to bind every effect');
	}

	return bound;
}

export function bindViewModel<
	Env,
	VM extends {
		readonly effects: { readonly [K in keyof VM['effects']]: EffectEntry<Env> };
	},
>(
	runtime: Runtime.Runtime<Env>,
	viewModel: VM,
	name: string,
): BoundViewModel<VM> {
	const actions = bindEffectsRecord(runtime, name, viewModel.effects);

	return {
		...viewModel,
		actions,
	};
}
