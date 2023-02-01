import Ajv from "ajv";
import { BaseSpecType, BaseSpec, BaseSpecSchema } from "./common";

// EntitySpec schema in json-schema format
export const EntitySpecSchema = {
    type: "object",
    properties: {
        ...BaseSpecSchema.properties,
        singular: { type: "string" },
        plural: { type: "string" },
    },
    required: [...BaseSpecSchema.required, "singular", "plural"],
};

const ajv = new Ajv();
const validateArray = ajv.compile({ type: "array", items: EntitySpecSchema });

export type EntitySpecType = BaseSpecType & {
    singular: string;
    plural: string;
};

// Cast an array of EntitySpecs
export const castEntities = (items: object[]): EntitySpec[] => {
    const valid = validateArray(items);
    if (!valid) throw new Error(JSON.stringify(validateArray.errors));

    return (items as EntitySpecType[]).map((item) => new EntitySpec(item));
};

// EntitySpec class
export class EntitySpec extends BaseSpec {
    constructor(inner: EntitySpecType) {
        super(inner as BaseSpecType);
        // keep inner object for later use
        this.entity = inner;
    }

    private entity: EntitySpecType;

    // Basic getters
    getSingular = () => this.entity.singular;
    getPlural = () => this.entity.plural;
}
