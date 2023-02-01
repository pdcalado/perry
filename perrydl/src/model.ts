import { EntitySpec, RelationSpec, ModelSpec, ModelBase } from "./schemas";

// A model containing all entities and relations
export class Model {
    constructor(inner: ModelSpec) {
        this.entities = new Map(inner.entities.map((o) => [o.getUrn(), o]));
        this.relations = new Map(inner.relations.map((o) => [o.getUrn(), o]));

        // Verify that all relations have existing entities
        this.relations.forEach((relation) => {
            if (
                !this.entities.get(relation.getOrigin()) ||
                !this.entities.get(relation.getDestination())
            )
                throw new Error(
                    `entity(ies) of relation ${relation.getId()} not found`
                );
        });

        this.relationsByEntity = new Map(
            inner.entities.map((entity) => [
                entity.getUrn(),
                inner.relations
                    .filter(
                        (relation) =>
                            relation.getOrigin() === entity.getUrn() ||
                            relation.getDestination() === entity.getUrn()
                    )
                    .map((relation) => relation.getUrn()),
            ])
        );

        this.base = inner as ModelBase;
    }

    private entities: Map<string, EntitySpec>;
    private relations: Map<string, RelationSpec>;
    private relationsByEntity: Map<string, string[]>;
    private base: ModelBase;

    findEntityByUrn = (urn: string): EntitySpec | undefined => {
        return this.entities.get(urn);
    };

    findRelationByUrn = (urn: string): RelationSpec | undefined => {
        return this.relations.get(urn);
    };

    getEntities = (): EntitySpec[] => Array.from(this.entities.values());

    getRelations = (): RelationSpec[] => Array.from(this.relations.values());

    getBase = (): ModelBase => this.base;

    getTenant = () => this.base.tenant;

    getRelatedEntity = (
        entityUrn: string,
        relationUrn: string
    ): EntitySpec | undefined => {
        let relation = this.findRelationByUrn(relationUrn);
        if (!relation) return undefined;
        if (relation.getOrigin() === entityUrn)
            return this.findEntityByUrn(relation.getDestination());
        if (relation.getDestination() === entityUrn)
            return this.findEntityByUrn(relation.getOrigin());
        return undefined;
    };

    getRelationsOfEntity = (entityUrn: string): string[] =>
        this.relationsByEntity.get(entityUrn) || [];

    getRelationsBetween = (entityUrnA: string, entityUrnB: string): string[] =>
        this.getRelationsOfEntity(entityUrnA)
            .filter(relationUrn =>
                this.findRelationByUrn(relationUrn)?.getSide(entityUrnB) !== undefined
            );
}
