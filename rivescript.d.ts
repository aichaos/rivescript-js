declare module "rivescript" {
	class SessionManager {
		set(username: string, data: { [index: string]: any }): Promise<void>;

		get(username: string, key: string): Promise<string|null>;

		getAny(username: string): Promise<{ [index: string]: any }>;

		getAll(): Promise<{ [index: string]: { [index: string]: any } }>;

		reset(username: string): Promise<void>;

		resetAll(): Promise<void>;

		freeze(username: string): Promise<void>;

		thaw(username: string, action?: 'thaw' | 'discard' | 'keep'): Promise<void>;

		defaultSession(): { [index: string]: any };
	}

	interface PseudoAbstractSyntaxTree {
		begin: {
			global: { [index: string]: any };
			var:    { [index: string]: any };
			sub:    { [index: string]: any };
			person: { [index: string]: any };
			array:  { [index: string]: any };
		},
		topics:  { [index: string]: any };
		objects: any[];
	}

	class Parser {
		public master: RiveScript;
		public strict: boolean;
		public utf8: boolean;

		constructor(master: RiveScript);

		parse(filename: string, code: string, onError: (err: string, filename?: string, lineno?: number) => any): PseudoAbstractSyntaxTree;

		stringify(deparsed?: PseudoAbstractSyntaxTree): string;

		checkSyntax(command: '!' | '>' | '+' | '%' | '@' | '*', line: string): string;
	}

	class Brain {
		public master: RiveScript;
		public strict: boolean;
		public utf8: boolean;

		constructor(master: RiveScript);

		reply(user: string, msg: string, scope?: any): Promise<string>;

		formatMessage(msg: string, botreply?: null): string;

		triggerRegexp(msg: string, botreply: string): Promise<string>;

		processTags(user: string, _msg: string, reply: string, stars: string[], botstars: string[], step: number, scope: any): Promise<string>;

		substitute(message: string, type: 'sub' | 'person'): string;
	}

	interface RiveScriptErrors {
		replyNotMatched: string;
		replyNotFound: string;
		objectNotFound: string;
		deepRecursion: string;
	}

	interface RiveScriptOptions {
		debug?: boolean;
		strict?: boolean;
		depth?: number;
		utf8?: boolean;
		forceCase?: boolean;
		onDebug?: (message: string) => void;
		concat?: "none" | "newline" | "space";
		errors?: Partial<RiveScriptErrors>;
		sessionManager?: SessionManager;
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
		public unicodePunctuation: RegExp;
		public errors: RiveScriptErrors;
		public parser: Parser;
		public brain: Brain;

		constructor(options?: RiveScriptOptions);

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

		getUservar(user: string, name: string): Promise<any>;

		getUservars(user: string): Promise<{ [index: string]: any }>;

		clearUservars(user: string): Promise<void>;

		freezeUservars(user: string): Promise<void>;

		thawUservars(user: string, action?: 'thaw' | 'discard' | 'keep'): Promise<void>;

		lastMatch(user: string): Promise<string>;

		initialMatch(user: string): Promise<string>;

		lastTriggers(user: string): Promise<Trigger[]>;

		currentUser(): string;
	}

	export default RiveScript;
}
