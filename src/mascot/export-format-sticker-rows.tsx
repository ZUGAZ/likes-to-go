import { For, createUniqueId } from 'solid-js';

export interface ExportFormatStickerRow {
	readonly id: string;
	readonly label: string;
	readonly worksWith: string;
}

export interface ExportFormatStickerRowsProps {
	readonly formats: ReadonlyArray<ExportFormatStickerRow>;
	readonly selectedId: string;
	readonly onSelect: (id: string) => void;
}

export function ExportFormatStickerRows(props: ExportFormatStickerRowsProps) {
	const groupId = createUniqueId();

	return (
		<fieldset class="beat-balloon__formats">
			<legend class="sr-only">Backup format</legend>
			<For each={props.formats}>
				{(format) => {
					const radioId = `${groupId}-${format.id}`;
					const chipId = `${groupId}-chip-${format.id}`;
					const hintId = `${groupId}-hint-${format.id}`;
					return (
						<label class="beat-balloon__format-row" for={radioId}>
							<input
								id={radioId}
								class="sr-only"
								type="radio"
								name={groupId}
								value={format.id}
								checked={format.id === props.selectedId}
								aria-labelledby={chipId}
								aria-describedby={hintId}
								onChange={() => {
									props.onSelect(format.id);
								}}
							/>
							<span id={chipId} class="beat-balloon__format-chip">
								{format.label}
							</span>
							<span id={hintId} class="beat-balloon__format-hint">
								{format.worksWith}
							</span>
						</label>
					);
				}}
			</For>
		</fieldset>
	);
}
