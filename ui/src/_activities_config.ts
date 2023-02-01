import React from "react";
import { NavLink } from "react-router-dom";
import { Link as Chain } from "icons";
import { TFunction } from "i18next";
import { FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

export type ActivityConfig = {
    name: string;
    urlPath: string;
    default?: boolean;
    component: React.ComponentType<any>;
    icon: React.ReactNode;
};

const EntityExplorer = React.lazy(() =>
    import("activities/entityExplorer/entityExplorer")
);

const iconProps: Partial<FontAwesomeIconProps> = {
    size: "lg",
    fixedWidth: true,
};

export const activities = (t: TFunction): ActivityConfig[] => [
    {
        name: t("Entity Explorer"),
        urlPath: "/entity-explorer",
        component: EntityExplorer,
        icon: Chain(iconProps),
        default: true
    },
];

export const Link = NavLink;
