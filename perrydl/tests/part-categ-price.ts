export default {
    model: `{
"id": 1,
    "rev": 1,
        "created_at": 1592913585000,
            "updated_at": 1592913585000,
                "tenant": "sampleperry",
                    "entities": [
                        {
                            "id": 1,
                            "urn": "sampleperry:part",
                            "singular": "part",
                            "plural": "parts",
                            "name": "Auto Part",
                            "description": "An electric or mechanical part",
                            "visibility": "Tenant",
                            "attributes": [
                                {
                                    "id": "label",
                                    "name": "Label",
                                    "description": "Unique label of the part",
                                    "required": true,
                                    "unique": true,
                                    "type": "string"
                                },
                                {
                                    "id": "description",
                                    "name": "Description",
                                    "description": "Description of the part",
                                    "type": "string"
                                },
                                {
                                    "id": "vendor",
                                    "name": "Vendor",
                                    "description": "Vendor or manufacturer of the part",
                                    "type": "string"
                                },
                                {
                                    "id": "purchase_unit",
                                    "name": "Purchased Units",
                                    "description": "Purchase unit notes",
                                    "type": "string"
                                },
                                {
                                    "id": "stock_location",
                                    "name": "Stock Location",
                                    "description": "Location of the stock",
                                    "type": "string"
                                },
                                {
                                    "id": "min_stock",
                                    "name": "Min Stock",
                                    "description": "Minimum stock notes",
                                    "type": "string"
                                },
                                {
                                    "id": "replenishment",
                                    "name": "Replenishment",
                                    "description": "Replenishment needs",
                                    "type": "string"
                                },
                                {
                                    "id": "stock_real",
                                    "name": "Real Stock",
                                    "description": "Number of real units in stock",
                                    "type": "integer"
                                },
                                {
                                    "id": "barcode",
                                    "name": "Barcode",
                                    "description": "Barcode notes",
                                    "type": "string"
                                },
                                {
                                    "id": "consummable",
                                    "name": "Consummable",
                                    "description": "Notes about consummables",
                                    "type": "string"
                                }
                            ],
                            "schema": {
                                "$id": "sampleperry:part",
                                "$schema": "http://json-schema.org/draft-07/schema#",
                                "properties": {
                                    "barcode": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "consummable": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "description": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "label": {
                                        "type": "string"
                                    },
                                    "min_stock": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "purchase_unit": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "replenishment": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "stock_location": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "stock_real": {
                                        "type": [
                                            "integer",
                                            "null"
                                        ]
                                    },
                                    "vendor": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    }
                                },
                                "required": [
                                    "label"
                                ]
                            }
                        },
                        {
                            "id": 2,
                            "urn": "sampleperry:category",
                            "name": "Part Category",
                            "singular": "category",
                            "plural": "categories",
                            "description": "Category of parts",
                            "visibility": "Tenant",
                            "attributes": [
                                {
                                    "id": "name",
                                    "name": "Name",
                                    "description": "Name of the category",
                                    "required": true,
                                    "unique": true,
                                    "type": "string"
                                },
                                {
                                    "id": "description",
                                    "name": "Description",
                                    "description": "Description of the category",
                                    "type": "string"
                                }
                            ],
                            "schema": {
                                "$id": "sampleperry:category",
                                "$schema": "http://json-schema.org/draft-07/schema#",
                                "properties": {
                                    "description": {
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    "name": {
                                        "type": "string"
                                    }
                                },
                                "required": [
                                    "name"
                                ]
                            }
                        },
                        {
                            "id": 3,
                            "urn": "sampleperry:price",
                            "singular": "price",
                            "plural": "prices",
                            "name": "Price",
                            "description": "A part's price",
                            "visibility": "Tenant",
                            "attributes": [
                                {
                                    "id": "value",
                                    "name": "Value",
                                    "required": true,
                                    "type": "real"
                                }
                            ],
                            "schema": {
                                "$id": "sampleperry:price",
                                "$schema": "http://json-schema.org/draft-07/schema#",
                                "properties": {
                                    "value": {
                                        "type": "number"
                                    }
                                },
                                "required": [
                                    "value"
                                ]
                            }
                        }
                    ],
                        "relations": [
                            {
                                "id": 1,
                                "urn": "sampleperry:categorizedby",
                                "name": "Categorized By",
                                "description": "Relates parts with categories",
                                "attributes": [],
                                "visibility": "Tenant",
                                "origin": "sampleperry:part",
                                "destination": "sampleperry:category",
                                "cardinality": "ManyToMany",
                                "schema": {
                                    "$id": "sampleperry:categorizedby",
                                    "$schema": "http://json-schema.org/draft-07/schema#",
                                    "properties": {
                                        "category_id": {
                                            "type": "string"
                                        },
                                        "part_id": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "part_id",
                                        "category_id"
                                    ]
                                }
                            },
                            {
                                "id": 2,
                                "urn": "sampleperry:pricedby",
                                "name": "Priced By",
                                "description": "Priced of a part relation",
                                "visibility": "Tenant",
                                "origin": "sampleperry:part",
                                "destination": "sampleperry:price",
                                "cardinality": "OneToMany",
                                "attributes": [],
                                "schema": {
                                    "$id": "sampleperry:pricedby",
                                    "$schema": "http://json-schema.org/draft-07/schema#",
                                    "properties": {
                                        "part_id": {
                                            "type": "string"
                                        },
                                        "price_id": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "part_id",
                                        "price_id"
                                    ]
                                }
                            }
                        ]
  }`,
    parts: `[
    {
        "id": 1,
        "label": "A9N18358",
        "description": "C120N 1P C100A",
        "stock_real": 0
      },
      {
        "id": 2,
        "label": "A9N18380",
        "description": "C120N 1P D100A",
        "stock_real": 0
      },
      {
        "id": 3,
        "label": "A9F85110",
        "description": "Circuit Breaker IC60H 1P 10A D 10kA",
        "stock_real": 0
      },
      {
        "id": 4,
        "label": "A9F83113",
        "description": "Circuit Breaker IC60H 1P 13A B 10kA",
        "stock_real": 0
      }
  ]`
};