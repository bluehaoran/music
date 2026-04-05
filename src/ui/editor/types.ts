export type CurrentContext =
	| { type: "section"; sectionId: string }
	| { type: "bar"; sectionId: string; partId: string; barId: string }
	| null;
