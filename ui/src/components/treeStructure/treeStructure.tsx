import CheckboxTreeComponent, { Node } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import React, { useState } from "react";
import { AngleRight, AngleDown } from "icons";
import styled from "styled-components";
import { useContextMenu, ContextMenuItem, TooltipDiv } from "components";

/**
 * Extends Node from react-checkbox-tree:
 * https://github.com/jakezatecky/react-checkbox-tree/blob/master/src/index.d.ts
 * interface Node {
 *   label: React.ReactNode;
 *   value: string;
 *   children?: Array<Node>;
 *   className?: string;
 *   disabled?: boolean;
 *   icon?: React.ReactNode;
 *   showCheckbox?: boolean;
 *   title?: string;
 * }
 */
export interface TreeStructureNode extends Node {
    tooltip?: string;
    contextMenu?: ContextMenuItem[];
    children?: TreeStructureNode[];
    onSelect?: () => void;
    sideOptions?: TreeStructureSideOption[];
}

/**
 * Side icon to show at the right-hand side of the Node.
 */
export type TreeStructureSideOption = {
    /**
     * Tooltip text to show when hovering.
     */
    tooltip: string;
    /**
     * Icon for this option.
     */
    icon: React.ReactNode;
    /**
     * Function called when option is clicked.
     */
    onClick: (e: React.MouseEvent) => void;
};

const StyledWrap = styled.div`
    /* Reduce padding on the left */
    .react-checkbox-tree ol ol {
        padding-left: 0;
        margin-left: 12px;
    }

    /* Show depth lines on the left when hovering */
    .react-checkbox-tree ol {
        border: solid ${(props) => props.theme.colors.sidebarForeground}00;
        border-width: 0 0 0 1px;
    }

    .react-checkbox-tree:hover ol {
        border-color: ${(props) => props.theme.colors.sidebarForeground}30;
    }

    /* Do not display unexisting collapse buttons */
    span.rct-collapse {
        /* display: none; */
        padding-right: 0 !important;
    }

    .rct-collapse-btn {
        padding: 0;
    }

    .rct-text {
        display: flex;
        justify-content: space-between;
    }

    .rct-bare-label {
        width: 100%;
        :hover {
            background-color: ${(props) => props.theme.colors.sidebarItemHover};
        }
    }

    .node-selected > .rct-text > .rct-bare-label {
        background-color: ${(props) => props.theme.colors.sidebarItemHover};
        color: white;
    }

    .rct-title {
        width: 100%;
        padding-right: 0;
    }

    .rct-node-clickable {
        display: flex;
    }

    .tree-side-option {
        display: none;
    }

    .rct-node-clickable:focus {
        background: inherit;
    }

    .rct-node-clickable:hover {
        background: inherit;

        .tree-side-option {
            display: unset;
            opacity: 0.6;
        }

        .tree-side-option:hover {
            display: unset;
            color: white;
            opacity: 1;
        }
    }
`;

type ActionMap = { [key: string]: () => void };

type WrapContextProps = {
    menuItems: ContextMenuItem[];
};

const WrapMenuStyle = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

const WrapContext: React.FC<WrapContextProps> = ({ menuItems, children }) => {
    const { show } = useContextMenu();

    return (
        <WrapMenuStyle onContextMenu={(e) => show(e, menuItems)}>
            {children}
        </WrapMenuStyle>
    );
};

const wrapLabel = (node: TreeStructureNode): React.ReactNode => {
    const sideElement = node.sideOptions ? (
        <TooltipDiv $margin="10px 0 0 20px" $attribute="data-tooltip">
            {node.sideOptions.map((option, i) => (
                <div
                    key={i}
                    className="mr-2 tree-side-option"
                    data-tooltip={option.tooltip}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        option.onClick(e);
                    }}
                >
                    {option.icon}
                </div>
            ))}
        </TooltipDiv>
    ) : null;

    let children = sideElement ? (
        <React.Fragment>
            <span className="mr-auto">{node.label}</span>
            {sideElement}
        </React.Fragment>
    ) : (
        node.label
    );

    return node.contextMenu ? (
        <WrapContext menuItems={node.contextMenu!}>{children}</WrapContext>
    ) : (
        <WrapMenuStyle>{children}</WrapMenuStyle>
    );
};

const prepareNode = (
    node: TreeStructureNode,
    actionMap: ActionMap,
    select?: string
): TreeStructureNode => {
    if (node.onSelect) actionMap[node.value] = node.onSelect;
    return {
        ...node,
        label: wrapLabel(node),
        showCheckbox: false,
        className: node.value === select ? "node-selected" : "",
        children:
            node.children && prepareNodes(node.children, actionMap, select),
    };
};

const prepareNodes = (
    nodes: TreeStructureNode[],
    actionMap: ActionMap,
    select?: string
): TreeStructureNode[] => {
    return nodes.map((node) => prepareNode(node, actionMap, select));
};

type Props = {
    nodes?: TreeStructureNode[];
    // Expand icons
    expandOpenIcon?: React.ReactNode;
    expandCloseIcon?: React.ReactNode;
    initialExpanded?: string[];
};

export const TreeStructure = ({
    nodes = [],
    expandOpenIcon = <AngleDown size="lg" fixedWidth={true} />,
    expandCloseIcon = <AngleRight size="lg" fixedWidth={true} />,
    initialExpanded = [],
}: Props) => {
    const [expanded, setExpanded] = useState<string[]>(initialExpanded);
    const [selected, setSelected] = useState<string | undefined>(undefined);

    const actionMap = {} as ActionMap;
    const readyNodes = prepareNodes(nodes, actionMap, selected);

    return (
        <StyledWrap>
            <CheckboxTreeComponent
                nodes={readyNodes}
                expanded={expanded}
                expandOnClick={true}
                onClick={(targetNode) => {
                    setSelected(targetNode.value);
                    if (targetNode.value in actionMap)
                        actionMap[targetNode.value]();
                }}
                onExpand={(expand) => {
                    setExpanded(expand);
                }}
                icons={{
                    expandClose: expandCloseIcon,
                    expandOpen: expandOpenIcon,
                }}
            />
        </StyledWrap>
    );
};
