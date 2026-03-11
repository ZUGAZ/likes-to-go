## Collection model layout

- **Commands** live under `commands/`, one file per command variant (`create-tab.ts`, `close-tab.ts`, etc.).
- **Events** live under `events/`, one file per event variant (`start-collection.ts`, `tracks-batch.ts`, etc.).
- **States** live under `states/`, one file per state variant (`idle.ts`, `collecting.ts`, etc.).

Each variant file defines:

- a `...Schema` tagged struct,
- a `type` alias for the schema type,
- a `Data.tagged` constructor,
- and a `Schema.is` guard.

The `commands/index.ts`, `events/index.ts`, and `states/index.ts` barrels:

- assemble the union schemas (`CollectionCommandSchema`, `CollectionEventSchema`, `CollectionStateSchema`),
- export the union types,
- and re-export all variant constructors and guards.

The legacy `command.ts`, `event.ts`, and `state.ts` files are thin facades that re-export from the corresponding subdirectory barrels. New variants should always be added by:

1. Creating a new file under `commands/`, `events/`, or `states/`.
2. Wiring its schema into the appropriate `index.ts` union.
