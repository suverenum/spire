import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ViewTransition } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
	weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
	title: "Goldhord",
	description: "Treasury management on Tempo blockchain",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={inter.variable}>
			<body className="font-sans antialiased">
				<Providers>
					<ViewTransition name="main-content">{children}</ViewTransition>
				</Providers>
			</body>
		</html>
	);
}
