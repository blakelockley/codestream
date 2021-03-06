import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { HostApi } from "../webview-api";
import Icon from "./Icon";
import { Checkbox } from "../src/components/Checkbox";
import styled from "styled-components";
import { Button } from "../src/components/Button";
import { setUserStatus, setUserPreference, connectProvider } from "./actions";
import { openPanel, setNewPostEntry, setCurrentCodemark } from "../store/context/actions";
import { CSMe } from "@codestream/protocols/api";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { useDidMount } from "../utilities/hooks";
import {
	GetBranchesRequestType,
	CreateBranchRequestType,
	SwitchBranchRequestType,
	MoveThirdPartyCardRequestType,
	GetReposScmRequestType,
	ReposScm,
	UpdateThirdPartyStatusRequestType
} from "@codestream/protocols/agent";
import IssueDropdown, { Row } from "./CrossPostIssueControls/IssueDropdown";
import { ConfigureBranchNames } from "./ConfigureBranchNames";
import { MarkdownText } from "./MarkdownText";
import {
	getProviderConfig,
	isConnected,
	getConnectedSharingTargets
} from "../store/providers/reducer";
import { SharingAttributes } from "./SharingControls";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { PanelHeader } from "../src/components/PanelHeader";
import ScrollBox from "./ScrollBox";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { ModifiedRepos } from "./ModifiedRepos";
import Tooltip from "./Tooltip";
import { OpenReviews } from "./OpenReviews";
import { Modal } from "./Modal";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

const StyledCheckbox = styled(Checkbox)`
	color: var(--text-color-subtle);
`;

const StatusInput = styled.div`
	position: relative;
	margin: 7px 0 20px 0;
	width: 100%;
	.clear {
		position: absolute;
		right: 2px;
		top: 1px;
		padding: 8px 10px;
	}
	input#status-input {
		border: 1px solid var(--base-border-color);
		font-size: 14px !important;
		// padding: 8px 40px 8px 42px !important;
		padding: 8px 40px 8px 10px !important;
		width: 100%;
		&::placeholder {
			font-size: 14px !important;
		}
	}
`;

const CardTitle = styled.span`
	font-size: 16px;
	position: relative;
	padding-left: 28px;
	line-height: 20px;
	display: inline-block;
	.icon {
		margin-left: -28px;
		display: inline-block;
		transform: scale(1.25);
		padding: 0 8px 0 3px;
		vertical-align: -2px;
	}
	& + & {
		margin-left: 20px;
	}
	a {
		display: block;
		font-size: 13px;
		margin-top: 10px;
	}
`;

const ButtonRow = styled.div`
	text-align: right;
	margin-top: 10px;
	button {
		margin: 10px 0 0 10px;
		// white-space: nowrap;
		// width: 16em;
	}
`;

const MonoMenu = styled(InlineMenu)`
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: normal;
`;

const SCMError = styled.div`
	margin: 20px 0 0 0;
	font-size: smaller;
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	white-space: pre-wrap;
	color: var(--font-color-highlight);
`;

const CardDescription = styled.div`
	// padding: 10px;
	// border: 1px solid var(--base-border-color);
	margin: -5px 0 20px 28px;
	// background: var(--app-background-color);
`;

const CardLink = styled.div`
	text-align: right;
	font-size: smaller;
	margin: -18px 0 15px 0;
`;

const Docs = styled.div`
	cursor: pointer;
	border-top: 1px solid var(--base-border-color);
	padding: 15px 20px;
	span:hover {
		color: var(--text-color-highlight);
	}
	.icon {
		display: inline-block;
		margin-right: 5px;
		transition: transform 0.1s;
	}
	.icon.rotate {
		transform: rotate(90deg);
	}
	.getting-started {
		float: right;
	}
`;

export const StatusSection = styled.div`
	padding: 15px 20px 15px 20px;
	.icon {
		margin-right: 5px;
		&.ticket,
		&.link-external {
			margin-right: 0;
		}
	}
	border-top: 1px solid var(--base-border-color);
	.instructions {
		display: none;
		padding: 0 20px 20px 20px;
		text-align: center;
	}
	&.show-instructions .instructions {
		display: block;
	}
`;

// @ts-ignore
export const WideStatusSection = styled(StatusSection)`
	padding-left: 0;
	padding-right: 0;
`;

export const H4 = styled.h4`
	color: var(--text-color-highlight);
	font-weight: 400;
	font-size: 16px;
	margin: 0 0 5px 0;
	&.padded {
		padding: 0 20px;
	}
	.toggle {
		opacity: 0;
		margin: 0 5px 0 -13px;
		vertical-align: -1px;
		transition: opacity 0.1s;
	}
	&:hover .toggle {
		opacity: 1;
	}
`;

export const RoundedLink = styled.a`
	float: right;
	text-decoration: none !important;
	text-transform: capitalize;
	.narrow-icon {
		margin-right: 5px;
	}
	.octicon-minus-circle,
	.octicon-arrow-right {
		margin-top: -1px;
	}
	background: transparent;
	color: var(--text-color);
	&:hover {
		color: var(--text-color-highlight);
		background: rgba(127, 127, 127, 0.3);
	}
	background: rgba(127, 127, 127, 0.15);
	border: 1px solid var(--base-border-color);
	padding: 3px 8px 3px 4px;
	margin: 0 0 2px 5px;
	font-size: 12px;
	border-radius: 13px;
	.icon {
		margin-right: 2px;
	}
	@media only screen and (max-width: 450px) {
		.wide-text {
			display: none;
		}
	}
`;

export const RoundedSearchLink = styled(RoundedLink)`
	padding: 3px 3px 3px 3px;
	&.collapsed {
		padding: 3px 4px 3px 4px;
	}
	.icon {
		margin-right: 0;
	}
	display: flex;
	.accordion {
		display: inline-block;
		width: 130px;
		transition: width 0.1s;
		overflow: hidden;
		white-space: nowrap;
		height: 16px;
		line-height: 16px;
		margin: 0;
		#search-input {
			width: 90px;
			background: transparent !important;
			font-size: 13px !important;
			padding: 0 5px !important;
			margin: 0 0 !important;
			&:focus {
				outline: none;
			}
		}
		.icon {
			float: right;
			vertical-align: -1px;
			margin-right: 4px;
		}
	}
	&.collapsed .accordion {
		width: 0;
	}
`;

const RepoInfo = styled.div`
	padding: 0 0 10px 0px;
`;

const IconLabel = styled.span`
	white-space: nowrap;
	padding-right: 10px;
	.icon {
		margin-right: 5px;
	}
`;

const HR = styled.div`
	border-top: 1px solid var(--base-border-color);
	margin: 0 0 20px 0;
`;

export interface IStartWorkIssueContext {
	setValues(values: any): void;
	card?: any;
}

export const StartWorkIssueContext = React.createContext<IStartWorkIssueContext>({
	card: undefined,
	setValues: () => {}
});

export const EMPTY_STATUS = {
	label: "",
	ticketId: "",
	ticketUrl: "",
	ticketProvider: "",
	invisible: false
};

export const StatusPanel = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		let status =
			currentUser.status && "label" in currentUser.status ? currentUser.status : EMPTY_STATUS;
		// const now = new Date().getTime();
		// if (status.expires && status.expires < now) status = EMPTY_STATUS;
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		const settings = team.settings || {};
		const { preferences = {} } = state;
		const workPrefs = preferences["startWork"] || {};

		const currentTeamId = state.context.currentTeamId;
		const preferencesForTeam = state.preferences[currentTeamId] || {};

		// this is what we've persisted in the server as the last selection the user made
		const lastShareAttributes: SharingAttributes | undefined =
			preferencesForTeam.lastShareAttributes;

		const shareTargets = getConnectedSharingTargets(state);
		const selectedShareTarget = shareTargets.find(
			target =>
				target.teamId ===
				(state.context.shareTargetTeamId ||
					(lastShareAttributes && lastShareAttributes.providerTeamId))
		);

		const isConnectedToSlack = isConnected(state, { name: "slack" }, "users.profile:write");
		const updateSlack = Object.keys(workPrefs).includes("updateSlack")
			? workPrefs.updateSlack
			: true;

		const adminIds = team.adminIds || [];
		return {
			status,
			repos: state.repos,
			invisible: status.invisible || false,
			teamName: team.name,
			currentUserId: state.session.userId!,
			currentUserName: state.users[state.session.userId!].username,
			webviewFocused: state.context.hasFocus,
			textEditorUri: state.editorContext.textEditorUri,
			branchMaxLength: settings.branchMaxLength || 40,
			branchTicketTemplate: settings.branchTicketTemplate || "feature/ticket-{id}-{title}",
			branchDescriptionTemplate: settings.branchDescriptionTemplate || "feature/{title}",
			createBranch: Object.keys(workPrefs).includes("createBranch") ? workPrefs.createBranch : true,
			moveCard: Object.keys(workPrefs).includes("moveCard") ? workPrefs.moveCard : true,
			updateSlack: isConnectedToSlack ? updateSlack : false,
			slackConfig: getProviderConfig(state, "slack"),
			// msTeamsConfig: getProviderConfig(state, "msteams"),
			isConnectedToSlack,
			selectedShareTarget: selectedShareTarget || shareTargets[0],
			isCurrentUserAdmin: adminIds.includes(state.session.userId!),
			shareToSlackSupported: isFeatureEnabled(state, "shareStatusToSlack")
		};
	});

	const { status } = derivedState;
	const [loading, setLoading] = useState(false);
	const [scmError, setScmError] = useState("");
	const [label, setLabel] = useState(status.label || "");
	const [card, setCard] = useState<any>();
	const [loadingSlack, setLoadingSlack] = useState(false);
	const [manuallySelectedBranch, setManuallySelectedBranch] = useState("");
	const [currentBranch, setCurrentBranch] = useState("");
	const [editingBranch, setEditingBranch] = useState(false);
	const [branches, setBranches] = useState([] as string[]);
	const [customBranchName, setCustomBranchName] = useState("");
	const [configureBranchNames, setConfigureBranchNames] = useState(false);
	const [openRepos, setOpenRepos] = useState<ReposScm[]>([]);
	const [repoUri, setRepoUri] = useState("");
	const [currentRepoId, setCurrentRepoId] = useState("");
	const [currentRepoName, setCurrentRepoName] = useState("");
	const [fromBranch, setFromBranch] = useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const { moveCard, updateSlack, createBranch } = derivedState;

	const setUpdateSlack = value => {
		if (!derivedState.isConnectedToSlack) {
			setLoadingSlack(true);
			dispatch(connectProvider(derivedState.slackConfig!.id, "Status"));
		} else {
			dispatch(setUserPreference(["startWork", "updateSlack"], value));
		}
	};

	const setMoveCard = value => dispatch(setUserPreference(["startWork", "moveCard"], value));
	const setCreateBranch = value =>
		dispatch(setUserPreference(["startWork", "createBranch"], value));

	const handleChangeStatus = value => {
		setLabel(value || "");
	};

	const selectCard = card => {
		// make sure we've got the most up-to-date set of branches
		getBranches();

		if (card) {
			setLabel(card.title || "");
			setCard(card);

			if (card.moveCardOptions && card.moveCardOptions.length) {
				const index = card.moveCardOptions.findIndex(option =>
					option.to ? option.to.id === card.idList : option.id === card.idList
				);
				const next = card.moveCardOptions[index + 1];
				if (next) setMoveCardDestination(next);
				else setMoveCardDestination(card.moveCardOptions[0]);
			} else {
			}
		} else {
			clearAndSave();
		}
		setLoadingSlack(false);
	};

	const dateToken = () => {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const date = now.getDate();
		return `${year}-${month > 9 ? month : "0" + month}-${date > 9 ? date : "0" + date}`;
	};

	// const replaceDescriptionTokens = (template: string, title: string = "") => {
	// 	return template
	// 		.replace(/\{id\}/g, "")
	// 		.replace(/\{username\}/g, derivedState.currentUserName)
	// 		.replace(/\{team\}/g, derivedState.teamName)
	// 		.replace(/\{date\}/g, dateToken())
	// 		.replace(/\{title\}/g, title.toLowerCase())
	// 		.replace(/[\s]+/g, "-")
	// 		.substr(0, derivedState.branchMaxLength);
	// };

	const replaceTicketTokens = (template: string, card, title: string = "") => {
		let tokenId = "";
		let providerToken = "";
		if (card && card.tokenId) {
			tokenId = card.tokenId;
			title = card.title;
			providerToken = card.providerToken;
		}
		return template
			.replace(/\{id\}/g, tokenId)
			.replace(/\{username\}/g, derivedState.currentUserName)
			.replace(/\{team\}/g, derivedState.teamName)
			.replace(/\{date\}/g, dateToken())
			.replace(/\{title\}/g, title.toLowerCase())
			.replace(/\{provider\}/g, providerToken)
			.replace(/[\s]+/g, "-")
			.substr(0, derivedState.branchMaxLength);
	};

	const getBranches = async (uri?: string) => {
		if (!uri && !derivedState.textEditorUri) return;
		if (uri) setRepoUri(uri);
		const branchInfo = await HostApi.instance.send(GetBranchesRequestType, {
			// stupid TS
			uri: uri || derivedState.textEditorUri || ""
		});
		if (!branchInfo.scm) return;

		setBranches(branchInfo.scm.branches);
		setCurrentBranch(branchInfo.scm.current);
		setCurrentRepoId(branchInfo.scm.repoId);
		const repoId = branchInfo.scm.repoId;
		const repoName = derivedState.repos[repoId] ? derivedState.repos[repoId].name : "repo";
		setCurrentRepoName(repoName);

		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true
		});
		if (response && response.repositories) {
			setOpenRepos(response.repositories);
		}
	};

	useDidMount(() => {
		getBranches();
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Status Tab" });
	});

	const showMoveCardCheckbox = React.useMemo(() => {
		return card && card.moveCardOptions && card.moveCardOptions.length > 0;
	}, [card, label]);
	const showCreateBranchCheckbox = React.useMemo(() => {
		return label && branches && branches.length > 0;
	}, [label, branches]);
	const showSelectRepo = React.useMemo(() => {
		return !(branches && branches.length > 0);
	}, [branches]);
	const showUpdateSlackCheckbox = React.useMemo(() => {
		return label && derivedState.shareToSlackSupported;
	}, [label, derivedState.shareToSlackSupported]);

	const newBranch = React.useMemo(() => {
		if (customBranchName) return customBranchName;
		return replaceTicketTokens(derivedState.branchTicketTemplate, card, label);
		// else return replaceDescriptionTokens(derivedState.branchDescriptionTemplate, label);
	}, [
		label,
		card,
		customBranchName,
		derivedState.branchTicketTemplate,
		derivedState.branchDescriptionTemplate
	]);

	const branch = React.useMemo(() => {
		if (manuallySelectedBranch) return manuallySelectedBranch;
		if (customBranchName) return customBranchName;
		return replaceTicketTokens(derivedState.branchTicketTemplate, card, label);
		// else return replaceDescriptionTokens(derivedState.branchDescriptionTemplate, label);
	}, [
		label,
		card,
		manuallySelectedBranch,
		customBranchName,
		derivedState.branchTicketTemplate,
		derivedState.branchDescriptionTemplate
	]);

	const save = async () => {
		setLoading(true);

		const { slackConfig } = derivedState;
		const createTheBranchNow =
			showCreateBranchCheckbox &&
			createBranch &&
			branch.length > 0 &&
			(repoUri || derivedState.textEditorUri);
		const moveTheCardNow = showMoveCardCheckbox && moveCard && card && moveCardDestinationId;
		const updateSlackNow = slackConfig && showUpdateSlackCheckbox && updateSlack;
		try {
			if (createTheBranchNow) {
				const uri = repoUri || derivedState.textEditorUri || "";
				const request = branches.includes(branch)
					? SwitchBranchRequestType
					: CreateBranchRequestType;
				const result = await HostApi.instance.send(request, { branch, uri, fromBranch });
				// FIXME handle error
				if (result.error) {
					console.warn("ERROR FROM SET BRANCH: ", result.error);
					setScmError(result.error);
					setLoading(false);
					return;
				}
			}

			if (moveTheCardNow) {
				const response = await HostApi.instance.send(MoveThirdPartyCardRequestType, {
					providerId: card.providerId,
					cardId: card.id,
					listId: moveCardDestinationId
				});
			}

			if (slackConfig && updateSlackNow) {
				const response = await HostApi.instance.send(UpdateThirdPartyStatusRequestType, {
					providerId: slackConfig.id,
					providerTeamId: derivedState.selectedShareTarget.teamId,
					text: "Working on: " + label,
					icon: ":desktop_computer:"
				});
			}
		} catch (e) {
			console.warn("ERROR: " + e);
		} finally {
			HostApi.instance.track("Work Started", {
				"Branch Created": createTheBranchNow,
				"Ticket Selected": card ? card.providerIcon : "",
				"Ticket Moved": moveTheCardNow,
				"Status Set": updateSlackNow
			});
		}

		const ticketId = card ? card.id : "";
		const ticketUrl = card ? card.url : "";
		const ticketProvider = card ? card.providerIcon : "";
		await dispatch(
			setUserStatus(label, ticketId, ticketUrl, ticketProvider, derivedState.invisible)
		);
		clear();
		setLoading(false);
	};

	const clear = () => {
		setLabel("");
		setCard(undefined);
		setScmError("");
		setLoadingSlack(false);
	};

	const clearAndSave = () => {
		setLoadingSlack(false);
		dispatch(setUserStatus("", "", "", "", derivedState.invisible));
		// FIXME clear out slack status
	};

	const saveLabel =
		!branch || branch == currentBranch || !createBranch
			? "Start Work"
			: branches.includes(branch)
			? "Switch Branch & Start Work"
			: "Create Branch & Start Work";

	const useBranchLabel =
		branch == currentBranch
			? "Use branch"
			: branches.includes(branch)
			? "Switch to branch"
			: "Create branch";

	const makeMenuItem = (branch: string, isNew?: boolean) => {
		const iconName = branch == currentBranch ? "arrow-right" : "blank";
		return {
			label: (
				<span>
					{branch == currentBranch ? "Use " : "Switch to "}
					<span className="monospace highlight">
						<b>{branch}</b>
					</span>
					{branch == currentBranch && <> (current)</>}
				</span>
			),
			key: branch,
			icon: <Icon name={iconName} />,
			action: () => setManuallySelectedBranch(branch)
		};
	};

	const makeFromMenuItem = (branch: string) => {
		const iconName = branch == currentBranch ? "arrow-right" : "blank";
		return {
			label: <span className="monospace">{branch}</span>,
			key: branch,
			icon: <Icon name={iconName} />,
			action: () => setFromBranch(branch)
		};
	};

	const branchMenuItems = branches.map(branch => makeMenuItem(branch, false)) as any;
	if (newBranch) {
		branchMenuItems.unshift(
			{
				label: "Edit Branch Name",
				key: "edit",
				icon: <Icon name="pencil" />,
				action: () => setEditingBranch(true)
			},
			{
				label: "Configure Branch Naming",
				key: "configure",
				icon: <Icon name="gear" />,
				action: () => setConfigureBranchNames(true),
				disabled: !derivedState.isCurrentUserAdmin,
				subtext: derivedState.isCurrentUserAdmin || "Disabled: admin only"
			},
			{ label: "-" },
			{
				label: (
					<span>
						Branch off of{" "}
						<span className="monospace highlight">
							<b>{currentBranch}</b>
						</span>
					</span>
				),
				key: "create",
				icon: <Icon name="git-branch" />,
				action: () => setManuallySelectedBranch(newBranch),
				submenu: [...branches.map(branch => makeFromMenuItem(branch))]
			}
		);
	}

	if (openRepos && openRepos.length > 1) {
		branchMenuItems.unshift(
			{
				label: "Repository",
				key: "repo",
				icon: <Icon name="repo" />,
				submenu: openRepos.map(repo => {
					const repoId = repo.id || "";
					return {
						icon: <Icon name={repo.id === currentRepoId ? "arrow-right" : "blank"} />,
						label: derivedState.repos[repoId] ? derivedState.repos[repoId].name : repo.folder.name,
						key: repo.id,
						action: () => getBranches(repo.folder.uri)
					};
				})
			},
			{ label: "-" }
		);
	}

	const setMoveCardDestination = option => {
		setMoveCardDestinationId(option.id);
		setMoveCardDestinationLabel(option.name);
	};

	const [moveCardDestinationId, setMoveCardDestinationId] = React.useState("");
	const [moveCardDestinationLabel, setMoveCardDestinationLabel] = React.useState("");

	const moveCardItems =
		!card || !card.moveCardOptions
			? []
			: card.moveCardOptions.map(option => {
					const selected = option.to ? option.to.id === card.idList : option.id === card.idList;
					return {
						label: option.name,
						icon: <Icon name={selected ? "arrow-right" : "blank"} />,
						key: option.id,
						action: () => setMoveCardDestination(option)
					};
			  });

	return (
		<div className="panel full-height">
			<CreateCodemarkIcons narrow />
			<PanelHeader title="Tasks">
				<div style={{ height: "5px" }} />
			</PanelHeader>
			{configureBranchNames && (
				<Modal onClose={() => setConfigureBranchNames(false)}>
					<ConfigureBranchNames onClose={() => setConfigureBranchNames(false)} />
				</Modal>
			)}
			{card && !configureBranchNames && (
				<Modal onClose={clear}>
					<Dialog className="codemark-form-container">
						<form className="codemark-form standard-form vscroll">
							<fieldset className="form-body" style={{ padding: "0px" }}>
								<div id="controls">
									<StatusInput>
										{card.id ? (
											<CardTitle>
												{card.providerIcon && (
													<Icon className="ticket-icon" name={card.providerIcon} />
												)}
												{card.label}
												{card.url && (
													<a
														onClick={() =>
															HostApi.instance.send(OpenUrlRequestType, {
																url: card.url
															})
														}
													>
														{card.url}
													</a>
												)}
												{card.providerId === "codestream" && (
													<a
														onClick={e => {
															e.stopPropagation();
															e.preventDefault();
															clear();
															dispatch(setCurrentCodemark(card.id));
														}}
													>
														Show Issue Details
													</a>
												)}
											</CardTitle>
										) : (
											<>
												<H4>What are you working on?</H4>
												<div style={{ height: "10px" }} />
												<input
													id="status-input"
													ref={inputRef}
													name="status"
													value={label}
													className="input-text control"
													autoFocus={true}
													type="text"
													onChange={e => handleChangeStatus(e.target.value)}
													placeholder="Enter Description"
												/>
											</>
										)}
									</StatusInput>
									{card && card.body && (
										<CardDescription>
											<MarkdownText text={card.body.replace(/\[Open in IDE\].*/, "")} />
										</CardDescription>
									)}
									{card && card.title && <HR />}
									{showSelectRepo ? (
										<RepoInfo>
											{openRepos && openRepos.length ? (
												<IconLabel>
													<Icon name="repo" />
													<InlineMenu
														items={openRepos.map(repo => {
															const repoId = repo.id || "";
															return {
																label: derivedState.repos[repoId]
																	? derivedState.repos[repoId].name
																	: repo.folder.name,
																key: repo.id,
																action: () => getBranches(repo.folder.uri)
															};
														})}
													>
														Select a repository to create branch
													</InlineMenu>
												</IconLabel>
											) : (
												<IconLabel>
													<Icon name="alert" />
													Please open a file from a repository to create a branch
												</IconLabel>
											)}
										</RepoInfo>
									) : (
										<RepoInfo>
											<CardTitle>
												<Icon name="repo" />
												{currentRepoName}
											</CardTitle>
											<CardTitle>
												<Icon name="git-branch" />
												{currentBranch}
											</CardTitle>
										</RepoInfo>
									)}
									{showCreateBranchCheckbox && (
										<StyledCheckbox
											name="create-branch"
											checked={createBranch}
											onChange={v => setCreateBranch(v)}
										>
											{useBranchLabel}{" "}
											{editingBranch ? (
												<input
													id="branch-input"
													name="branch"
													value={customBranchName || branch}
													className="input-text control"
													autoFocus={true}
													type="text"
													onChange={e => setCustomBranchName(e.target.value)}
													placeholder="Enter branch name"
													onBlur={() => setEditingBranch(false)}
													onKeyPress={e => {
														if (e.key == "Enter") setEditingBranch(false);
													}}
													style={{ width: "200px" }}
												/>
											) : (
												<>
													<MonoMenu items={branchMenuItems}>{branch}</MonoMenu>
													{fromBranch && fromBranch !== currentBranch && (
														<div>
															from <span className="highlight monospace">{fromBranch}</span>
														</div>
													)}
												</>
											)}
										</StyledCheckbox>
									)}
									{showMoveCardCheckbox && (
										<StyledCheckbox
											name="move-issue"
											checked={moveCard}
											onChange={v => setMoveCard(v)}
										>
											{card && card.moveCardLabel}{" "}
											<InlineMenu items={moveCardItems}>
												{moveCardDestinationLabel || "make selection"}
											</InlineMenu>
										</StyledCheckbox>
									)}
									{showUpdateSlackCheckbox && (
										<StyledCheckbox
											name="update-slack"
											checked={updateSlack}
											loading={loadingSlack && !derivedState.isConnectedToSlack}
											onChange={v => setUpdateSlack(v)}
										>
											Update my status on Slack
										</StyledCheckbox>
									)}
									<div style={{ height: "5px" }}></div>
									{scmError && <SCMError>{scmError}</SCMError>}
									<ButtonRow>
										<Button onClick={clear} variant="secondary">
											Cancel
										</Button>
										<Button
											onClick={save}
											isLoading={loading}
											variant={label.length ? "primary" : "secondary"}
											disabled={!label.length}
										>
											{saveLabel}
										</Button>
									</ButtonRow>
								</div>
							</fieldset>
						</form>
					</Dialog>
				</Modal>
			)}
			<ScrollBox>
				<div className="channel-list vscroll">
					<OpenReviews />
					<StatusSection>
						<Tooltip
							title={
								<>
									Works with local WIPs too.
									<br />
									Watch the{" "}
									<a
										onClick={() => {
											HostApi.instance.send(OpenUrlRequestType, {
												url: "https://youtu.be/2AyqT4z5Omc"
											});
											HostApi.instance.track("Viewed Review Video");
										}}
									>
										video guide
									</a>
								</>
							}
							delay={1}
						>
							<RoundedLink
								onClick={() => {
									dispatch(setNewPostEntry("Status"));
									dispatch(openPanel(WebviewPanels.NewReview));
								}}
							>
								<Icon className="padded-icon" name="review" />
								<span className="wide-text">Request </span>Review
							</RoundedLink>
						</Tooltip>
						<H4>Work In Progress</H4>
						{status && status.label && (
							<Row style={{ marginBottom: "5px" }} className="no-hover wide">
								<div>
									<Icon name={status.ticketProvider || "ticket"} />
								</div>
								<div>{status.label}</div>
								<div className="icons">
									<Tooltip title="Clear work item" placement="bottomLeft" delay={1}>
										<Icon onClick={() => clearAndSave()} className="clickable" name="x-circle" />
									</Tooltip>
									{status.ticketUrl && (
										<Icon
											title={`Open on web`}
											delay={1}
											placement="bottomRight"
											name="globe"
											className="clickable link-external"
											onClick={e => {
												e.stopPropagation();
												e.preventDefault();
												HostApi.instance.send(OpenUrlRequestType, {
													url: status.ticketUrl
												});
											}}
										/>
									)}
								</div>
							</Row>
						)}
						<ModifiedRepos
							id={derivedState.currentUserId}
							onlyRepos={openRepos ? openRepos.filter(_ => _.id).map(_ => _.id!) : undefined}
							defaultText={
								<span className="subtle">
									As you write code, files that have changed will appear here.
								</span>
							}
						/>
					</StatusSection>
					<StartWorkIssueContext.Provider value={{ setValues: values => selectCard(values) }}>
						<IssueDropdown selectedCardId={status.ticketId} />
					</StartWorkIssueContext.Provider>
					<div style={{ margin: "0" }}>
						<Docs>
							<span onClick={() => dispatch(openPanel(WebviewPanels.Flow))}>
								<Icon name="chevron-right" />
								CodeStream Howto <sup className="highlight">new!</sup>
							</span>
							<span
								style={{ display: "none" }}
								className="getting-started"
								onClick={() => dispatch(openPanel(WebviewPanels.GettingStarted))}
							>
								<Icon name="dashboard" />
								Getting Started
							</span>
						</Docs>
					</div>
				</div>
			</ScrollBox>
		</div>
	);
};

const Popup = styled.div`
	z-index: 35;
	text-align: center;
	position: absolute;
	top: 0px;
	width: 100%;
	height: 100%;
	background: var(--app-background-color);
	padding: 40px 20px 0 20px;
`;

const Dialog = styled.div`
	padding: 5px 5px 15px 5px;
	text-align: left;
	// max-width: 500px;
	width: 100%;
	margin: 0 auto;
	display: inline-block;
`;
