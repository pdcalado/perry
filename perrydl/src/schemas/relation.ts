import Ajv from "ajv";
import {
    CardinalitySchema,
    Cardinality,
    BaseSpecSchema,
    BaseSpecType,
    BaseSpec,
} from "./common";

// EntitySpec schema in json-schema format
export const RelationSpecSchema = {
    type: "object",
    properties: {
        ...BaseSpecSchema.properties,
        origin: { type: "string" },
        destination: { type: "string" },
        cardinality: CardinalitySchema as object,
    },
    required: [
        ...BaseSpecSchema.required,
        "origin",
        "destination",
        "cardinality",
    ],
};

export enum RelationSide {
    ManyToOne,
    OneToMany,
    ManyToMany,
}

const ajv = new Ajv();
const validateArray = ajv.compile({ type: "array", items: RelationSpecSchema });

export type RelationSpecType = BaseSpecType & {
    origin: string;
    destination: string;
    cardinality: Cardinality;
};

// Cast an array of RelationSpecs
export const castRelations = (items: object[]): RelationSpec[] => {
    const valid = validateArray(items);
    if (!valid) throw new Error(JSON.stringify(validateArray.errors));

    return (items as RelationSpecType[]).map((item) => new RelationSpec(item));
};

// RelationSpec class
export class RelationSpec extends BaseSpec {
    constructor(inner: RelationSpecType) {
        super(inner as BaseSpecType);
        // keep inner object for later use
        this.relation = inner;
    }

    private relation: RelationSpecType;

    // Basic getters
    getOrigin = (): string => this.relation.origin;
    getDestination = (): string => this.relation.destination;
    getCardinality = (): Cardinality => this.relation.cardinality;

    // Computes the relation side for the given entity URN.
    // NOTE: Returns undefined if the URN is on neither side of the relation.
    getSide = (urn: string): RelationSide | undefined => {
        const isOrigin = this.getOrigin() === urn;
        const isDestination = this.getDestination() === urn;
        if (!isOrigin && !isDestination) return undefined;

        switch (this.getCardinality()) {
            case Cardinality.OneToMany:
                return isOrigin
                    ? RelationSide.OneToMany
                    : RelationSide.ManyToOne;
            case Cardinality.ManyToMany:
                return RelationSide.ManyToMany;
        }
    };
}
