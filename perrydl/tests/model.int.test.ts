import { castModel, Model, castEntities, castRelations, ID_FIELD, RelationSide, isCommonAttribute } from "../src";
import TEST_DATA from "./part-categ-price";

const TEST_MODEL = TEST_DATA.model;

test("Testing model spec", () => {
    const payload = JSON.parse(TEST_MODEL as string);
    const modelSpec = castModel(payload);
    expect(modelSpec.id).toBe(1);

    const model = new Model(modelSpec);

    // entity urns
    const invalidEntityUrn = "sampleperry:categorizedby";
    const partUrn = "sampleperry:part";
    const categoryUrn = "sampleperry:category";
    const priceUrn = "sampleperry:price";
    const validEntityUrns = [partUrn, categoryUrn, priceUrn];

    // test valid entity urns
    validEntityUrns.forEach(urn => expect(model.findEntityByUrn(urn)).not.toBe(undefined));
    // test invalid entity urn
    expect(model.findEntityByUrn(invalidEntityUrn)).toBe(undefined);

    // relation urns
    const invalidRelationUrn = "sampleperry:category";
    const categorizedByUrn = "sampleperry:categorizedby";
    const pricedByUrn = "sampleperry:pricedby";
    const validRelationUrns = [categorizedByUrn, pricedByUrn];

    // test valid Relation urns
    validRelationUrns.forEach(urn => expect(model.findRelationByUrn(urn)).not.toBe(undefined));
    // test invalid relation urn
    expect(model.findRelationByUrn(invalidRelationUrn)).toBe(undefined);

    // Check entities and relations
    expect(model.getEntities().map(o => o.getUrn())).toStrictEqual(validEntityUrns);
    expect(model.getRelations().map(o => o.getUrn())).toStrictEqual(validRelationUrns);

    // Test related entities
    expect(model.getRelatedEntity(partUrn, categorizedByUrn).getUrn()).toBe(categoryUrn);
    expect(model.getRelatedEntity(categoryUrn, categorizedByUrn).getUrn()).toBe(partUrn);
    expect(model.getRelatedEntity(categoryUrn, pricedByUrn)?.getUrn()).toBe(undefined);

    // Test relations of entity
    expect(model.getRelationsOfEntity(partUrn)).toStrictEqual([categorizedByUrn, pricedByUrn]);
    expect(model.getRelationsOfEntity(priceUrn)).toStrictEqual([pricedByUrn]);

    // Test relations between entities
    expect(model.getRelationsBetween(partUrn, priceUrn)).toStrictEqual([pricedByUrn]);
});

test("Testing entity", () => {
    const payload = JSON.parse(TEST_MODEL as string);

    const entities = castEntities(payload.entities);
    entities.forEach(entity => {
        expect(entity.getSingular()).not.toBe(entity.getPlural());
    })
});

test("Testing relation", () => {
    const payload = JSON.parse(TEST_MODEL as string);
    const modelSpec = castModel(payload);
    const model = new Model(modelSpec);

    const categorizedByUrn = "sampleperry:categorizedby";
    const pricedByUrn = "sampleperry:pricedby";

    const relations = castRelations(payload.relations);
    relations.forEach(relation => {
        expect(model.findEntityByUrn(relation.getOrigin())).not.toBe(undefined);
        expect(model.findEntityByUrn(relation.getDestination())).not.toBe(undefined);
    });

    expect(model.findRelationByUrn(categorizedByUrn).getSide("sampleperry:part")).toBe(RelationSide.ManyToMany);
    expect(model.findRelationByUrn(categorizedByUrn).getSide("sampleperry:category")).toBe(RelationSide.ManyToMany);
    expect(model.findRelationByUrn(categorizedByUrn).getSide("sampleperry:foo")).toBe(undefined);
    expect(model.findRelationByUrn(pricedByUrn).getSide("sampleperry:price")).toBe(RelationSide.ManyToOne);
    expect(model.findRelationByUrn(pricedByUrn).getSide("sampleperry:part")).toBe(RelationSide.OneToMany);
});

test("Testing attributes", () => {
    const payload = JSON.parse(TEST_MODEL as string);
    const modelSpec = castModel(payload);
    const model = new Model(modelSpec);

    const partUrn = "sampleperry:part";

    const entity = model.findEntityByUrn(partUrn);
    expect(entity.getNaturalKey()).toBe("label");
    expect(entity.getTextAttributes()).toContain(entity.findAttributeById("description"));
    expect(entity.getTextAttributes()).not.toContain(entity.findAttributeById("stock_real"));
    expect(entity.getAttributesWithId()).toContain(ID_FIELD);
    expect(isCommonAttribute(ID_FIELD)).toBe(true);
});

test("Test failing validate objects", () => {
    const payload = JSON.parse(TEST_MODEL as string);
    const modelSpec = castModel(payload);
    const model = new Model(modelSpec);

    const partUrn = "sampleperry:part";

    const entity = model.findEntityByUrn(partUrn);
    expect(() => entity.validate([{ id: 1 }])).toThrowError();
});