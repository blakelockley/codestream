import React from "react";
import { render } from "react-dom";
import Container from "./Container";
import {
	EditorRevealRangeRequestType,
	HostDidChangeActiveEditorNotificationType,
	HostDidChangeConfigNotificationType,
	HostDidChangeFocusNotificationType,
	HostDidChangeEditorSelectionNotificationType,
	HostDidChangeEditorVisibleRangesNotificationType,
	HostDidLogoutNotificationType,
	HostDidReceiveRequestNotificationType,
	Route,
	RouteControllerType,
	RouteActionType,
	ShowCodemarkNotificationType,
	ShowStreamNotificationType,
	WebviewDidInitializeNotificationType,
	WebviewPanels
} from "./ipc/webview.protocol";
import { createCodeStreamStore } from "./store";
import { HostApi } from "./webview-api";
import {
	ApiVersionCompatibility,
	DidChangeApiVersionCompatibilityNotificationType,
	DidChangeConnectionStatusNotificationType,
	DidChangeDataNotificationType,
	DidChangeVersionCompatibilityNotificationType,
	ConnectionStatus,
	ChangeDataType,
	VersionCompatibility,
	GetFileScmInfoRequestType,
	ThirdPartyProviders,
	GetDocumentFromMarkerRequestType
} from "@codestream/protocols/agent";
import { CSApiCapabilities } from "@codestream/protocols/api";
import translations from "./translations/en";
import { apiUpgradeRecommended, apiUpgradeRequired } from "./store/apiVersioning/actions";
import { getCodemark } from "./store/codemarks/reducer";
import { fetchCodemarks, openPanel } from "./Stream/actions";
import { ContextState } from "./store/context/types";
import { CodemarksState } from "./store/codemarks/types";
import { EditorContextState } from "./store/editorContext/types";
import { updateProviders } from "./store/providers/actions";
import { apiCapabilitiesUpdated } from "./store/apiVersioning/actions";
import { bootstrap, reset } from "./store/actions";
import { online, offline } from "./store/connectivity/actions";
import { upgradeRequired, upgradeRecommended } from "./store/versioning/actions";
import { updatePreferences } from "./store/preferences/actions";
import { updateUnreads } from "./store/unreads/actions";
import { updateConfigs } from "./store/configs/actions";
import { setEditorContext } from "./store/editorContext/actions";
import { blur, focus, setCurrentStream, setCurrentCodemark } from "./store/context/actions";
import { isNotOnDisk } from "./utils";
import { URI } from "vscode-uri";
import { CodemarkDetails } from "./Stream/CodemarkDetails";

export { HostApi };

export function setupCommunication(host: { postMessage: (message: any) => void }) {
	Object.defineProperty(window, "acquireCodestreamHost", {
		value() {
			return host;
		}
	});
}

export async function initialize(selector: string) {
	const store = createCodeStreamStore(undefined, undefined);

	listenForEvents(store);

	render(
		<Container store={store} i18n={{ locale: "en", messages: translations }} />,
		document.querySelector(selector)
	);

	await store.dispatch(bootstrap() as any);

	HostApi.instance.notify(WebviewDidInitializeNotificationType, {});
}

// TODO: type up the store state
export function listenForEvents(store) {
	const api = HostApi.instance;

	api.on(DidChangeConnectionStatusNotificationType, e => {
		if (e.status === ConnectionStatus.Reconnected) {
			store.dispatch(online());
		} else {
			store.dispatch(offline());
		}
	});

	api.on(DidChangeVersionCompatibilityNotificationType, e => {
		if (e.compatibility === VersionCompatibility.CompatibleUpgradeRecommended) {
			store.dispatch(upgradeRecommended());
		} else if (e.compatibility === VersionCompatibility.UnsupportedUpgradeRequired) {
			store.dispatch(upgradeRequired());
		}
	});

	api.on(DidChangeApiVersionCompatibilityNotificationType, e => {
		if (e.compatibility === ApiVersionCompatibility.ApiUpgradeRequired) {
			store.dispatch(apiUpgradeRequired());
		} else if (e.compatibility === ApiVersionCompatibility.ApiUpgradeRecommended) {
			store.dispatch(apiUpgradeRecommended(e.missingCapabilities || {}));
		}
	});

	api.on(DidChangeDataNotificationType, ({ type, data }) => {
		switch (type) {
			case ChangeDataType.Preferences:
				store.dispatch(updatePreferences(data));
				break;
			case ChangeDataType.Unreads:
				store.dispatch(updateUnreads(data as any)); // TODO: Not sure why we need the any here
				break;
			case ChangeDataType.Providers:
				store.dispatch(updateProviders(data as ThirdPartyProviders));
				break;
			case ChangeDataType.ApiCapabilities:
				store.dispatch(apiCapabilitiesUpdated(data as CSApiCapabilities));
				break;
			default:
				store.dispatch({ type: `ADD_${type.toUpperCase()}`, payload: data });
		}
	});

	api.on(HostDidChangeConfigNotificationType, configs => store.dispatch(updateConfigs(configs)));

	api.on(HostDidChangeActiveEditorNotificationType, async params => {
		let context: EditorContextState;
		if (params.editor) {
			context = {
				activeFile: params.editor.fileName,
				textEditorUri: params.editor.uri,
				textEditorVisibleRanges: params.editor.visibleRanges,
				textEditorSelections: params.editor.selections,
				metrics: params.editor.metrics,
				textEditorLineCount: params.editor.lineCount,
				scmInfo: isNotOnDisk(params.editor.uri)
					? undefined
					: await api.send(GetFileScmInfoRequestType, { uri: params.editor.uri })
			};
		} else {
			context = {
				activeFile: undefined,
				textEditorUri: undefined,
				textEditorSelections: [],
				textEditorVisibleRanges: [],
				scmInfo: undefined
			};
		}
		store.dispatch(setEditorContext(context));
	});

	api.on(HostDidChangeFocusNotificationType, ({ focused }) => {
		if (focused) {
			setTimeout(() => store.dispatch(focus()), 10); // we want the first click to go to the FocusTrap blanket
		} else {
			store.dispatch(blur());
		}
	});

	api.on(HostDidLogoutNotificationType, () => {
		store.dispatch(reset());
	});

	api.on(HostDidChangeEditorSelectionNotificationType, params => {
		store.dispatch(
			setEditorContext({
				textEditorUri: params.uri,
				textEditorVisibleRanges: params.visibleRanges,
				textEditorSelections: params.selections,
				textEditorLineCount: params.lineCount
			})
		);
	});

	api.on(HostDidChangeEditorVisibleRangesNotificationType, params => {
		store.dispatch(
			setEditorContext({
				textEditorUri: params.uri,
				textEditorVisibleRanges: params.visibleRanges,
				textEditorSelections: params.selections,
				textEditorLineCount: params.lineCount
			})
		);
	});

	const onShowStreamNotificationType = async function(streamId, threadId, codemarkId) {
		if (codemarkId) {
			let {
				codemarks
			}: {
				codemarks: CodemarksState;
			} = store.getState();

			if (Object.keys(codemarks).length === 0) {
				await store.dispatch(fetchCodemarks());
				codemarks = store.getState().codemarks;
			}
			const codemark = getCodemark(codemarks, codemarkId);
			if (codemark == null) return;

			store.dispatch(openPanel(WebviewPanels.Codemarks));
			if (codemark.streamId) {
				store.dispatch(setCurrentStream(codemark.streamId, codemark.postId));
			} else if (codemark.markerIds) {
				const response = await HostApi.instance.send(GetDocumentFromMarkerRequestType, {
					markerId: codemark.markerIds[0]
				});
				if (response) {
					HostApi.instance.send(EditorRevealRangeRequestType, {
						uri: response.textDocument.uri,
						range: response.range,
						atTop: true
					});
				}
			}
		} else {
			store.dispatch(openPanel("main"));
			store.dispatch(setCurrentStream(streamId, threadId));
		}
	};
	api.on(ShowStreamNotificationType, async ({ streamId, threadId, codemarkId }) => {
		onShowStreamNotificationType(streamId, threadId, codemarkId);
	});

	api.on(ShowCodemarkNotificationType, async e => {
		let {
			codemarks,
			context,
			editorContext
		}: {
			codemarks: CodemarksState;
			context: ContextState;
			editorContext: EditorContextState;
		} = store.getState();

		if (Object.keys(codemarks).length === 0) {
			await store.dispatch(fetchCodemarks());
			codemarks = store.getState().codemarks;
		}

		const codemark = getCodemark(codemarks, e.codemarkId);
		if (codemark == null) return;

		store.dispatch(setCurrentCodemark(codemark.id));
	});

	const parseProtocol = function(uriString): Route | undefined {
		let uri: URI;
		try {
			const decodedUriString = decodeURIComponent(uriString);
			uri = URI.parse(decodedUriString);
			uri = URI.parse("codestream:/" + uri.path);
		} catch (ex) {
			return undefined;
		}
		// removes any empties
		const paths = uri.path.split("/").filter(function(p) {
			return p;
		});

		const controller: RouteControllerType = uri.authority as RouteControllerType;
		let action: RouteActionType | undefined;
		let id: string | undefined;

		if (paths.length > 0) {
			action = paths[1] as RouteActionType;
			id = paths[0];
		}

		return {
			controller,
			action,
			id
		};
	};

	api.on(HostDidReceiveRequestNotificationType, async e => {
		if (!e) return;

		const route = parseProtocol(e.url);
		if (!route || !route.controller) return;

		switch (route.controller) {
			case "codemark": {
				if (route.action) {
					switch (route.action) {
						case "open": {
							if (route.id) {
								store.dispatch(setCurrentCodemark(route.id));
							}
							break;
						}
					}
				}
				break;
			}
			default: {
				break;
			}
		}
	});
}
