import { theme, Theme } from "themes/common";
import NORD from "./vendor";

const nord: Theme = {
    mode: "dark",
    colors: {
        defaultBackground: theme("mode", { dark: NORD.nord0 }),
        defaultForeground: theme("mode", { dark: NORD.nord4 }),
        defaultGreyedOut: theme("mode", { dark: NORD.nord3 }),
        activitybarBackground: theme("mode", { dark: NORD.nord3 }),
        activitybarForeground: theme("mode", { dark: NORD.nord9 }),
        activitybarIconHover: theme("mode", { dark: "white", light: "black" }),
        headerBackground: theme("mode", { dark: NORD.nord2 }),
        headerForeground: theme("mode", { dark: NORD.nord4 }),
        sidebarTitle: theme("mode", { dark: NORD.nord1 }),
        sidebarBackground: theme("mode", { dark: NORD.nord0 }),
        sidebarForeground: theme("mode", { dark: NORD.nord4 }),
        sidebarItemHover: theme("mode", { dark: NORD.nord3 }),
        dockbarBackground: theme("mode", { dark: NORD.nord0 }),
        dockbarForeground: theme("mode", { dark: NORD.nord4 }),
        dockDivider: theme("mode", { dark: NORD.nord2 }),
        docktabBackground: theme("mode", { dark: NORD.nord3 }),
        docktabActiveBackground: theme("mode", { dark: NORD.nord0 }),
        docktabActiveForeground: theme("mode", { dark: "#ffffff" }),
        docktabInactiveBackground: theme("mode", { dark: NORD.nord1 }),
        dockDropIndicator: theme("mode", { dark: NORD.nord8 }),
        variants: theme.variants("mode", "variant", {
            default: { dark: NORD.nord3 },
            primary: { dark: NORD.nord10 },
            info: { dark: NORD.nord9 },
            success: { dark: NORD.nord14 },
            danger: { dark: NORD.nord11 },
            warning: { dark: NORD.nord13 },
        }),
        primary: theme("mode", { dark: NORD.nord10 }),
        info: theme("mode", { dark: NORD.nord9 }),
        success: theme("mode", { dark: NORD.nord14 }),
        danger: theme("mode", { dark: NORD.nord11 }),
        warning: theme("mode", { dark: NORD.nord13 }),
        black: theme("mode", { dark: "#000000", light: "#ffffff" }),
        white: theme("mode", { light: "#000000", dark: "#ffffff" }),
    },
    sizes: {
        defaultFont: "14px",
    },
};

export default nord;
