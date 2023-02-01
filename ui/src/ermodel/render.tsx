import { MetaTableColumns, MetaTableCells } from "components";
import { DataObject, EntitySpec, Attribute } from "perrydl";
import { columnsFromAttributes } from "./utils";

export interface RenderAsTable {
    columns: (attributes?: Attribute[]) => MetaTableColumns;
    row: (item: DataObject) => MetaTableCells;
}

class RenderAnyAsTable {
    private attributes: Attribute[];

    constructor(entity: EntitySpec) {
        this.attributes = entity.getCustomAttributes();
    }

    public columns = (attributes?: Attribute[]) => {
        return columnsFromAttributes(attributes || this.attributes);
    };

    public row = (item: DataObject) => ({ ...item }) as MetaTableCells;
}

export const renderEntityAsTable = (entity: EntitySpec): RenderAsTable => {
    return new RenderAnyAsTable(entity);
};
