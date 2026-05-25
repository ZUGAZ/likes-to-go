import type { Layout } from '@/layout/model/layout';

export interface LayoutDetector {
	readonly layout: Exclude<Layout, 'Unknown'>;
	readonly detectInContainer: (container: Element) => boolean;
}
