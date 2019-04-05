# Change Log

## [0.51.1] - 2019-4-4

### Fixed

- Fixes a race condition in the extension that may result in an alert box when Visual Studio starts
- Fixes an issue with the Live Share integration not working under VS 2019

## [0.51.0] - 2019-4-2

### Changed

- Changes the `Ctrl+/` `Ctrl+/` shortcut to toggle the CodeStream pane
- Improves the Jira project search to ensure all projects are available for selection

### Fixed

- Fixes [#42](https://github.com/TeamCodeStream/CodeStream/issues/42) &mdash; VS Slack black text
- Fixes an issue with CodeStream causing laggy typing

## [0.50.0] - 2019-3-21

### Added

- Adds a Google Docs-like display of codemarks in the current file, where codemarks are displayed to the right of the source code and scroll up/down along with the source
- Adds a permalink codemark type for sharing a link to a specific block of code
- Adds the ability to close or re-open an issue from the codemark's thread view
- Adds an Archive option to a codemark’s gear menu to hide it when the Current File tab is selected (but it will still be shown on the Search tab)
- Adds [keyboard shortcuts](https://github.com/TeamCodeStream/CodeStream/wiki/Keyboard-Shortcuts) for creating a codemark after selecting some code
- Adds annotations to the editor scroll bar to indicate where codemarks exist in the source file

### Changed

- Opening the CodeStream pane is now much faster
- New icon-based global navigation
- When selecting a channel/DM to share a codemark, the list now honors the “selected conversations” filter from the Channels tab
- Context/lightbulb menus in the editor now have separate entries for creating a comment, issue, bookmark or permalink

### Fixed

- Fixes [#37](https://github.com/TeamCodeStream/CodeStream/issues/37) &mdash; Need to log in CodeStream on VS each time the computer is shutdown
- Fixes an issue with the wrong channel name being displayed at the top of the page when viewing a codemark
- Fixes an issue with links to join a Live Share session not being clickable
- Fixes an issue with “/cc” being include in codemarks shared on Slack when no one was mentioned

## [0.11.0] - 2019-02-15

### Added

- Adds support for network connections via proxies

### Fixed

- Fixes an issue with codemarks occasionally appearing on the wrong line
- Fixes an issue where CodeStream would incorrectly reload immediately after login
- Fixes an issue where the Submit/Cancel buttons would not render correctly when creating a codemark