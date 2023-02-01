import React from "react";
import { TreeStructure, TreeStructureNode } from "components";
import { PlusCircle, TrashAlt, Edit } from "icons";
import styled, { css } from "styled-components";
import { useTranslation } from "react-i18next";
import { useRecoilValue } from "recoil";
import { lastMutations } from "activities/events/state";
import { muri } from "perrydl";
import { TFunction } from "i18next";
import { useEntityRelation } from "ermodel";

const iconColor = css`
    color: ${(props) => props.theme.colors.info};
`;
const StyledPlus = styled(PlusCircle)`
    ${iconColor}
`;
const StyledTrash = styled(TrashAlt)`
    ${iconColor}
`;
const StyledEdit = styled(Edit)`
    ${iconColor}
`;

const makeNode = (
    t: TFunction,
    operation: string,
    name: string,
    index: number,
) => {
    switch (operation) {
        case "create":
            return {
                label: t("eventCreated", { name }),
                value: `index-${index}`,
                icon: <StyledPlus />,
                onSelect: () => null,
            };
        case "update":
            return {
                label: t("eventUpdated", { name }),
                value: `index-${index}`,
                icon: <StyledEdit />,
                onSelect: () => null,
            };
        case "delete":
            return {
                label: t("eventDeleted", { name }),
                value: `index-${index}`,
                icon: <StyledTrash />,
                onSelect: () => null,
            };
    }
    return null;
}

export const ExplorerEvents = () => {
    const { t } = useTranslation();
    const { model } = useEntityRelation();

    const mutations = useRecoilValue(lastMutations);

    if (!model) {
        return null;
    }

    const nodes = mutations.map((mutation, index) => {
        const key = mutation.getKey();
        const operation = muri.basename(key);
        const entity = model.findEntityByUrn(muri.getParent(key));
        return makeNode(
            t, operation, entity?.getName() || "" , index
        )
    }) as TreeStructureNode[];

    return <TreeStructure nodes={nodes} />;
};
