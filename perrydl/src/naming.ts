import { EntitySpec } from "./schemas";
import camelCase from "camelcase";
import { snakeCase } from "snake-case";

const pascalCase = (text: string) => {
    const cameled = camelCase(text);
    return cameled.substr(0, 1).toUpperCase() + cameled.substr(1);
};

export const graphqlFormatTypeName = (text: string): string => pascalCase(text);
export const graphqlFormatFieldName = (text: string): string => snakeCase(text);

export const graphqlEntityTypeName = (entity: EntitySpec): string => graphqlFormatTypeName(entity.getSingular());
