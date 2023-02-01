import React from "react";
import { TreeStructure } from "components";
import { Cubes, Search, PlusCircle } from "icons";
import styled, { css } from "styled-components";
import { useTranslation } from "react-i18next";
import { createLazyTab, createTabTitle, useTabs } from "utils";
import { createAnyObject } from "ermodel";

const explorerTab = (title: string) => createLazyTab(
    "entity-explorer",
    createTabTitle(<Search />, title),
    () => import("./explorerTab")
);

const iconColor = css`
    color: ${(props) => props.theme.colors.info};
`;

const AllEntities = styled(Cubes)`
    ${iconColor}
`;

const CreateObject = styled(PlusCircle)`
    ${iconColor}
`;

export const ExplorerTreeExplore = () => {
    const { t } = useTranslation();
    const { tabsAPI } = useTabs();

    const nodes = [
        {
            label: t("Explore Entities"),
            value: "explore-entities",
            icon: <AllEntities />,
            onSelect: () => tabsAPI.createIfNotExists(explorerTab(t("Entity Explorer"))),
        },
        {
            label: t("Create Entity Object"),
            value: "create-entity-object",
            icon: <CreateObject />,
            onSelect: () =>
                tabsAPI.createIfNotExists(createAnyObject),
        },
    ];

    return <TreeStructure nodes={nodes} />;
};
