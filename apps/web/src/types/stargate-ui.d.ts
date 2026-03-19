declare module "@layerzerolabs/stargate-ui" {
	// Web component — auto-registers <stargate-widget> on import
}

declare namespace JSX {
	interface IntrinsicElements {
		"stargate-widget": React.DetailedHTMLProps<
			React.HTMLAttributes<HTMLElement> & { theme?: string },
			HTMLElement
		>;
	}
}
