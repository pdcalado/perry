// We use custom URIs to address the selected attributes and entities.
// The following format denotes the key of an entity related to the first one:
// `<entity_urn>/<other_entity_urn>`
// Deeper nesting can be used:
// `<entity_urn>/<other_entity_urn>/<yet_another_entity>`
// The dot '.' is used to identify the attributes:
// `entity-a/entity-b/./created_at`
// which is the key for the attribute `created_at` from the entity `entity-b`
// as a relation of `entity-a`.

const ATTR_DELIM = ".";
const URN_SEP = "/";

export const isAttribute = (uri: string): boolean =>
    uri.lastIndexOf(ATTR_DELIM) === uri.lastIndexOf(URN_SEP) - 1;

export const isAttributeFolder = (uri: string): boolean =>
    uri.endsWith(ATTR_DELIM);

export const basename = (uri: string): string =>
    uri.slice(uri.lastIndexOf(URN_SEP) + 1);

export const depth = (uri: string): number => uri.split(URN_SEP).length;

export const join = (...args: string[]): string =>
    args[0].length ? args.join(URN_SEP) : args.slice(1).join(URN_SEP);

export const split = (uri: string): string[] => uri.split(URN_SEP);

export const pushAttribute = (uri: string, attribute: string): string =>
    join(uri, ATTR_DELIM, attribute);

export const pushAttributeFolder = (uri: string): string =>
    join(uri, ATTR_DELIM);

// A URI can be drilled if it is not a root node
export const isDrillable = (uri: string): boolean =>
    !isAttribute(uri) && !isAttributeFolder(uri) && depth(uri) > 1;

export const isDescendantOf = (uri: string, ancestor: string): boolean =>
    uri.startsWith(ancestor);
export const isAncestorOf = (uri: string, descendant: string): boolean =>
    isDescendantOf(descendant, uri);

export const getParent = (uri: string): string => {
    const lastIndex = uri.lastIndexOf(URN_SEP);
    return lastIndex < 0 ? "" : uri.slice(0, lastIndex);
};

export const notFolder = (uri: string): string =>
    isAttribute(uri)
        ? getParent(getParent(uri))
        : isAttributeFolder(uri)
            ? getParent(uri)
            : uri;

// The deepest URN is the right most URN and should be an entity or relation.
export const deepestUrn = (uri: string): string => basename(notFolder(uri));

// Remove the root folder of the path
export const popRoot = (uri: string): string => {
    const index = uri.indexOf(URN_SEP);
    return index < 0 ? "" : uri.slice(index + 1);
};

export const getAncestors = (uri: string): string[] => {
    const ancestors: string[] = [];
    let parent = uri;
    while (depth(parent) > 1) {
        parent = getParent(parent);
        ancestors.push(parent);
    }
    return ancestors;
};
