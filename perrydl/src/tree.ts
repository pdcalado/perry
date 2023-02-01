import { EntitySpec, Attribute, CommonAttributes, RelationSpec } from "./schemas";
import { muri, Model } from "./";

export enum Kind {
    Entity,
    Attribute,
    Attributes,
}

// Metadata for the node to ease manipulation.
export type Meta = {
    uri: string;
    reference: EntitySpec | Attribute | Attribute[];
    kind: Kind;
    isRoot?: boolean;
    // relationWithParent is only set for Kind.EntitySpec
    relationWithParent?: RelationSpec;
};

// The actual tree node type.
export interface Node<T> extends Meta {
    inner: T;
    children: Node<T>[];
}

const isDrillable = (node: Node<any>): boolean => node.kind === Kind.Entity;

// This method may only be called for nodes of kind Entity
const prependAttributes = <T>(
    node: Node<T>,
    attributes: Attribute[],
    createNew: CreateNew<T>
) => {
    if (!node.children.length) {
        node.children.push(
            Builder.fromAttributesWithCallback(attributes, node.uri, createNew)
        );
        return;
    }

    // Expect the zeroth element to be of type Attributes.
    // Otherwise assume node has no attributes.
    if (node.children[0].kind !== Kind.Attributes) {
        node.children = [
            Builder.fromAttributesWithCallback(attributes, node.uri, createNew),
            ...node.children,
        ];
        return;
    }

    const toPrepend = attributes.map((a) =>
        Builder.fromAttributeWithCallback(
            a,
            muri.pushAttributeFolder(node.uri),
            createNew
        )
    );

    node.children[0].children = [...toPrepend, ...node.children[0].children];
};

export type CreateNew<T> = (meta: Meta) => T;

// A builder class to create nodes using an Entity Relation model.
export class Builder<T> {
    model: Model;
    createNew: (meta: Meta) => T;

    constructor(model: Model, createNew: (meta: Meta) => T) {
        this.model = model;
        this.createNew = createNew;
    }

    fromAttributes = (attributes: Attribute[], prefix: string): Node<T> =>
        Builder.fromAttributesWithCallback(attributes, prefix, this.createNew);

    // Create a node's children
    // node argument is mutated.
    drillNode = (node: Node<T>) => {
        if (!isDrillable(node)) return;

        if (node.children.length) return;

        const entity = node.reference as EntitySpec;
        const attributesNode = this.fromAttributes(
            entity.getCustomAttributes(),
            node.uri
        );
        const nested = this.model
            .getRelationsOfEntity(entity.getUrn())
            .map((relationUrn) => this.model.findRelationByUrn(relationUrn)!)
            .map((relation) => {
                const other = this.model.getRelatedEntity(
                    entity.getUrn(),
                    relation.getUrn()
                );
                return this.fromEntity(other!, node.uri, relation);
            });

        node.children = [attributesNode, ...nested];
        return;
    };

    // Remove a node's children, if any.
    // node argument is mutated.
    sealNode = (node: Node<T>) => {
        if (!isDrillable(node)) return;

        if (!node.children.length) return;

        node.children = [];
        return;
    };

    fromEntity = (
        entity: EntitySpec,
        prefix: string,
        relationWithParent?: RelationSpec
    ): Node<T> => {
        return Builder.fromEntityStatic(entity, prefix, this.createNew, relationWithParent);
    };

    rootFromEntity = (urn: string): Node<T> => {
        const entity = this.model.findEntityByUrn(urn)!;
        const node = this.fromEntity(entity, "");
        this.drillNode(node);
        return node;
    };

    // Static methods

    static fromEntityStatic = <T>(
        entity: EntitySpec,
        prefix: string,
        createNew: CreateNew<T>,
        relationWithParent?: RelationSpec
    ): Node<T> => {
        const meta: Meta = {
            uri: muri.join(prefix, entity.getUrn()),
            reference: entity,
            kind: Kind.Entity,
            isRoot: prefix.length === 0,
            relationWithParent,
        };
        return {
            ...meta,
            inner: createNew(meta),
            children: [],
        };
    };

    static entityWithAttributes = <T>(
        entity: EntitySpec,
        createNew: CreateNew<T>,
        attributes?: Attribute[],
    ): Node<T> => {
        const root = Builder.fromEntityStatic(entity, "", createNew);
        const attributesNode = Builder.fromAttributesWithCallback(
            attributes || entity.getCustomAttributes(),
            root.uri,
            createNew
        );
        root.children = [attributesNode];
        return root;
    };

    // This method mutates the node in place.
    static insertDefaultAttributes = <T>(
        node: Node<T>,
        createNew: CreateNew<T>
    ) => {
        const traverse = (n: Node<T>) => {
            if (n.kind === Kind.Entity) {
                prependAttributes(n, CommonAttributes, createNew);
            }
        };
        Builder.traversePreOrder(node, traverse);
    };

    static fromAttributeWithCallback = <T>(
        attribute: Attribute,
        prefix: string,
        createNew: CreateNew<T>
    ): Node<T> => {
        const meta = {
            uri: muri.join(prefix, attribute.id),
            reference: attribute,
            kind: Kind.Attribute,
        };
        return {
            ...meta,
            inner: createNew(meta),
            children: [],
        };
    };

    static fromAttributesWithCallback = <T>(
        attributes: Attribute[],
        prefix: string,
        createNew: CreateNew<T>
    ): Node<T> => {
        const meta = {
            uri: muri.pushAttributeFolder(prefix),
            reference: attributes,
            kind: Kind.Attributes,
        };
        return {
            ...meta,
            inner: createNew(meta),
            children: attributes.map((a) =>
                Builder.fromAttributeWithCallback(a, meta.uri, createNew)
            ),
        };
    };

    static intoInner = <T>(
        node: Node<T>,
        setChildren: (inner: T, children: T[]) => void
    ): T => {
        const inner = node.inner;
        if (node.children.length)
            setChildren(
                inner,
                node.children.map((n) => Builder.intoInner(n, setChildren))
            );

        return inner;
    };

    static clone = <T>(node: Node<T>, innerClone: (t: T) => T): Node<T> => {
        const copy = { ...node, inner: innerClone(node.inner) };
        if (node.children)
            copy.children = node.children.map((n) =>
                Builder.clone(n, innerClone)
            );
        return copy;
    };

    // Clone the node while converting the inner type.
    // filter callback is not applied to the root node.
    static cloneInto = <T, U>(
        node: Node<T>,
        into: (t: Node<T>) => U,
        filter?: (node: Node<T>) => boolean
    ): Node<U> => {
        const children = node.children.length
            ? node.children
                .filter((n) => (filter ? filter(n) : true))
                .map((n) => Builder.cloneInto(n, into, filter))
            : ([] as Node<U>[]);
        return {
            ...node,
            inner: into(node),
            children,
        } as Node<U>;
    };

    // A hollow clone is a Node with a null object as generic T.
    static hollowClone = <T>(
        node: Node<T>,
        filter: (node: Node<T>) => boolean
    ): Node<any> => Builder.cloneInto(node, (t: Node<T>) => null, filter);

    static findByURI = <T>(node: Node<T>, uri: string): Node<T> | undefined => {
        if (node.uri === uri) return node;

        const match = node.children.find((n) => muri.isAncestorOf(n.uri, uri));
        return match && Builder.findByURI(match, uri);
    };

    // Post order traversal
    static traversePostOrder = <T>(
        node: Node<T>,
        traverse: (node: Node<T>) => void
    ) => {
        if (node.children.length > 0)
            node.children.forEach((n) =>
                Builder.traversePostOrder(n, traverse)
            );
        traverse(node);
    };

    // Pre order traversal
    static traversePreOrder = <T>(
        node: Node<T>,
        traverse: (node: Node<T>) => void
    ) => {
        traverse(node);
        if (node.children.length > 0)
            node.children.forEach((n) => Builder.traversePreOrder(n, traverse));
    };

    // Sanitize by removing entities with no children
    static sanitize = <T>(
        root: Node<T>
    ) => {
        Builder.traversePreOrder(root, (node) => {
            for (let i = node.children.length - 1; i >= 0; i--) {
                if (node.children[i].kind === Kind.Entity) {
                    if (node.children[i].children.length === 0)
                        node.children.splice(i, 1);
                }
            }
        });
    }
}
