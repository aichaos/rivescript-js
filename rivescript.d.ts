
declare module "rivescript" {
	
	interface RivescriptOptions {
		utf8?: boolean;
		debug?: boolean;
		onDebug?: (message: string) => void;
		errors?: { [key: string]: string};
	}
	
	interface MacroObjectHandler {
		load(name: string, code: string[]): void;
		call(rs: RiveScript, name: string, fields: any, scope: any): string;
	}
	
	
	class RiveScript {
		constructor(options?: RivescriptOptions);
		
		version(): string;
		
		Promise(callback: (resolve: (any) => void, reject: (any) => void) => void): void;
		
		loadDirectory(brain: string, loadingDone: (batchNumber: number) => void, loadingError: (error: Error, batchNumber: number) => void);
		
		loadFile(path: string, loadingDone: (batchNumber: number) => void, loadingError: (error: Error, batchNumber: number) => void);
		
		loadFile(paths: string[], loadingDone: (batchNumber: number) => void, loadingError: (error: Error, batchNumber: number) => void);
		
		sortReplies();
		
		reply(user: string, message: string): string;
		
		replyAsync(user: string, message: string, scope?: any): Promise<string>;
		
		replyAsync(user: string, message: string, scope: any, callback: (error: Error, reply: string) => void);
		
		
		
		setHandler(lang: string, handler: MacroObjectHandler): void;
		
		setSubroutine(name: string, handler: (rs: RiveScript, args: string[]) => string | Promise<string>): void;
		
		setGlobal(name: string, value: string): void;
		
		setVariable(name: string, value: string): void;
		
		setSubstitution(name: string, value: string): void;
		
		setPerson(name: string, value: string): void;
		
		setUservar(user: string, name: string, value: any): void;
		
		setUservars(user: string, data: Object): void;
		
		getVariable(user: string, name: string): string;
		
		getUservar(user: string, name: string): string;		
		
		getUservars(user: string): Object;
		
		clearUservars(user: string): void;
		
		lastMatch(user: string): string;
		
		initialMatch(user: string): string;
		
		currentUser(): string;
	}
	
	export = RiveScript;
}
