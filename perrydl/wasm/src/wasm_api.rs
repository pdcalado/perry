use crate::entity::Entity;
use crate::error::{Error, Result};
use crate::json_schema::GenerateSchema;
use crate::model::Model as LibModel;
use crate::relation::Relation;
use crate::sql;
use inflector::Inflector;
use serde::Deserialize;
use wasm_bindgen::JsValue;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

use wasm_bindgen::prelude::*;

impl From<Error> for JsValue {
    fn from(err: Error) -> JsValue {
        JsValue::from_str(&err.to_string())
    }
}

fn gen_schema<T>(payload: JsValue) -> Result<JsValue>
where
    T: for<'a> Deserialize<'a>,
    T: GenerateSchema,
{
    let obj: T = payload.into_serde()?;
    let schema = obj.json_schema_with_url("")?;
    let js_value = JsValue::from_serde(&schema)?;
    Ok(js_value)
}

type JsResult<T> = std::result::Result<T, JsValue>;

/// Generate json-schema for an Entity.
/// Exported to JS.
#[wasm_bindgen(catch)]
pub fn generate_entity_schema(payload: JsValue) -> JsResult<JsValue> {
    Ok(gen_schema::<Entity>(payload)?)
}

/// Generate json-schema for an Entity.
/// Exported to JS.
#[wasm_bindgen(catch)]
pub fn generate_relation_schema(payload: JsValue) -> JsResult<JsValue> {
    Ok(gen_schema::<Relation>(payload)?)
}

/// Format a type name for GraphQL schema.
#[wasm_bindgen(js_name = "graphqlFormatTypeName")]
pub fn graphql_format_type_name(name: &str) -> JsValue {
    // conversion from string will never panic
    JsValue::from_serde(&name.to_pascal_case()).unwrap()
}

/// Format a field name for GraphQL schema.
#[wasm_bindgen(js_name = "graphqlFormatFieldName")]
pub fn graphql_format_field_name(name: &str) -> JsValue {
    // conversion from string will never panic
    JsValue::from_serde(&name.to_snake_case()).unwrap()
}

/// Model interface to be used by JS
#[wasm_bindgen]
pub struct Model {
    inner: LibModel,
}

fn model_from_object(payload: JsValue) -> Result<Model> {
    let inner: LibModel = LibModel::new(payload.into_serde()?)?;
    Ok(Model { inner })
}

#[wasm_bindgen]
impl Model {
    #[wasm_bindgen(catch)]
    pub fn from_object(payload: JsValue) -> JsResult<Model> {
        let model = model_from_object(payload)?;
        Ok(model)
    }

    pub fn to_sql(&self) -> String {
        use sql::GenerateSql;
        self.inner.generate_sql().join("\n")
    }

    #[wasm_bindgen(catch)]
    pub fn singular(&self, text: &str) -> JsResult<String> {
        let res = self.inner.get_singular(text)?;
        Ok(res.to_string())
    }

    #[wasm_bindgen(catch)]
    pub fn plural(&self, text: &str) -> JsResult<String> {
        let res = self.inner.get_plural(text)?;
        Ok(res.to_string())
    }

    #[wasm_bindgen(js_name = "sqlIsRelationTable")]
    pub fn sql_is_relation_table(&self, name: &str) -> bool {
        self.inner.is_relation_table(name)
    }

    #[wasm_bindgen(js_name = "sqlTableNames")]
    pub fn sql_table_names(&self) -> JsValue {
        JsValue::from_serde(&self.inner.table_names()).unwrap()
    }

    #[wasm_bindgen(js_name = "tableUniqueAttributes")]
    pub fn table_unique_attributes(&self, name: &str) -> JsValue {
        let opt = self.inner.table_unique_attributes(name);
        if let Some(value) = opt {
            JsValue::from_serde(&value).unwrap()
        } else {
            JsValue::null()
        }
    }
}
