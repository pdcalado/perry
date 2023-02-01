import { DividerBox } from "rc-dock";
import styled from "styled-components";

const Dynamic = styled(DividerBox)`
    background-color: ${(props) => props.theme.colors.defaultBackground};

    .dock-divider.drag-initiator {
        flex: 0 0 1px;
        background-color: ${(props) => props.theme.colors.dockDivider};
    }

    .dock-panel {
        background-color: ${(props) => props.theme.colors.defaultBackground};
    }

    .dock-panel.dock-style-custom {
        margin: 0;
        padding: 0;
        border: none;
    }

    .dock-panel.dock-style-custom .dock-nav-wrap {
        padding-top: 0;
        padding-left: 0;
        margin-left: 0;
    }

    .dock-panel.dock-style-custom .dock-tab {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-left: 10px;
        padding-right: 10px;
        font-size: 13px;
        height: 35px;
        margin-right: 0;
        border: none;
        border-radius: 0;
        border: 1px solid ${(props) => props.theme.colors.dockbarBackground};
        background-color: ${(props) =>
            props.theme.colors.docktabInactiveBackground};
        color: ${(props) => props.theme.colors.dockbarForeground};
    }

    .dock-panel.dock-style-custom .dock-tab.dock-tab-active {
        border: none;
        background-color: ${(props) =>
            props.theme.colors.docktabActiveBackground};
        color: ${(props) => props.theme.colors.docktabActiveForeground};
    }

    .dock-panel.dock-style-custom .dock-bar {
        background-color: ${(props) => props.theme.colors.dockbarBackground};
        border: none;
    }

    .dock-panel.dock-style-custom .dock-nav-container {
        height: auto;
        padding: 0;
    }

    .dock-panel.dock-style-custom .dock-tab-hit-area {
        /* cover the border area */
        left: -1px;
        right: -1px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .dock-layout > .dock-drop-indicator {
        border: solid 1px ${(props) => props.theme.colors.dockDropIndicator};
        box-shadow: inset 0 0 10px
            ${(props) => props.theme.colors.dockDropIndicator};
        background: none;
    }

    .dock-panel.dock-style-custom .dock-tab-close-btn {
        color: ${(props) => props.theme.colors.dockbarForeground};
        top: auto;
    }

    .dock-content .dock-tabpane {
        overflow-y: auto;

        ::-webkit-scrollbar {
            width: ${(props) => props.theme.sizes.scrollBar};
            border: solid ${(props) => props.theme.colors.scrollBarBorder};
            border-width: 0 0 0 ${(props) => props.theme.sizes.scrollBarBorder};
        }

        ::-webkit-scrollbar-thumb {
            background-color: ${(props) => props.theme.colors.scrollBarThumb};
        }
    }

    .dock-tabpane {
        background-color: ${(props) => props.theme.colors.defaultBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
        font-size: ${(props) => props.theme.sizes.defaultFont};
    }

    .dock-tabpane .card {
        border-radius: 0;
        background-color: ${(props) => props.theme.colors.defaultBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
    }

    .dock-tabpane .table {
        background-color: ${(props) => props.theme.colors.defaultBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
    }

    .dock-tabpane .dropdown-menu {
        background-color: ${(props) => props.theme.colors.defaultBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
        font-size: ${(props) => props.theme.sizes.defaultFont};
    }

    .dock-tabpane .dropdown-item {
        color: ${(props) => props.theme.colors.defaultForeground};
    }
`;

export default Dynamic;
