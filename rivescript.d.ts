declare module "rivescript" {

	interface RivescriptOptions {
		utf8?: boolean;
		debug?: boolean;
		onDebug?: (message: string) => void;
		concat?: "none" | "newline" | "space";
		errors?: { [key: string]: string};
	}

	interface MacroObjectHandler {
		load(name: string, code: string[]): void;
		call(rs: RiveScript, name: string, fields: any, scope: any): string;
	}

	interface Trigger {
		trigger:    string;
		reply:      string[];
		condition:  string[];
		redirect:   string;
		previous:   string;
	}

	class RiveScript {
		constructor(options?: RivescriptOptions);

		version(): string;

		Promise(callback: (resolve: (...args: any[]) => void, reject: (reason?: any) => void) => void): void;

		loadDirectory(brain: string, loadingDone?: (batchNumber: number) => void, loadingError?: (error: Error, batchNumber: number) => void): Promise<any>;

		loadFile(path: string, loadingDone?: (batchNumber: number) => void, loadingError?: (error: Error, batchNumber: number) => void): Promise<any>;

		loadFile(paths: string[], loadingDone?: (batchNumber: number) => void, loadingError?: (error: Error, batchNumber: number) => void): Promise<any>;

		stream(code: string, onError: (error: string) => void): boolean;

		sortReplies(): void;

		reply(user: string, message: string, scope?: any): Promise<string>;

		replyAsync(user: string, message: string, scope?: any): Promise<string>;

		replyAsync(user: string, message: string, scope: any, callback: (error: Error, reply: string) => void): Promise<string>;

		setHandler(lang: string, handler: MacroObjectHandler): void;

		setSubroutine(name: string, handler: (rs: RiveScript, args: string[]) => string | Promise<string>): void;

		setGlobal(name: string, value: string): void;

		setVariable(name: string, value: string): void;

		setSubstitution(name: string, value: string): void;

		setPerson(name: string, value: string): void;

		setUservar(user: string, name: string, value: any): Promise<void>;

		setUservars(user: string, data: { [index: string]: any }): Promise<void>;

		getVariable(user: string, name: string): string;

		getUservar(user: string, name: string): Promise<string>;

		getUservars(user: string): Promise<{ [index: string]: any }>;

		clearUservars(user: string): Promise<void>;

		lastMatch(user: string): Promise<string>;

		initialMatch(user: string): Promise<string>;

		lastTriggers(user: string): Promise<Trigger[]>;

		currentUser(): string;
	}

	export default RiveScript;
}
