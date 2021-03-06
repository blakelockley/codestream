import React from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import { connectProvider, getUserProviderInfo } from "../../store/providers/actions";
import { openPanel, setIssueProvider, setCurrentCodemark } from "../../store/context/actions";
import Icon from "../Icon";
import Menu from "../Menu";
import { ProviderDisplay, PROVIDER_MAPPINGS } from "./types";
import {
	ThirdPartyProviderConfig,
	ThirdPartyProviders,
	FetchThirdPartyBoardsRequestType,
	FetchThirdPartyCardsRequestType
	// FetchThirdPartyCardWorkflowRequestType
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { PrePRProviderInfoModalProps, PrePRProviderInfoModal } from "../PrePRProviderInfoModal";
import { CodeStreamState } from "@codestream/webview/store";
import { getConnectedProviderNames } from "@codestream/webview/store/providers/reducer";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { setUserPreference } from "../actions";
import { HostApi } from "../..";
import { keyFilter } from "@codestream/webview/utils";
import {
	StartWorkIssueContext,
	RoundedLink,
	RoundedSearchLink,
	H4,
	WideStatusSection,
	EMPTY_STATUS
} from "../StatusPanel";
import styled from "styled-components";
import Filter from "../Filter";
import { SmartFormattedList } from "../SmartFormattedList";
import { Provider, IntegrationButtons } from "../IntegrationsPanel";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import Tooltip from "../Tooltip";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import * as codemarkSelectors from "../../store/codemarks/reducer";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { Modal } from "../Modal";
import { Button } from "@codestream/webview/src/components/Button";
import { OpenUrlRequestType, WebviewPanels } from "@codestream/protocols/webview";

interface ProviderInfo {
	provider: ThirdPartyProviderConfig;
	display: ProviderDisplay;
}

interface ConnectedProps {
	connectedProviderNames: string[];
	currentTeamId: string;
	currentUser: CSMe;
	issueProviderConfig?: ThirdPartyProviderConfig;
	providers: ThirdPartyProviders;
	disabledProviders: { [key: string]: boolean };
	setUserPreference?: Function;
}

interface Props extends ConnectedProps {
	connectProvider(...args: Parameters<typeof connectProvider>): any;
	updateForProvider(...args: Parameters<typeof updateForProvider>): any;
	setIssueProvider(providerId?: string): void;
	openPanel(...args: Parameters<typeof openPanel>): void;
	isEditing?: boolean;
	selectedCardId: string;
}

interface State {
	isLoading: boolean;
	loadingProvider?: ProviderInfo;
	issueProviderMenuOpen: boolean;
	issueProviderMenuTarget: any;
	propsForPrePRProviderInfoModal?: PrePRProviderInfoModalProps;
}

class IssueDropdown extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		const providerInfo = props.issueProviderConfig
			? this.getProviderInfo(props.issueProviderConfig.id)
			: undefined;
		const loadingProvider = providerInfo;
		this.state = {
			isLoading: false,
			loadingProvider,
			issueProviderMenuOpen: false,
			issueProviderMenuTarget: undefined
		};
	}

	componentDidMount() {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;
		if (!issueProviderConfig || !providerInfo) {
			this.props.setIssueProvider(undefined);
		}
	}

	componentDidUpdate(prevProps: Props, prevState: State) {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;
		if (
			providerInfo &&
			issueProviderConfig &&
			(!prevProps.issueProviderConfig ||
				prevProps.issueProviderConfig.id !== issueProviderConfig.id)
		) {
			this.setState({ isLoading: false });
		} else if (!providerInfo && prevProps.issueProviderConfig) {
			if (this.state.isLoading) {
				this.setState({ isLoading: false, loadingProvider: undefined });
			}
		}
	}

	renderLoading() {
		const { isLoading, loadingProvider } = this.state;

		if (!isLoading) return null;

		return (
			<LoadingMessage align="left">
				Authenticating with {loadingProvider!.display.displayName}... (check your web browser){" "}
				<a onClick={this.cancelLoading}>cancel</a>
			</LoadingMessage>
		);
	}

	cancelLoading = () => {
		this.setState({ isLoading: false });
		this.props.setIssueProvider(undefined);
	};

	render() {
		const { issueProviderConfig } = this.props;
		const providerInfo = issueProviderConfig
			? this.getProviderInfo(issueProviderConfig.id)
			: undefined;

		if (!this.props.providers || !Object.keys(this.props.providers).length) return null;

		const knownIssueProviders = Object.keys(this.props.providers).filter(providerId => {
			const provider = this.props.providers![providerId];
			return provider.hasIssues && !!PROVIDER_MAPPINGS[provider.name];
		});
		if (knownIssueProviders.length === 0) {
			return null;
		}

		const selectedProviderId = providerInfo && providerInfo.provider.id;
		const knownIssueProviderOptions = knownIssueProviders
			.map(providerId => {
				const issueProvider = this.props.providers![providerId];
				const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
				const displayName = issueProvider.isEnterprise
					? `${providerDisplay.displayName} - ${issueProvider.host}`
					: providerDisplay.displayName;
				const supported = providerDisplay.supportsStartWork;
				return {
					providerIcon: <Icon name={providerDisplay.icon || "blank"} />,
					checked: this.providerIsConnected(providerId) && !this.providerIsDisabled(providerId),
					value: providerId,
					label: displayName + (supported ? "" : " (soon!)"),
					disabled: !supported,
					key: providerId,
					action: () => this.selectIssueProvider(providerId)
				};
			})
			.sort((a, b) =>
				a.disabled === b.disabled ? a.label.localeCompare(b.label) : a.disabled ? 1 : -1
			);
		// const index = knownIssueProviderOptions.findIndex(i => i.disabled);
		// @ts-ignore
		// knownIssueProviderOptions.splice(index, 0, { label: "-" });

		const activeProviders = knownIssueProviders
			.filter(id => this.providerIsConnected(id) && !this.providerIsDisabled(id))
			.map(id => this.props.providers![id]);

		return (
			<>
				{this.state.propsForPrePRProviderInfoModal && (
					<PrePRProviderInfoModal {...this.state.propsForPrePRProviderInfoModal} />
				)}
				<IssueList
					providers={activeProviders}
					knownIssueProviderOptions={knownIssueProviderOptions}
					selectedCardId={this.props.selectedCardId}
					loadingMessage={this.state.isLoading ? this.renderLoading() : null}
				></IssueList>
			</>
		);
	}

	renderProviderOptions = (selectedProvider, knownIssueProviderOptions) => {
		return (
			<span className="dropdown-button" onClick={this.switchIssueProvider}>
				<Icon name="chevron-down" />
				{this.state.issueProviderMenuOpen && (
					<Menu
						align="dropdownRight"
						target={this.state.issueProviderMenuTarget}
						items={knownIssueProviderOptions}
						action={() => {}}
					/>
				)}
			</span>
		);
	};

	switchIssueProvider = (event: React.SyntheticEvent) => {
		if (this.props.isEditing) return;

		event.stopPropagation();
		const target = event.target;
		this.setState(state => ({
			issueProviderMenuOpen: !state.issueProviderMenuOpen,
			// @ts-ignore
			issueProviderMenuTarget: target.closest(".dropdown-button")
		}));
	};

	providerIsDisabled = providerId => this.props.disabledProviders[providerId];

	selectIssueProvider = providerId => {
		const { setUserPreference } = this.props;
		this.setState({ issueProviderMenuOpen: false });
		if (!providerId) return;
		if (providerId === "codestream") {
			this.props.setIssueProvider(undefined);
			return;
		}

		// if (setUserPreference) setUserPreference(["skipConnectIssueProviders"], false);

		if (this.providerIsDisabled(providerId)) {
			// if it's disabled, enable it
			if (setUserPreference)
				setUserPreference(["startWork", "disabledProviders", providerId], false);
		} else if (this.providerIsConnected(providerId)) {
			// if it's conected and not disabled, disable it
			if (setUserPreference) {
				setUserPreference(["startWork", "disabledProviders", providerId], true);
				// setUserPreference(["skipConnectIssueProviders"], false);
			}
		} else {
			// otherwise we need to connect
			const issueProvider = this.props.providers![providerId];
			const providerDisplay = PROVIDER_MAPPINGS[issueProvider.name];
			this.onChangeProvider({ provider: issueProvider, display: providerDisplay });
		}
	};

	async onChangeProvider(providerInfo: ProviderInfo) {
		if (
			providerInfo.provider.needsConfigure &&
			!this.providerIsConnected(providerInfo.provider.id)
		) {
			const { name, id } = providerInfo.provider;
			this.props.openPanel(`configure-provider-${name}-${id}-Compose Modal`);
		} else if (
			providerInfo.provider.forEnterprise &&
			!this.providerIsConnected(providerInfo.provider.id)
		) {
			const { name, id } = providerInfo.provider;
			/* if (name === "github_enterprise") {
				this.setState({
					propsForPrePRProviderInfoModal: {
						providerName: name,
						onClose: () => this.setState({ propsForPrePRProviderInfoModal: undefined }),
						action: () => this.props.openPanel(`configure-enterprise-${name}-${id}`)
					}
				});
			} else */ this.props.openPanel(
				`configure-enterprise-${name}-${id}-Compose Modal`
			);
		} else {
			const { name } = providerInfo.provider;
			const { connectedProviderNames, issueProviderConfig } = this.props;
			const newValueIsNotCurrentProvider =
				issueProviderConfig == undefined || issueProviderConfig.name !== name;
			const newValueIsNotAlreadyConnected = !connectedProviderNames.includes(name);
			if (
				newValueIsNotCurrentProvider &&
				newValueIsNotAlreadyConnected &&
				(name === "github" || name === "bitbucket" || name === "gitlab")
			) {
				this.setState({
					propsForPrePRProviderInfoModal: {
						providerName: name,
						onClose: () => {
							this.setState({ propsForPrePRProviderInfoModal: undefined });
						},
						action: () => {
							this.setState({ isLoading: true, loadingProvider: providerInfo });
							this.props.connectProvider(providerInfo.provider.id, "Status");
						}
					}
				});
			} else {
				this.setState({ isLoading: true, loadingProvider: providerInfo });
				const ret = await this.props.connectProvider(providerInfo.provider.id, "Status");
				if (ret && ret.alreadyConnected) this.setState({ isLoading: false });
			}
		}
	}

	getProviderInfo(providerId: string): ProviderInfo | undefined {
		const provider = this.props.providers ? this.props.providers[providerId] : undefined;
		if (!provider) return undefined;
		const display = provider ? PROVIDER_MAPPINGS[provider.name] : undefined;
		if (!display) return undefined;
		let providerInfo = getUserProviderInfo(
			this.props.currentUser,
			provider.name,
			this.props.currentTeamId
		);
		if (!providerInfo) return;
		if (providerInfo.accessToken) return { provider, display };
		if (!provider.isEnterprise) return undefined;
		if (!providerInfo!.hosts) return undefined;
		providerInfo = providerInfo!.hosts[provider.id];
		if (!providerInfo) return undefined;
		return { provider, display };
	}

	providerIsConnected(providerId: string): boolean {
		const provider = this.props.providers ? this.props.providers[providerId] : undefined;
		const { currentUser } = this.props;
		if (!provider || currentUser.providerInfo == undefined) return false;
		let providerInfo = getUserProviderInfo(currentUser, provider.name, this.props.currentTeamId);
		if (!providerInfo) return false;
		if (providerInfo.accessToken) return true;
		if (!provider.isEnterprise) return false;
		if (!providerInfo.hosts) return false;
		providerInfo = providerInfo.hosts[provider.id];
		return providerInfo && !!providerInfo.accessToken;
	}
}

const mapStateToProps = (state: CodeStreamState): ConnectedProps => {
	const { users, session, context, providers, preferences } = state;
	const currentIssueProviderConfig = context.issueProvider
		? providers[context.issueProvider]
		: undefined;

	const workPreferences = preferences.startWork || {};

	return {
		currentUser: users[session.userId!] as CSMe,
		currentTeamId: context.currentTeamId,
		providers,
		issueProviderConfig: currentIssueProviderConfig,
		connectedProviderNames: getConnectedProviderNames(state),
		disabledProviders: workPreferences.disabledProviders || {}
	};
};

export default connect(mapStateToProps, {
	connectProvider,
	setIssueProvider,
	openPanel,
	updateForProvider,
	setUserPreference
})(IssueDropdown);

export function Issue(props) {
	const { card } = props;
	return (
		<div onClick={props.onClick} style={{ padding: "2px 0" }}>
			{card.icon}
			{card.label}
		</div>
	);
}

interface IssueListProps {
	providers: ThirdPartyProviderConfig[];
	knownIssueProviderOptions: any;
	selectedCardId: string;
	loadingMessage?: React.ReactNode;
}

const EMPTY_HASH = {};
const EMPTY_CUSTOM_FILTERS = { selected: "", filters: {} };

export function IssueList(props: React.PropsWithChildren<IssueListProps>) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) => state.activeIntegrations);
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences = {} } = state;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const startWorkPreferences = preferences.startWork || EMPTY_HASH;
		const providerIds = props.providers.map(provider => provider.id).join(":");
		const skipConnect = preferences.skipConnectIssueProviders;

		const csIssues = codemarkSelectors.getMyOpenIssues(state.codemarks, state.session.userId!);
		let status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;

		return { status, currentUser, startWorkPreferences, providerIds, csIssues, skipConnect };
	});

	const [isLoading, setIsLoading] = React.useState(false);
	const [isLoadingCard, setIsLoadingCard] = React.useState("");
	const [loadedBoards, setLoadedBoards] = React.useState(0);
	const [loadedCards, setLoadedCards] = React.useState(0);
	const [addingCustomFilterForProvider, setAddingCustomFilterForProvider] = React.useState<
		ThirdPartyProviderConfig | undefined
	>();
	const [newCustomFilter, setNewCustomFilter] = React.useState("");
	const [newCustomFilterName, setNewCustomFilterName] = React.useState("");
	const [queryOpen, setQueryOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [reload, setReload] = React.useState(1);

	const getFilterLists = (providerId: string) => {
		const prefs = derivedState.startWorkPreferences[providerId] || {};
		const lists = prefs.filterLists ? { ...prefs.filterLists } : EMPTY_HASH;
		return lists;
	};

	const getFilterBoards = (providerId: string) => {
		const prefs = derivedState.startWorkPreferences[providerId] || {};
		const boards = prefs.filterBoards ? { ...prefs.filterBoards } : EMPTY_HASH;
		return boards;
	};

	// the keys are the filter text (e.g. "assignee:@me milestone:jan")
	// and the values are the optional label that the user created
	const getFilterCustom = (providerId: string) => {
		const prefs = derivedState.startWorkPreferences[providerId] || {};
		const custom =
			prefs.filterCustom && prefs.filterCustom.filters
				? { ...prefs.filterCustom }
				: EMPTY_CUSTOM_FILTERS;
		return custom;
	};

	const codemarkState = useSelector((state: CodeStreamState) => state.codemarks);

	useDidMount(() => {
		if (!codemarkState.bootstrapped) {
			// dispatch(bootstrapCodemarks());
		}
	});

	const updateDataState = (providerId, data) => dispatch(updateForProvider(providerId, data));

	const setPreference = (providerId, key, value) => {
		dispatch(setUserPreference(["startWork", providerId, key], value));
	};

	React.useEffect(() => {
		// if (data.boards && data.boards.length > 0) return;

		if (!isLoading) setIsLoading(true);

		let isValid = true;

		const fetchBoards = async () => {
			if (!isValid) return;

			await Promise.all(
				props.providers.map(async provider => {
					const response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
						providerId: provider.id
					});
					updateDataState(provider.id, { boards: response.boards });
				})
			);
			setLoadedBoards(loadedBoards + 1);
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	}, [derivedState.providerIds, reload]);

	React.useEffect(() => {
		void (async () => {
			if (!loadedBoards) return;

			setIsLoading(true);

			await Promise.all(
				props.providers.map(async provider => {
					const filterCustom = getFilterCustom(provider.id);
					try {
						const response = await HostApi.instance.send(FetchThirdPartyCardsRequestType, {
							customFilter: filterCustom.selected,
							providerId: provider.id
						});
						updateDataState(provider.id, {
							cards: response.cards
						});
					} catch (error) {
						console.warn("Error Loading Cards: ", error);
					} finally {
					}
				})
			);

			setIsLoading(false);
			setLoadedCards(loadedCards + 1);
		})();
	}, [loadedBoards]);

	const selectCard = React.useCallback(
		async (card?) => {
			if (card) {
				const { provider } = card;
				if (provider) {
					const providerDisplay = PROVIDER_MAPPINGS[provider.name];
					const pData = data[provider.id] || {};
					// @ts-ignore
					const board = pData.boards && pData.boards.find(b => b.id === card.idBoard);
					// console.warn("SETTINGS VALUES: ", pData, card);
					let { idList } = card;
					let moveCardOptions = board && board.lists;
					if (providerDisplay.hasCardBasedWorkflow) {
						// setIsLoadingCard(card.id);
						// const response = await HostApi.instance.send(FetchThirdPartyCardWorkflowRequestType, {
						// 	providerId: provider.id,
						// 	cardId: card.id
						// });
						// moveCardOptions = response.workflow;

						// setIsLoadingCard("");
						moveCardOptions = card.lists;
					}
					startWorkIssueContext.setValues({
						...card,
						providerIcon: provider.id === "codestream" ? "issue" : providerDisplay.icon,
						providerToken: providerDisplay.icon,
						providerName: providerDisplay.displayName,
						providerId: provider.id,
						moveCardLabel: `Move this ${providerDisplay.cardLabel} to`,
						moveCardOptions,
						idList
					});
				} else {
					// creating a new card/issue
					startWorkIssueContext.setValues({ ...card });
				}
			} else {
				startWorkIssueContext.setValues(undefined);
			}
		},
		[loadedBoards, loadedCards]
	);

	const startWorkIssueContext = React.useContext(StartWorkIssueContext);

	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
	const queryRegexp = React.useMemo(() => new RegExp(escapeRegExp(query), "gi"), [query]);

	const underlineQ = string => (
		<span
			dangerouslySetInnerHTML={{ __html: (string || "").replace(queryRegexp, "<u><b>$&</b></u>") }}
		/>
	);

	const filterMenuItemsSubmenu = provider => {
		const filterLists = getFilterLists(provider.id);
		const filterBoards = getFilterBoards(provider.id);
		const filterCustom = getFilterCustom(provider.id);
		const items = [] as any;
		const pData = data[provider.id] || {};

		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		if (providerDisplay.hasCustomFilters) {
			const activeFilters = keyFilter(filterCustom.filters);
			activeFilters.forEach((filter: any) => {
				const checked = filterCustom.selected === filter;
				items.push({
					checked,
					label: filterCustom.filters[filter],
					subtext: filterCustom.filters[filter] == filter ? null : filter,
					key: "customer-filter-" + filter,
					action: () => {
						setPreference(provider.id, "filterCustom", { selected: filter });
						setLoadedBoards(loadedBoards + 1);
					}
				});
			});
			if (items.length > 0) {
				items.push({ label: "-" });
			}
			items.push({
				icon: <Icon name="plus" />,
				label: "Create Custom Filter...",
				key: "add-custom",
				action: () => {
					setNewCustomFilter(providerDisplay.customFilterDefault || "");
					setNewCustomFilterName("");
					setAddingCustomFilterForProvider(provider);
				}
			});
			if (activeFilters.length > 0) {
				items.push({
					icon: <Icon name="trash" />,
					label: "Delete Custom Filter",
					key: "delete-custom",
					submenu: activeFilters.map((filter: any) => {
						return {
							label: filterCustom.filters[filter],
							key: "delete-customer-filter-" + filter,
							action: () => {
								const selected = filterCustom.selected;
								setPreference(provider.id, "filterCustom", {
									filters: { [filter]: false },
									// reset selected if we're deleting the selected one
									selected: selected === filter ? "" : selected
								});
								if (selected === filter) setLoadedBoards(loadedBoards + 1);
							}
						};
					})
				});
			}
		}

		// @ts-ignore
		if (providerDisplay.hasFilters && pData.boards) {
			if (items.length > 0) {
				items.push({ label: "-" });
			}
			// @ts-ignore
			pData.boards.forEach(board => {
				const b = board;
				let boardChecked = false;
				const lists = board.lists;
				if (lists) {
					const submenu = board.lists.map(list => {
						const l = list;
						const checked = !!filterLists[list.id || "_"];
						if (checked) boardChecked = true;
						return {
							label: list.name,
							key: list.id,
							checked,
							action: () =>
								setPreference(provider.id, "filterLists", {
									...filterLists,
									[l.id || "_"]: !checked
								})
						};
					});
					items.push({
						label: board.name,
						key: "board-" + board.id,
						checked: boardChecked,
						action: () => {},
						submenu
					});
				} else {
					const checked = !!filterBoards[b.id];
					// console.warn("GOT: ", checked, " from ", b, " and ", filterBoards);
					items.push({
						label: board.name,
						key: "board-" + board.id,
						checked,
						action: () =>
							setPreference(provider.id, "filterBoards", {
								...filterBoards,
								[b.id || "_"]: !checked
							})
					});
				}
			});
		}

		return items;
	};

	const filterMenuItemsForProvider = provider => {
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return {
			label: `${providerDisplay.displayName} Filter`,
			icon: <Icon name={providerDisplay.icon} />,
			key: "filters-" + provider.name,
			submenu: filterMenuItemsSubmenu(provider)
		};
	};

	const { cards, canFilter, cardLabel, selectedLabel } = React.useMemo(() => {
		const items = [] as any;
		const lowerQ = (query || "").toLocaleLowerCase();
		const numConnectedProviders = props.providers.length;
		let canFilter = false;
		let cardLabel = "issue";
		let selectedLabel = "issues assigned to you";
		props.providers.forEach(provider => {
			const providerDisplay = PROVIDER_MAPPINGS[provider.name];
			canFilter =
				canFilter || providerDisplay.hasFilters || providerDisplay.hasCustomFilters || false;
			if (providerDisplay.cardLabel) cardLabel = providerDisplay.cardLabel;

			const filterLists = getFilterLists(provider.id);
			const isFilteringLists = providerDisplay.hasFilters && keyFilter(filterLists).length > 0;
			const filterBoards = getFilterBoards(provider.id);
			const isFilteringBoards = providerDisplay.hasFilters && keyFilter(filterBoards).length > 0;
			const filterCustom = getFilterCustom(provider.id);
			const isFilteringCustom = providerDisplay.hasCustomFilters && filterCustom.selected;

			if (isFilteringCustom) {
				// if we have more than one connected provider, we don't want
				// the label to be misleading in terms of what you're filtering on
				if (numConnectedProviders > 1) selectedLabel = cardLabel + "s";
				else
					selectedLabel = `${cardLabel}s matching ${filterCustom.filters[filterCustom.selected]}`;
			} else {
				selectedLabel = `${cardLabel}s assigned to you`;
			}

			const pData = data[provider.id] || {};
			// @ts-ignore
			const cards = pData.cards || [];

			// console.warn("COMPARING: ", cards, " TO ", filterLists);
			items.push(
				...(cards
					// @ts-ignore
					.filter(card => !isFilteringLists || filterLists[card.idList || "_"])
					.filter(card => !isFilteringBoards || filterBoards[card.idBoard || "_"])
					.filter(
						card =>
							!query ||
							(card.title || "").toLocaleLowerCase().includes(lowerQ) ||
							(card.body || "").toLocaleLowerCase().includes(lowerQ)
					)
					.map(card => ({
						...card,
						label: query ? underlineQ(card.title) : card.title,
						body: query ? underlineQ(card.body) : card.body,
						icon: providerDisplay.icon && <Icon name={providerDisplay.icon} />,
						key: "card-" + card.id,
						modifiedAt: card.modifiedAt,
						provider
					})) as any)
			);
		});

		items.push(
			...(derivedState.csIssues
				.filter(
					issue =>
						!query ||
						(issue.title || "").toLocaleLowerCase().includes(lowerQ) ||
						(issue.text || "").toLocaleLowerCase().includes(lowerQ)
				)
				.map(issue => ({
					...issue,
					label: query ? underlineQ(issue.title) : issue.title,
					body: query ? underlineQ(issue.text) : issue.text,
					key: "card-" + issue.id,
					icon: <Icon name="issue" />,
					provider: { id: "codestream", name: "codestream" }
				})) as any)
		);

		items.sort((a, b) => b.modifiedAt - a.modifiedAt);

		return { cards: items, canFilter, cardLabel, selectedLabel };
	}, [loadedCards, derivedState.startWorkPreferences, derivedState.csIssues, props.selectedCardId]);

	const menuItems = React.useMemo(() => {
		// if (props.provider.canFilterByAssignees) {
		// 	items.unshift({
		// 		label: "Filter by Assignee",
		// 		icon: <Icon name="filter" />,
		// 		key: "assignment",
		// 		submenu: [
		// 			{
		// 				label: `${derivedState.providerDisplay.cardLabel} Assigned to Me`,
		// 				key: "mine",
		// 				checked: derivedState.filterAssignees === "mine",
		// 				action: () => setPreference("filterAssignees", "mine")
		// 			},
		// 			{
		// 				label: `Unassigned ${derivedState.providerDisplay.cardLabel}`,
		// 				key: "unassigned",
		// 				checked: derivedState.filterAssignees === "unassigned",
		// 				action: () => setPreference("filterAssignees", "unassigned")
		// 			},
		// 			{
		// 				label: `All ${derivedState.providerDisplay.cardLabel}`,
		// 				key: "all",
		// 				checked: derivedState.filterAssignees === "all",
		// 				action: () => setPreference("filterAssignees", "all")
		// 			}
		// 		]
		// 	});
		// }
		// const submenu = [] as any;
		// props.providers.forEach(provider => {
		// 	submenu.push(filterMenuItemsForProvider(provider));
		// });
		// submenu.push(
		// 	{ label: "-" },
		// 	{
		// 		label: "Connect another Service",
		// 		key: "connect",
		// 		submenu: props.knownIssueProviderOptions
		// 	}
		// );

		const items = { filters: [], services: [] } as any;
		props.providers.forEach(provider => {
			const providerDisplay = PROVIDER_MAPPINGS[provider.name];
			if (providerDisplay.hasFilters || providerDisplay.hasCustomFilters)
				items.filters.unshift(filterMenuItemsForProvider(provider));
		});
		if (items.filters.length === 1) items.filters = items.filters[0].submenu;

		items.services = props.knownIssueProviderOptions;

		return items;
	}, [loadedCards, derivedState.startWorkPreferences]);

	const saveCustomFilter = () => {
		const id = addingCustomFilterForProvider ? addingCustomFilterForProvider.id : "";
		setPreference(id, "filterCustom", {
			filters: {
				[newCustomFilter]: newCustomFilterName || newCustomFilter
			},
			selected: newCustomFilter
		});
		setLoadedBoards(loadedBoards + 1);
		setAddingCustomFilterForProvider(undefined);
	};

	const firstLoad = cards.length == 0 && isLoading;
	const providersLabel =
		props.providers.length === 0 ? (
			"CodeStream"
		) : (
			<SmartFormattedList
				value={props.providers.map(provider => PROVIDER_MAPPINGS[provider.name].displayName)}
			/>
		);

	if (addingCustomFilterForProvider) {
		const providerDisplay = PROVIDER_MAPPINGS[addingCustomFilterForProvider.name];
		return (
			<Modal verticallyCenter onClose={() => setAddingCustomFilterForProvider(undefined)}>
				<div className="onboarding-page">
					<form className="standard-form" onSubmit={saveCustomFilter}>
						<fieldset className="form-body">
							<h1>Custom Filter</h1>
							<input
								type="text"
								className="input-text control"
								autoFocus
								value={newCustomFilter}
								onChange={e => setNewCustomFilter(e.target.value)}
								placeholder="Enter Custom Filter"
								style={{ marginBottom: "5px" }}
							/>
							<div style={{ margin: "10px 0" }} className="subtle">
								{providerDisplay.customFilterExample}
							</div>
							<span dangerouslySetInnerHTML={{ __html: providerDisplay.customFilterHelp || "" }} />
							<input
								type="text"
								className="input-text control"
								value={newCustomFilterName}
								onChange={e => setNewCustomFilterName(e.target.value)}
								placeholder="Name Your Custom Filter (optional)"
								style={{ margin: "20px 0 5px 0" }}
							/>
							<div style={{ textAlign: "center", paddingTop: "30px" }}>
								<Button onClick={saveCustomFilter}>
									&nbsp;&nbsp;&nbsp;&nbsp;Save&nbsp;&nbsp;&nbsp;&nbsp;
								</Button>
							</div>
						</fieldset>
					</form>
				</div>
			</Modal>
		);
	}
	return (
		<>
			<WideStatusSection id="start-work-div">
				<div className="instructions">
					<Icon name="light-bulb" />
					CodeStream Flow starts with grabbing a ticket and creating a branch.
				</div>
				<div className="filters" style={{ padding: "0 20px 0 20px" }}>
					<H4>
						<Tooltip title="Create a ticket" placement="bottom" delay={1}>
							<RoundedLink onClick={() => dispatch(openPanel(WebviewPanels.NewIssue))}>
								<Icon name="plus" />
								<span className="wide-text">New </span>
								{cardLabel}
							</RoundedLink>
						</Tooltip>
						<Tooltip title="For untracked work" placement="bottom" delay={1}>
							<RoundedLink onClick={() => selectCard({ title: "" })}>
								<Icon name="plus" />
								Ad-hoc<span className="wide-text"> Work</span>
							</RoundedLink>
						</Tooltip>
						<RoundedSearchLink className={queryOpen ? "" : "collapsed"}>
							<Icon
								name="search"
								onClick={() => {
									setQueryOpen(true);
									document.getElementById("search-input")!.focus();
								}}
							/>
							<span className="accordion">
								<Icon
									name="x"
									onClick={() => {
										setQuery("");
										setQueryOpen(false);
									}}
								/>
								<input
									autoFocus
									id="search-input"
									type="text"
									value={query}
									onChange={e => setQuery(e.target.value)}
									onKeyDown={e => {
										if (e.key == "Escape") {
											setQuery("");
											setQueryOpen(false);
										}
									}}
								/>
							</span>
						</RoundedSearchLink>
						What are you working on?
					</H4>
					{props.loadingMessage ? (
						<div style={{ margin: "0 -20px" }}>{props.loadingMessage}</div>
					) : props.providers.length > 0 || derivedState.skipConnect ? (
						<div style={{ paddingBottom: "5px" }}>
							Show{" "}
							{canFilter ? (
								<Tooltip
									defaultVisible
									trigger={["click"]}
									title={
										cards.length > 50 ? (
											<div>
												Too many items?
												<br />
												Filter them here
											</div>
										) : (
											undefined
										)
									}
									placement="bottom"
								>
									<Filter
										title="Filter Items"
										selected={"selectedLabel"}
										labels={{ selectedLabel }}
										items={[{ label: "-" }, ...menuItems.filters]}
										align="bottomLeft"
										dontCloseOnSelect
									/>
								</Tooltip>
							) : (
								selectedLabel + " "
							)}
							from{" "}
							<Filter
								title="Select Providers"
								selected={"providersLabel"}
								labels={{ providersLabel }}
								items={[{ label: "-" }, ...menuItems.services]}
								align="bottomLeft"
								dontCloseOnSelect
							/>
							{!firstLoad && (
								<Icon
									onClick={() => setReload(reload + 1)}
									className={`smaller fixed clickable ${isLoading ? "spin" : "spinnable"}`}
									name="sync"
								/>
							)}
						</div>
					) : (
						<>
							<span>
								Connect your issue provider(s), or{" "}
								<Tooltip title="Connect later on the Integrations page" placement="top">
									<Linkish
										onClick={() => dispatch(setUserPreference(["skipConnectIssueProviders"], true))}
									>
										skip this step
									</Linkish>
								</Tooltip>
							</span>
							<div style={{ height: "10px" }} />
							<IntegrationButtons style={{ marginBottom: "10px" }}>
								{props.knownIssueProviderOptions.map(item => {
									if (item.disabled) return null;
									return (
										<Provider key={item.key} onClick={item.action}>
											{item.providerIcon}
											{item.label}
										</Provider>
									);
								})}
							</IntegrationButtons>
						</>
					)}
				</div>
				{firstLoad && <LoadingMessage align="left">Loading...</LoadingMessage>}
				{cards.map(card => (
					<Tooltip
						key={"tt-" + card.key}
						title="Click to start work on this item"
						delay={1}
						placement="bottom"
					>
						<Row
							key={card.key}
							onClick={() => selectCard(card)}
							className={card.id === props.selectedCardId ? "selected" : ""}
						>
							<div>
								{card.id === isLoadingCard ? (
									<Icon name="sync" className="spin" />
								) : card.id === props.selectedCardId ? (
									<Icon name="arrow-right" />
								) : (
									card.icon
								)}
							</div>
							<div>
								{card.label}
								<span className="subtle">{card.body}</span>
							</div>
							<div className="icons">
								{card.listName && <span className="status">{card.listName}</span>}
								{card.id === props.selectedCardId && (
									<Icon
										name="x-circle"
										className="clickable"
										onClick={e => {
											e.stopPropagation();
											e.preventDefault();
											selectCard();
										}}
									/>
								)}
								{card.url && (
									<Icon
										title={`Open on web`}
										delay={1}
										placement="bottomRight"
										name="globe"
										className="clickable"
										onClick={e => {
											e.stopPropagation();
											e.preventDefault();
											HostApi.instance.send(OpenUrlRequestType, {
												url: card.url
											});
										}}
									/>
								)}
								{card.provider.id === "codestream" && (
									<Icon
										title={`View Issue Details`}
										delay={1}
										placement="bottomRight"
										name="description"
										className="clickable"
										onClick={e => {
											e.stopPropagation();
											e.preventDefault();
											dispatch(setCurrentCodemark(card.id));
										}}
									/>
								)}
							</div>
						</Row>
					</Tooltip>
				))}
			</WideStatusSection>
		</>
	);
}

export const Row = styled.div`
	display: flex;
	&:not(.no-hover) {
		cursor: pointer;
	}
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
	padding: 0 15px 0 20px;
	&.selected {
		color: var(--text-color-highlight);
	}
	&.wide {
		padding: 0;
	}
	&.disabled {
		opacity: 0.5;
	}
	> div {
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 3px 5px 3px 0;
		&:nth-child(1) {
			flex-shrink: 0;
			.icon {
				margin: 0;
			}
		}
		&:nth-child(2) {
			flex-grow: 10;
		}
		&:nth-child(3) {
			flex-shrink: 0;
		}
	}
	.icons {
		margin-left: auto;
		text-align: right;
		.icon {
			// margin-left: 5px;
			display: none;
		}
		padding-left: 2.5px;
	}
	&:hover .icons .icon {
		display: inline-block;
	}
	&:hover > div:nth-child(3) {
		min-width: 30px;
	}
	&:hover time {
		display: none;
	}
	.status {
		color: var(--text-color-subtle);
		opacity: 0.75;
		padding-left: 10px;
	}
	&:hover .status {
		display: none;
	}
	&:not(.disabled):not(.no-hover):hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
	span.subtle {
		display: inline-block;
		padding-left: 15px;
		color: var(--text-color-subtle);
		opacity: 0.75;
	}
	${Headshot} {
		top: 1px;
	}
	// matches for search query
	span > u > b {
		color: var(--text-color-highlight);
	}
`;

export const IssueRows = styled.div`
	border-top: 1px solid var(--base-border-color);
	padding-top: 15px;
	padding-bottom: 20px;
`;

const Linkish = styled.span`
	text-decoration: underline;
	cursor: pointer;
	:hover {
		color: var(--text-color-highlight);
	}
`;
