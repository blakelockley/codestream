"use strict";
import {
	CancellationToken,
	ClientCapabilities,
	Connection,
	createConnection,
	DidChangeConfigurationNotification,
	DidChangeConfigurationParams,
	Disposable,
	Emitter,
	Event,
	InitializedParams,
	InitializeParams,
	InitializeResult,
	Logger as LSPLogger,
	NotificationType,
	NotificationType0,
	ProposedFeatures,
	RequestHandler,
	RequestHandler0,
	RequestType,
	RequestType0,
	TextDocumentSyncKind
} from "vscode-languageserver";
import { Container } from "./container";
import { Logger } from "./logger";
import { CodeStreamSession } from "./session";
import { AgentOptions } from "./shared/agent.protocol";
import { Disposables, memoize } from "./system";

export * from "./shared/agent.protocol";

export interface AgentState {
	email: string;
	userId: string;
	teamId: string;
	apiToken: string;
	serverUrl: string;
}

export class CodeStreamAgent implements Disposable, LSPLogger {
	private _onReady = new Emitter<void>();
	get onReady(): Event<void> {
		return this._onReady.event;
	}

	private _clientCapabilities: ClientCapabilities | undefined;
	private readonly _connection: Connection;
	private _disposable: Disposable | undefined;
	private _session: CodeStreamSession | undefined;

	constructor() {
		// Create a connection for the server. The connection uses Node's IPC as a transport.
		// Also include all preview / proposed LSP features.
		this._connection = createConnection(ProposedFeatures.all);
		Logger.initialize(this);

		this._connection.onInitialize(this.onInitialize.bind(this));
		this._connection.onInitialized(this.onInitialized.bind(this));
		this._connection.onDidChangeConfiguration(this.onConfigurationChanged.bind(this));
		// this._connection.onDidChangeWatchedFiles(this.onWatchedFilesChanged.bind(this));
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private async onInitialize(e: InitializeParams) {
		const capabilities = e.capabilities;
		this._clientCapabilities = capabilities;

		this._session = new CodeStreamSession(
			this,
			this._connection,
			e.initializationOptions! as AgentOptions
		);
		const result = await this._session.login();

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				hoverProvider: true
			},
			result: result
		} as InitializeResult;
	}

	private async onInitialized(e: InitializedParams) {
		try {
			const subscriptions = [];

			if (this.supportsConfiguration) {
				// Register for all configuration changes
				subscriptions.push(
					await this._connection.client.register(DidChangeConfigurationNotification.type, undefined)
				);
			}

			this._disposable = Disposables.from(...subscriptions);

			this._onReady.fire(undefined);
		} catch (ex) {
			debugger;
			Logger.error(ex);
			throw ex;
		}
	}

	private async onConfigurationChanged(e: DidChangeConfigurationParams) {
		Container.instance().updateConfig(e.settings.codestream);
	}

	// private onWatchedFilesChanged(e: DidChangeWatchedFilesParams) {
	// 	// Monitored files have change in VSCode
	// 	this._connection.console.log("Watched Files change event received");
	// }

	@memoize
	get supportsConfiguration() {
		return (
			(this._clientCapabilities &&
				this._clientCapabilities.workspace &&
				!!this._clientCapabilities.workspace.configuration) ||
			false
		);
	}

	@memoize
	get supportsWorkspaces() {
		return (
			(this._clientCapabilities &&
				this._clientCapabilities.workspace &&
				!!this._clientCapabilities.workspace.workspaceFolders) ||
			false
		);
	}

	get connection() {
		return this._connection;
	}

	registerHandler<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	registerHandler<P, R, E, RO>(
		type: RequestType<P, R, E, RO>,
		handler: RequestHandler<P, R, E>
	): void;
	registerHandler(type: any, handler: any): void {
		return this._connection.onRequest(type, handler);
	}

	sendNotification<RO>(type: NotificationType0<RO>): void;
	sendNotification<P, RO>(type: NotificationType<P, RO>, params: P): void;
	sendNotification(type: any, params?: any): void {
		return this._connection.sendNotification(type, params);
	}

	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	sendRequest<P, R, E, RO>(
		type: RequestType<P, R, E, RO>,
		params: P,
		token?: CancellationToken
	): Thenable<R>;
	sendRequest(type: any, params?: any, token?: CancellationToken): Thenable<any> {
		if (CancellationToken.is(params)) {
			token = params;
			params = undefined;
		}
		return this._connection.sendRequest(type, params, token);
	}

	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._connection.console.error(
			typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
		);
	}

	info(message: string): void {
		this._connection.console.info(message);
	}

	listen() {
		this._connection.listen();
	}

	log(message: string): void {
		this._connection.console.log(message);
	}

	warn(message: string): void {
		this._connection.console.warn(message);
	}
}

const agent = new CodeStreamAgent();
agent.listen();
