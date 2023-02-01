import {
    Attribute,
    RelationSpec,
    EntitySpec,
    RelationSide,
    Model,
    tree,
    QueryParams,
    QueryResponse,
    Resolver,
    WhereClause,
} from "perrydl";
import { MetaTableColumns } from "components";
import { useCallback } from "react";

export const columnsFromAttributes = (
    attributes: Attribute[]
): MetaTableColumns => {
    return attributes.reduce((obj, attribute) => {
        obj[attribute.id] = attribute.name;
        return obj;
    }, {} as MetaTableColumns);
};

export const relatedFieldName = (
    relation: RelationSpec,
    other: EntitySpec
): string => {
    switch (relation.getSide(other.getUrn())) {
        case RelationSide.ManyToMany:
            return other.getPlural();
        case RelationSide.ManyToOne:
            return other.getPlural();
        default:
            return other.getSingular();
    }
};

export const basename = (uri: string): string =>
    uri.slice(uri.lastIndexOf(":") + 1);

/**
 * Create a tree of params for fetching an object with all the fields
 * required by an edit form. This implies fetching default attributes,
 * custom attributes and related
 * @param model Model object
 * @param entity EntitySpec of the object to fetch
 * @param id single or array of unique database id of the object(s)
 */
export const paramsForObjectEdit = (
    model: Model,
    entity: EntitySpec,
    id: number | Array<number>
): tree.Node<QueryParams> => {
    const builder = new tree.Builder(model, () => ({}));
    const root = builder.rootFromEntity(entity.getUrn());
    tree.Builder.traversePostOrder(root, (node: tree.Node<QueryParams>) => {
        if (tree.Kind.Entity === node.kind) {
            builder.drillNode(node);
        }
    });
    // Remove any deep entities without inner nodes
    tree.Builder.sanitize(root);
    tree.Builder.insertDefaultAttributes(root, () => ({}));

    const customWhere = Array.isArray(id) ? { id: { in: id } } : { id };

    root.inner = { customWhere };

    return root;
};

/**
 * Create a tree of params for fetching an object with all the fields
 * required to display it. This implies fetching default attributes and
 * custom attributes only.
 * @param model Model object
 * @param entity EntitySpec of the object to fetch
 * @param where where clause to search for object(s)
 */
export const paramsForObjectDisplay = (
    model: Model,
    entity: EntitySpec,
    where: WhereClause
): tree.Node<QueryParams> => {
    const builder = new tree.Builder(model, () => ({}));
    const root = builder.rootFromEntity(entity.getUrn());

    // Handling exceptions for this entity
    // const mutateParams = defaultDisplayParams[entity.getUrn()];
    // mutateParams && mutateParams(root, builder);

    // Remove any deep entities without inner nodes
    tree.Builder.sanitize(root);
    tree.Builder.insertDefaultAttributes(root, () => ({}));

    root.inner = { customWhere: where };

    return root;
};

/**
 * Possible status of a fetch operation.
 */
export enum FetchStatus {
    Loading,
    Failure,
    Success,
}

/**
 * Type encompassing the possible status of a fetch operation,
 * together with any errors which might have occurred or
 * successful response.
 */
export type ObjectFetch = {
    status: FetchStatus;
    error?: Error;
    response?: QueryResponse;
};

/**
 * A simple wrapper around a request for data objects
 * which prefills the ObjectFetch fields.
 *
 * @param resolver Resolver object from idl library
 * @param params Tree of params for the data request
 */
export const fetchWithStatus = (
    resolver: Resolver,
    params: tree.Node<QueryParams>
): Promise<ObjectFetch> =>
    resolver
        .requestDataObjects({ params })
        .then((queryResponse) => {
            if (queryResponse.getError()) {
                throw queryResponse.getError();
            } else {
                return {
                    status: FetchStatus.Success,
                    response: queryResponse,
                };
            }
        })
        .catch((error) => {
            console.log("caught here");
            return {
                status: FetchStatus.Failure,
                error: new Error(error),
            };
        });

/**
 * Create a callback that will only be called on mount.
 * @param fun the function to be used as the callback.
 */
type Mountable<T> = (...args: any[]) => T;
export const useMountCallback = <T extends unknown>(fun: Mountable<T>) => useCallback(fun, []);