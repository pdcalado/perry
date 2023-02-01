import React, { useState, ReactNode, useEffect, useCallback } from "react";
import CheckboxTreeComponent, {
    Node as CheckboxNode,
} from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import {
    Attribute,
    EntitySpec,
    Model,
    muri,
    tree,
} from "perrydl";
import "./modelTree.css";
import { Cube, ListUl, Tag, AngleDown, AngleRight } from "icons";
import styled, { css } from "styled-components";

// We use custom URIs to address the selected attributes and entities.
// Read more in src/ermodel/muri.ts.

const iconColor = css`
    color: ${(props) => props.theme.colors.info};
`;

const ExpandOpenIcon = AngleDown;
const ExpandCloseIcon = AngleRight;
const AttributeIcon = styled(Tag)`
    ${iconColor}
`;
const AttributesIcon = styled(ListUl)`
    ${iconColor}
`;
const EntityIcon = styled(Cube)`
    ${iconColor}
`;

interface TargetNode extends CheckboxNode {
    checked: boolean;
    children?: TargetNode[];
}

type CheckboxTree = {
    node?: tree.Node<TargetNode>;
    checked: string[];
};

type MakerProps = {
    attributeIcon?: ReactNode;
    attributeFolderIcon?: ReactNode;
    attributesLabel?: string;
    entityIcon?: ReactNode;
    rootUrn?: string;
};

const defaultMakerProps: MakerProps = {
    attributeIcon: <AttributeIcon fixedWidth={true} />,
    attributeFolderIcon: <AttributesIcon fixedWidth={true} />,
    attributesLabel: "(attributes)",
    entityIcon: <EntityIcon fixedWidth={true} />,
};

const create = (meta: tree.Meta, props: MakerProps): TargetNode => {
    switch (meta.kind) {
        case tree.Kind.Entity:
            return {
                label: (meta.reference as EntitySpec).getName(),
                value: meta.uri,
                checked: false,
                icon: props.entityIcon,
            };
        case tree.Kind.Attribute:
            return {
                label: (meta.reference as Attribute).id,
                value: meta.uri,
                checked: true,
                icon: props.attributeIcon,
            };
        case tree.Kind.Attributes:
            return {
                label: props.attributesLabel,
                value: meta.uri,
                checked: true,
                icon: props.attributeFolderIcon,
            };
    }
};

const prepareProps = (props: MakerProps): MakerProps => {
    // We are mutating the original object, but it is unharmful.
    const mutable = props as { [key: string]: any };

    // Remove undefined keys to prevent overlap
    Object.keys(mutable).forEach((key) => {
        if (mutable[key] === undefined) delete mutable[key];
    });

    return { ...defaultMakerProps, ...props };
};

class NodeMaker extends tree.Builder<TargetNode> {
    constructor(model: Model, props: MakerProps = defaultMakerProps) {
        super(model, (meta: tree.Meta) => create(meta, prepareProps(props)));
    }

    static getCheckedURIs = (node: tree.Node<TargetNode>): string[] => {
        const checked: string[] = [];
        const traverse = (node: tree.Node<TargetNode>) => {
            if (node.inner.checked) checked.push(node.inner.value);
        };

        tree.Builder.traversePostOrder(node, traverse);
        return checked;
    };
}

type Props = {
    model: Model;
    // onChangeGraph must not change after the first render.
    onChangeGraph: (node: tree.Node<TargetNode>) => void;
    // Expand icons
    expandOpenIcon?: React.ReactNode;
    expandCloseIcon?: React.ReactNode;
} & MakerProps;

const useMountCallback = (fun: (arg: any) => void) => useCallback(fun, []);
const setChildren = (inner: TargetNode, children: TargetNode[]) => {
    inner.children = children;
};

export const ModelTree = ({
    model,
    attributeIcon,
    attributeFolderIcon,
    attributesLabel,
    entityIcon,
    rootUrn,
    onChangeGraph,
    expandOpenIcon = <ExpandOpenIcon fixedWidth={true} />,
    expandCloseIcon = <ExpandCloseIcon fixedWidth={true} />,
}: Props) => {
    const [maker, setMaker] = useState<NodeMaker | null>(null);
    const [checkboxTree, setCheckboxTree] = useState<CheckboxTree>({
        checked: [],
    });
    const [expanded, setExpanded] = useState<string[]>([]);

    // This callback is defined on mount and won't change.
    const setNode = useMountCallback((node: tree.Node<TargetNode>) => {
        const checked = NodeMaker.getCheckedURIs(node);
        setCheckboxTree({
            node,
            checked,
        });

        // Pass to onChange only the checked nodes,
        // to prevent unchecked ones from being used.
        const checkedSet = new Set(checked);
        const filter = (n: tree.Node<any>) => checkedSet.has(n.uri);
        const clone = tree.Builder.hollowClone(node, filter);
        onChangeGraph(clone);
    });

    useEffect(() => {
        const makerProps = {
            attributeIcon,
            attributeFolderIcon,
            attributesLabel,
            entityIcon,
            rootUrn,
        };
        const maker = new NodeMaker(model, makerProps);
        setMaker(maker);
        const outer = maker.rootFromEntity(rootUrn!);
        setNode(outer);
    }, [
        model,
        attributeIcon,
        attributeFolderIcon,
        attributesLabel,
        entityIcon,
        rootUrn,
        setNode,
    ]);

    const onCheck = (
        checked: string[],
        nodeCheck = {} as CheckboxNode & { checked: boolean }
    ) => {
        const clone = tree.Builder.clone(checkboxTree.node!, (t: TargetNode) =>
            Object.assign({ ...t, checked: false, children: undefined }, {})
        );

        let localChecked = [];

        const target = tree.Builder.findByURI(clone, nodeCheck.value)!;

        if (nodeCheck.checked) {
            localChecked = [
                target.uri,
                ...checked,
                ...muri.getAncestors(nodeCheck.value),
            ];
            maker!.drillNode(target);
        } else {
            maker!.sealNode(target);
            localChecked = checked.filter(
                (c) => !muri.isDescendantOf(c, target.uri)
            );
        }

        localChecked.forEach((c) => {
            const node = tree.Builder.findByURI(clone, c);
            if (node) node.inner.checked = true;
        });

        setNode(clone);
    };

    const nodes = checkboxTree.node
        ? [tree.Builder.intoInner(checkboxTree.node, setChildren)]
        : ([] as CheckboxNode[]);

    return (
        <CheckboxTreeComponent
            nodes={nodes}
            checked={checkboxTree.checked}
            expanded={expanded}
            onCheck={onCheck}
            onExpand={(expanded) => setExpanded(expanded)}
            icons={{
                expandClose: expandCloseIcon,
                expandOpen: expandOpenIcon,
            }}
        />
    );
};
