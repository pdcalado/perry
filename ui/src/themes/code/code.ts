import { theme, Theme } from "themes/common";
import NORD from "../nord/vendor";

const primary = "#0e639c";
const info = "#4893ba";
const success = "#16825d";

const code: Theme = {
    mode: "dark",
    colors: {
        defaultBackground: theme("mode", { dark: "#1e1e1e" }),
        defaultForeground: theme("mode", { dark: "#cccccc" }),
        defaultGreyedOut: theme("mode", { dark: "#a09b90" }),
        activitybarBackground: theme("mode", { dark: "#333333" }),
        activitybarForeground: theme("mode", { dark: "#848484" }),
        activitybarIconHover: theme("mode", {
            dark: "#ffffff",
            light: "#000000",
        }),
        tooltipBackground: theme("mode", { dark: "#212c31" }),
        tooltipBorder: theme("mode", { dark: "#ffffff" }),
        headerBackground: theme("mode", { dark: "#2f2f2f" }),
        headerForeground: theme("mode", { dark: "#ffffff" }),
        sidebarTitle: theme("mode", { dark: "#252526" }),
        sidebarBackground: theme("mode", { dark: "#252526" }),
        sidebarForeground: theme("mode", { dark: "#cccccc" }),
        sidebarItemHover: theme("mode", { dark: "#37373d" }),
        dockbarBackground: theme("mode", { dark: "#252526" }),
        dockbarForeground: theme("mode", { dark: "#969696" }),
        dockDivider: theme("mode", { dark: "#424242" }),
        docktabBackground: theme("mode", { dark: "#252526" }),
        docktabActiveBackground: theme("mode", { dark: "#1e1e1e" }),
        docktabActiveForeground: theme("mode", { dark: "#ffffff" }),
        docktabInactiveBackground: theme("mode", { dark: "#2d2d2d" }),
        dockDropIndicator: theme("mode", { dark: "#838482" }),
        dropdownBackground: theme("mode", { dark: "#252526" }),
        inputBackground: theme("mode", { dark: "#3c3c3c" }),
        scrollBarBorder: theme("mode", { dark: "rgba(204, 204, 204, 0.4)" }),
        scrollBarThumb: theme("mode", { dark: "rgba(204, 204, 204, 0.4)" }),
        menuItemHover: theme("mode", { dark: "#094771" }),
        navbarItemHover: theme("mode", { dark: "#505050" }),
        tableRowHover: theme("mode", { dark: "#37373d" }),
        toastBackground: theme("mode", { dark: "#252526" }),
        variants: theme.variants("mode", "variant", {
            default: { dark: NORD.nord3 },
            primary: { dark: primary },
            info: { dark: info },
            success: { dark: success },
            danger: { dark: NORD.nord11 },
            warning: { dark: NORD.nord13 },
        }),
        primary: theme("mode", { dark: primary }),
        info: theme("mode", { dark: info }),
        success: theme("mode", { dark: success }),
        danger: theme("mode", { dark: NORD.nord11 }),
        warning: theme("mode", { dark: NORD.nord13 }),
        black: theme("mode", { dark: "#000000", light: "#ffffff" }),
        white: theme("mode", { light: "#000000", dark: "#ffffff" }),
    },
    sizes: {
        defaultFont: "14px",
        scrollBar: "0.75em",
        scrollBarBorder: "1px",
    },
};

export default code;
