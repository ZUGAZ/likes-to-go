import type { MascotVisibilityControls } from '@/mascot/visibility';
import { Context } from 'effect';

export class MascotControlsTag extends Context.Tag('MascotControls')<
	MascotControlsTag,
	MascotVisibilityControls
>() {}
