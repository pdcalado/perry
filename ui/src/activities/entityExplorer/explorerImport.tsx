import React from "react";
import { TreeStructure } from "components";
import { Upload, Download, PlusCircle } from "icons";
import styled, { css } from "styled-components";
import { useTranslation } from "react-i18next";
import { useTabs } from "utils";
import {
    importAnyObject,
    importUpdateAnyObject,
    exportAnyObject,
} from "ermodel";

const iconColor = css`
    color: ${(props) => props.theme.colors.info};
`;
const StyledUpload = styled(Upload)`
    ${iconColor}
`;
const StyledPlus = styled(PlusCircle)`
    ${iconColor}
`;

const ImportNewIcon = () => (
    <span className="fa-layers fa-fw">
        <StyledUpload transform="shrink-2 up-2 left-3" />
        <StyledPlus transform="shrink-5 down-6 right-7" />
    </span>
);

const ImportUpdateIcon = styled(Upload)`
    ${iconColor}
`;

const ExportIcon = styled(Download)`
    ${iconColor}
`;

export const ExplorerImport = () => {
    const { t } = useTranslation();
    const { tabsAPI } = useTabs();

    const titleImportNew = t("Import Objects From List");
    const titleImportUpdate = t("Update Objects From List");
    const titleExport = t("Export Objects");

    const nodes = [
        {
            label: titleImportNew,
            value: "import-new-list",
            icon: <ImportNewIcon />,
            onSelect: () => tabsAPI.createIfNotExists(importAnyObject),
        },
        {
            label: titleImportUpdate,
            value: "import-update-list",
            icon: <ImportUpdateIcon />,
            onSelect: () => tabsAPI.createIfNotExists(importUpdateAnyObject),
        },
        {
            label: titleExport,
            value: "export-list",
            icon: <ExportIcon />,
            onSelect: () => tabsAPI.createIfNotExists(exportAnyObject),
        },
    ];

    return <TreeStructure nodes={nodes} />;
};
