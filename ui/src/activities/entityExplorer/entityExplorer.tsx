import React from "react";
import { useTranslation } from "react-i18next";
import { Collapsable } from "components";
import styled from "styled-components";
import { ExplorerImport } from "./explorerImport";
import { ExplorerTreeExplore } from "./explorerTreeExplore";
import { ExplorerEvents } from "./explorerEvents";

const StyledTitle = styled.span`
    font-size: 85%;
    font-weight: bold;
`;

const makeTitle = (text: string) => <StyledTitle>{text}</StyledTitle>;

const EntityExplorer = () => {
    const { t } = useTranslation();

    return (
        <React.Fragment>
            <Collapsable
                title={makeTitle(t("Explorer").toLocaleUpperCase())}
                initial={true}
            >
                <ExplorerTreeExplore />
            </Collapsable>
            <Collapsable
                title={makeTitle(t("Import/Export").toLocaleUpperCase())}
                initial={false}
            >
                <ExplorerImport />
            </Collapsable>
            <Collapsable
                title={makeTitle(t("Events").toLocaleUpperCase())}
                initial={false}
            >
                <ExplorerEvents />
            </Collapsable>
        </React.Fragment>
    );
};

export default EntityExplorer;
