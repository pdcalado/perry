import Ajv from "ajv";

export const ID_FIELD = "id";
export const CREATED_AT_FIELD = "created_at";
export const UPDATED_AT_FIELD = "updated_at";

// Define auxiliary methods
const regexOr = (keys: string[]): string => {
    return "(" + keys.map((s) => `^${s}$`).join("|") + ")";
};

// Define types
export enum Visibility {
    Global = "Global",
    Tenant = "Tenant",
    User = "User",
}
export enum Cardinality {
    OneToMany = "OneToMany",
    ManyToMany = "ManyToMany",
}

export enum TypeOfAttribute {
    String = "string",
    Integer = "integer",
    Real = "real",
    Bool = "bool",
    Timestamp = "timestamp",
}

export type Attribute = {
    id: string;
    name: string;
    description: string;
    required: boolean;
    unique: boolean;
    type: TypeOfAttribute;
};

export const attributeIsText = (a: Attribute): boolean =>
    a.type === TypeOfAttribute.String;
export const isCommonAttribute = (id: string): boolean =>
    id === ID_FIELD || id === CREATED_AT_FIELD || id === UPDATED_AT_FIELD;

export const CommonAttributes = [
    {
        id: ID_FIELD,
        name: "ID",
        description: "Database unique identifier",
        required: true,
        unique: true,
        type: TypeOfAttribute.Integer,
    },
    {
        id: CREATED_AT_FIELD,
        name: "Created At",
        description: "Database creation timestamp",
        required: false,
        unique: false,
        type: TypeOfAttribute.Timestamp,
    },
    {
        id: UPDATED_AT_FIELD,
        name: "Updated At",
        description: "Database update timestamp",
        required: false,
        unique: false,
        type: TypeOfAttribute.Timestamp,
    },
];

// Define schemas in json-schema format
export const AttributeSchema = {
    type: "object",
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        required: { type: "boolean" },
        unique: { type: "boolean" },
        type: {
            type: "string",
            pattern: regexOr(Object.values(TypeOfAttribute)),
        },
    },
    required: ["id", "name", "type"],
};
export const VersionSchema = {
    type: "string",
    pattern: "^(([0-9]+)\\.([0-9]+)\\.([0-9]+))$",
};
export const VisibilitySchema = {
    type: "string",
    pattern: regexOr(Object.values(Visibility)),
};
export const SchemaValidation = {
    type: "object",
    properties: {
        type: {
            type: "string",
            pattern: "(yup|json-schema)",
        },
        schema: { type: "object" },
    },
    required: ["type", "schema"],
};
export const CardinalitySchema = {
    type: "string",
    pattern: regexOr(Object.values(Cardinality)),
};

export const BaseSpecSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        urn: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        attributes: { type: "array", items: AttributeSchema as object },
        visibility: VisibilitySchema as object,
        schema: { type: "object" },
    },
    required: [
        "id",
        "urn",
        "name",
        "description",
        "attributes",
        "visibility",
        "schema",
    ],
};

// BaseSpecType type for EntitySpecType/RelationSpecType
export type BaseSpecType = {
    id: number;
    urn: string;
    name: string;
    description: string;
    attributes: Attribute[];
    visibility: Visibility;
    schema: object;
};

const ajv = new Ajv();

// Base class for EntitySpec/RelationSpec
export class BaseSpec {
    private inner: BaseSpecType;
    private validateArray: Ajv.ValidateFunction;
    private attributeById: Map<string, Attribute>;

    constructor(inner: BaseSpecType) {
        this.inner = inner;

        // Create schema validators for this entity/relation
        this.validateArray = ajv.compile({
            type: "array",
            items: this.inner.schema,
        });

        this.attributeById = new Map([...inner.attributes, ...CommonAttributes].map(a => [a.id, a]));
    }

    getId = (): number => this.inner.id;
    getUrn = (): string => this.inner.urn;
    getName = (): string => this.inner.name;
    getDescription = (): string => this.inner.description;
    getCustomAttributes = () => this.inner.attributes;
    getNaturalKey = (): string => {
        const firstUnique = this.inner.attributes.find((o) => o.unique);
        return firstUnique ? firstUnique.id : ID_FIELD;
    };
    getTextAttributes = () =>
        this.inner.attributes.filter(attributeIsText);
    getAttributesWithId = () => [
        ID_FIELD,
        ...this.inner.attributes.map((a) => a.id),
    ];
    getSchema = (): object => this.inner.schema;

    findAttributeById = (id: string): Attribute | undefined => this.attributeById.get(id);

    // Basic conversion to string.
    toString = () => JSON.stringify(this.inner, null, 2);

    // Validate but don't throw exception
    validateWithErrors = (objects: object[]) => {
        const valid = this.validateArray(objects);
        if (!valid) {
            return Object.assign([], this.validateArray.errors);
        }
        return undefined;
    };

    // Throw exception on failed validation of array of entity/relation objects
    validate = (objects: object[]) => {
        const errors = this.validateWithErrors(objects);
        if (errors) {
            throw new Error(
                `bad object: ( ${JSON.stringify(objects)} ): ` +
                JSON.stringify(errors)
            );
        }
    };
}

export type DataPrimitive = null | undefined | boolean | string | number | Date;
export type DataAny =
    | DataPrimitive
    | DataPrimitive[]
    | DataObject
    | DataObject[];

// Every object of an entity type must comply with this interface.
export interface DataObject {
    id: number;
    created_at?: Date;
    updated_at?: Date;
    [key: string]: DataAny;
}
