import Ajv from "ajv";
import { EntitySpecSchema, EntitySpec, EntitySpecType } from "./entity";
import { RelationSpecSchema, RelationSpec, RelationSpecType } from "./relation";

export const ModelSpecSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        rev: { type: "integer" },
        tenant: { type: "string" },
        entities: { type: "array", items: EntitySpecSchema as object },
        relations: { type: "array", items: RelationSpecSchema as object },
    },
    required: ["id", "rev", "tenant", "entities", "relations"],
};

type ModelSpecType = {
    id: number;
    rev: number;
    tenant: string;
    entities: EntitySpecType[];
    relations: RelationSpecType[];
};

export type ModelBase = {
    id: number;
    rev: number;
    tenant: string;
};

export type ModelSpec = ModelBase & {
    entities: EntitySpec[];
    relations: RelationSpec[];
};

const ajv = new Ajv();
const validate = ajv.compile(ModelSpecSchema);

// Cast an object of ModelSpec
export const castModel = (object: object): ModelSpec => {
    const valid = validate(object);
    if (!valid) throw new Error(JSON.stringify(validate.errors));

    let cast = object as ModelSpecType;

    return {
        id: cast.id,
        rev: cast.rev,
        tenant: cast.tenant,
        entities: cast.entities.map((ent) => new EntitySpec(ent)),
        relations: cast.relations.map((rel) => new RelationSpec(rel)),
    };
};
