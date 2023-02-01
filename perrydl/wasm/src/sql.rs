use std::fmt;

pub const BASE_ID: &str = "id";

pub enum Type {
    Integer,
    Real,
    Text,
    Boolean,
    Date,
}

impl Default for Type {
    fn default() -> Self {
        Type::Integer
    }
}

impl Type {
    fn as_str(&self) -> &str {
        match self {
            &Type::Integer => "INTEGER",
            &Type::Real => "REAL",
            &Type::Text => "TEXT",
            &Type::Boolean => "BOOLEAN",
            &Type::Date => "DATETIME",
        }
    }
}

#[derive(Default)]
pub struct Column {
    pub name: String,
    pub ty: Type,
    pub not_null: bool,
    pub default: Option<String>,
    pub auto_increment: bool,
    pub primary_key: bool,
    pub unique: bool,
}

impl fmt::Display for Column {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut parts: Vec<String> = Vec::new();

        parts.push(self.name.clone());
        parts.push(self.ty.as_str().to_owned());
        if self.primary_key {
            parts.push("PRIMARY KEY".into());
        }
        if self.auto_increment {
            parts.push("AUTOINCREMENT".into());
        }
        if self.unique {
            parts.push("UNIQUE".into());
        }
        if self.default.is_some() {
            let def = self.default.clone().unwrap();
            if def.is_empty() {
                parts.push("DEFAULT".into());
            } else {
                parts.push(format!("DEFAULT {}", def));
            }
        }
        if self.not_null {
            parts.push("NOT NULL".into());
        }

        write!(f, "{}", parts.join(" "))
    }
}

#[derive(Default)]
pub struct ForeignKey {
    pub key: String,
    pub table_name: String,
    pub table_key: String,
    pub on_delete_cascade: bool,
}

impl fmt::Display for ForeignKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let on_del = match self.on_delete_cascade {
            true => " ON DELETE CASCADE",
            false => "",
        };
        write!(
            f,
            "FOREIGN KEY ({}) REFERENCES {} ({}){}",
            self.key, self.table_name, self.table_key, on_del
        )
    }
}

pub struct UniqueConstraint(Vec<String>);

impl UniqueConstraint {
    pub fn new(list: Vec<String>) -> Self {
        UniqueConstraint(list)
    }
}

impl fmt::Display for UniqueConstraint {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "UNIQUE ({})", self.0.join(", "))
    }
}

pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
    pub foreign_keys: Vec<ForeignKey>,
    pub unique_constraints: Vec<UniqueConstraint>,
}

impl fmt::Display for Table {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let inner = self
            .columns
            .iter()
            .map(|c| c.to_string())
            .chain(self.foreign_keys.iter().map(|c| c.to_string()))
            .chain(self.unique_constraints.iter().map(|c| c.to_string()))
            .collect::<Vec<String>>()
            .join(", ");
        write!(f, "CREATE TABLE {}({});", self.name, inner)
    }
}

impl Table {
    pub fn new_base(name: &str) -> Table {
        Table {
            name: name.to_owned(),
            columns: vec![
                Column {
                    name: BASE_ID.to_owned(),
                    ty: Type::Integer,
                    primary_key: true,
                    auto_increment: true,
                    ..Default::default()
                },
                Column {
                    name: "created_at".to_owned(),
                    ty: Type::Date,
                    default: Some("CURRENT_TIMESTAMP".to_owned()),
                    not_null: true,
                    ..Default::default()
                },
                Column {
                    name: "updated_at".to_owned(),
                    ty: Type::Date,
                    default: Some("CURRENT_TIMESTAMP".to_owned()),
                    not_null: true,
                    ..Default::default()
                },
            ],
            foreign_keys: vec![],
            unique_constraints: vec![],
        }
    }
}

pub struct Trigger {
    pub table_name: String,
    pub column: String,
    pub id: String,
    pub value: String,
}

impl fmt::Display for Trigger {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f,
            "CREATE TRIGGER {}_{} AFTER UPDATE ON {} WHEN old.{} < {} BEGIN UPDATE {} SET {} = {} WHERE {} = old.{}; END;",
            self.table_name, self.column, self.table_name, self.column, self.value, self.table_name, self.column, self.value, self.id, self.id)
    }
}

impl Trigger {
    pub fn new_update_trigger(name: &str) -> Trigger {
        Trigger {
            table_name: name.to_owned(),
            column: "updated_at".to_owned(),
            id: BASE_ID.to_owned(),
            value: "CURRENT_TIMESTAMP".to_owned(),
        }
    }
}

pub trait GenerateSql {
    fn generate_sql(&self) -> Vec<String>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sql_trigger() {
        let trigger = Trigger {
            table_name: "categories".into(),
            column: "updated_at".into(),
            id: BASE_ID.into(),
            value: "CURRENT_TIMESTAMP".into(),
        };
        assert_eq!(
            trigger.to_string(),
            "CREATE TRIGGER categories_updated_at AFTER UPDATE ON categories WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;".to_string()
        );
    }

    #[test]
    fn sql_print_column() {
        let column = Column {
            name: BASE_ID.into(),
            ty: Type::Integer,
            not_null: false,
            default: None,
            auto_increment: true,
            primary_key: true,
            unique: false,
        };

        assert_eq!(
            column.to_string(),
            "id INTEGER PRIMARY KEY AUTOINCREMENT".to_string()
        );
    }

    #[test]
    fn sql_print_foreignkey() {
        let foreign_key = ForeignKey {
            key: "category_id".into(),
            table_name: "categories".into(),
            table_key: BASE_ID.into(),
            on_delete_cascade: true,
        };

        assert_eq!(
            foreign_key.to_string(),
            "FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE".to_string()
        );
    }

    #[test]
    fn sql_print_table() {
        let table = Table {
            name: "categories".to_string(),
            columns: vec![
                Column {
                    name: BASE_ID.to_owned(),
                    ty: Type::Integer,
                    primary_key: true,
                    auto_increment: true,
                    ..Default::default()
                },
                Column {
                    name: "created_at".to_owned(),
                    ty: Type::Date,
                    default: Some("CURRENT_TIMESTAMP".to_owned()),
                    not_null: true,
                    ..Default::default()
                },
                Column {
                    name: "updated_at".to_owned(),
                    ty: Type::Date,
                    default: Some("CURRENT_TIMESTAMP".to_owned()),
                    not_null: true,
                    ..Default::default()
                },
                Column {
                    name: "name".to_owned(),
                    ty: Type::Text,
                    unique: true,
                    not_null: true,
                    ..Default::default()
                },
                Column {
                    name: "description".to_owned(),
                    ty: Type::Text,
                    ..Default::default()
                },
            ],
            foreign_keys: Vec::new(),
            unique_constraints: Vec::new(),
        };

        assert_eq!(
            table.to_string(),
            "CREATE TABLE categories(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, name TEXT UNIQUE NOT NULL, description TEXT);"
            .to_string()
        );
    }
}
