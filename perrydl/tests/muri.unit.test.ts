import { muri } from "../src";

const {
    isAttribute,
    isAttributeFolder,
    depth,
    getAncestors,
    basename,
    notFolder,
    getParent,
    join,
    popRoot,
    split,
    pushAttribute,
    pushAttributeFolder,
    isDrillable,
    isDescendantOf,
    isAncestorOf,
    deepestUrn,
} = muri;

const ATTR_DELIM = ".";
const URN_SEP = "/";
describe("Test muri", () => {
    it("Test isAttribute", () => {
        expect(isAttribute("sampleperry:part/./name")).toBe(true);
        expect(isAttribute("sampleperry:part/.")).toBe(false);
        expect(isAttribute("sampleperry:part")).toBe(false);
        expect(isAttribute("sampleperry:part/sampleperry:price")).toBe(false);
        expect(isAttribute("sampleperry:part/sampleperry:price//sampleperry:currency")).toBe(false);
    });
    it("Test isAttributeFolder", () => {
        expect(isAttributeFolder(getParent("sampleperry:part/./name"))).toBe(true);
        expect(isAttributeFolder(getParent("sampleperry:part/."))).toBe(false);
        expect(isAttributeFolder(getParent("sampleperry:part"))).toBe(false);
        expect(isAttributeFolder("sampleperry:part/sampleperry:price")).toBe(false);
        expect(isAttributeFolder("sampleperry:part//sampleperry:price/sampleperry:currency")).toBe(false);
    });
    it("Test basename", () => {
        expect(basename("sampleperry:part/./name")).toBe("name");
        expect(basename("sampleperry:part/.")).toBe(".");
        expect(basename("sampleperry:part")).toBe("sampleperry:part");
        expect(basename("sampleperry:part/sampleperry:price")).toBe("sampleperry:price");
        expect(basename("sampleperry:part/sampleperry:price/sampleperry:currency")).toBe("sampleperry:currency");
        expect(basename("sampleperry:part//sampleperry:price/sampleperry:currency")).toBe("sampleperry:currency");

    });
    it("Test depth", () => {
        expect(depth("sampleperry:part/./name")).toBe(3);
        expect(depth("sampleperry:part/.")).toBe(2);
        expect(depth("sampleperry:part")).toBe(1);
        expect(depth("sampleperry:part/sampleperry:price")).toBe(2);
        expect(depth("sampleperry:part//sampleperry:price/sampleperry:currency")).toBe(4);
    });
    it("Test join", () => {
        expect(join("sampleperry:part", ".", "name")).toBe("sampleperry:part/./name");
        expect(join("sampleperry:part", "sampleperry:price", "sampleperry:currency")).toBe("sampleperry:part/sampleperry:price/sampleperry:currency");
        expect(join("sampleperry:part/", "sampleperry:price", "sampleperry:currency")).toBe("sampleperry:part//sampleperry:price/sampleperry:currency");
        expect(join("", ".", "name")).toBe("./name");

    });
    it("Test split", () => {
        expect(split("sampleperry:part/./name")).toEqual([
            "sampleperry:part",
            ".",
            "name",
        ]);
        expect(split("sampleperry:part/.")).toEqual(["sampleperry:part", "."]);
        expect(split("sampleperry:part")).toEqual(["sampleperry:part"]);
        expect(split("sampleperry:part/sampleperry:price/sampleperry:currency")).toEqual(["sampleperry:part", "sampleperry:price", "sampleperry:currency"]);
    });
    it("Test pushAttribute", () => {
        let uriUsed = [
            "sampleperry:part/./name",
            "sampleperry:part/.",
            "sampleperry:part",
            "sampleperry:part/sampleperry:price/sampleperry:currency",
        ];
        for (let uri of uriUsed) {
            if (!isAttribute(uri) && !isAttributeFolder(uri)) {
                expect(pushAttribute("sampleperry:part", "name")).toBe(
                    "sampleperry:part/./name"
                );
            }
        }
    });
    it("Test pushAttributeFolder", () => {
        const uriUsed = [
            "sampleperry:part/./name",
            "sampleperry:part/.",
            "sampleperry:part",
            "sampleperry:part/sampleperry:price/sampleperry:currency",
        ];
        for (let uri of uriUsed) {
            if (isAttribute(uri) && isAttributeFolder(uri)) {
                expect(pushAttributeFolder("sampleperry:part")).toBe(
                    "sampleperry:part/."
                );
            }
        }
    });
    it("Test isDrillable", () => {
        expect(isDrillable("sampleperry:part/./name")).toBe(false);
        expect(isDrillable("sampleperry:part/.")).toBe(false);
        expect(isDrillable("sampleperry:part")).toBe(false);
        expect(isDrillable("sampleperry:part/sampleperry:price")).toBe(true);
        expect(isDrillable("sampleperry:part/sampleperry:price/sampleperry:currency")).toBe(true);
    });
    it("Test isDescendantOf, isAncestorOf and getParent", () => {
        const uri1 = "sampleperry:part/./name";
        expect(isDescendantOf(uri1, getParent(uri1))).toBe(true);
        expect(isDescendantOf("sampleperry:part/./name", "sampleperry:part")).toBe(
            true
        );
        expect(isDescendantOf("sampleperry:part/.", "sampleperry")).toBe(true);
        expect(isDescendantOf("sampleperry:part/./name", "sampleperry:part")).toBe(
            isAncestorOf("sampleperry:part", "sampleperry:part/./name")
        );
        expect(
            isDescendantOf("sampleperry:part/./name", "sampleperry:part")
        ).not.toBe(isDescendantOf("sampleperry:part", "sampleperry:part/./name"));
        expect(isDescendantOf("sampleperry:part/sampleperry:price", "sampleperry:part")).toBe(true);


    });
    it("Test getParent", () => {
        expect(getParent("sampleperry:part/./name")).toBe("sampleperry:part/.");
        expect(getParent("sampleperry:part/.")).toBe("sampleperry:part");
        expect(getParent("sampleperry:part")).toBe("");
        expect(getParent("sampleperry:part/sampleperry:price")).toBe("sampleperry:part");

    });
    it("Test notFolder", () => {
        expect(notFolder("sampleperry:part/./name")).toBe("sampleperry:part");
        expect(notFolder("sampleperry:part/.")).toBe("sampleperry:part");
        expect(notFolder("sampleperry:part")).toBe("sampleperry:part");
        expect(notFolder("sampleperry:part/sampleperry:price")).toBe("sampleperry:part/sampleperry:price");

    });
    it("Test deepestUrn", () => {
        expect(
            deepestUrn("sampleperry:part/sampleperry:price/sampleperry:currency/./name")
        ).toBe("sampleperry:currency");
        expect(
            deepestUrn("sampleperry:part/sampleperry:price/sampleperry:currency/.")
        ).toBe("sampleperry:currency");
        expect(
            deepestUrn("sampleperry:part/sampleperry:price/sampleperry:currency")
        ).toBe("sampleperry:currency");
        expect(
            deepestUrn("sampleperry:part/sampleperry:price//sampleperry:currency")
        ).toBe("sampleperry:currency");
    });
    it("Test popRoot", () => {
        expect(popRoot("sampleperry:part/./name")).toBe("./name");
        expect(popRoot("sampleperry:part/.")).toBe(".");
        expect(popRoot("sampleperry:part")).toBe("");
        expect(popRoot("sampleperry:part/sampleperry:price/sampleperry:currency")).toBe("sampleperry:price/sampleperry:currency");
    });
    it("Test getAncestors", () => {
        expect(getAncestors("sampleperry:part/./name")).toEqual([
            "sampleperry:part/.",
            "sampleperry:part",
        ]);
        expect(getAncestors("sampleperry:part/.")).toEqual(["sampleperry:part"]);
        expect(getAncestors("sampleperry:part")).toEqual([]);
        expect(getAncestors("sampleperry:part/sampleperry:price/sampleperry:currency")).toEqual(["sampleperry:part/sampleperry:price", "sampleperry:part"]);
    });
});
