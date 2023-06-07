use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::db::project::{DBIter, Database, Error, FromRow, Result};

/// Data object for a criminal.
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Default))]
pub struct Criminal {
    pub account: String,
    pub kind: String,
    pub accuser: String,
    pub police_consultant: String,
    pub lawyer_culprit: String,
    pub lawyer_accuser: String,
    pub facts: String,
    pub time_of_crime: String,
    pub location_of_crime: String,
    pub note: String,
    pub verdict: String,
}

impl Criminal {
    pub fn is_valid(&self) -> bool {
        !self.account.trim().is_empty()
            && self.account.starts_with(char::is_alphabetic)
            && !self.kind.trim().is_empty()
            && self.kind.starts_with(char::is_alphabetic)
    }
}

impl FromRow for Criminal {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Criminal> {
        Ok(Criminal {
            account: row.get("account")?,
            kind: row.get("kind")?,
            accuser: row.get("accuser")?,
            police_consultant: row.get("police_consultant")?,
            lawyer_culprit: row.get("lawyer_culprit")?,
            lawyer_accuser: row.get("lawyer_accuser")?,
            facts: row.get("facts")?,
            time_of_crime: row.get("time_of_crime")?,
            location_of_crime: row.get("location_of_crime")?,
            note: row.get("note")?,
            verdict: row.get("verdict")?,
        })
    }
}

/// Returns the criminal with the given `account`.
pub fn fetch(db: &Database, account: &str, kind: &str) -> Result<Criminal> {
    Ok(db.con.query_row(
        "select \
        account, \
        kind, \
        accuser, \
        police_consultant, \
        lawyer_culprit, \
        lawyer_accuser, \
        facts, \
        time_of_crime, \
        location_of_crime, \
        note, \
        verdict \
        \
        from criminal \
        where account=?",
        rusqlite::params![account, kind],
        Criminal::from_row,
    )?)
}

/// Returns all kinds from the criminal table without duplicates
pub fn all_kinds(db: &Database) -> Result<Vec<String>> {
    let mut stmt = db.con.prepare(
        "select \
        kind \
        from criminal \
        order by kind",
    )?;

    let mut rows = stmt.query([])?;
    let mut kinds = Vec::new();
    let mut seen_kinds = HashSet::new();

    while let Some(row) = rows.next()? {
        let kind: String = row.get(0).unwrap();

        // Check if the kind has already been seen
        if seen_kinds.contains(&kind) {
            continue; // Skip the duplicate kind
        }

        kinds.push(kind.clone());
        seen_kinds.insert(kind);
    }

    Ok(kinds)
}

/// Parameters for the advanced search
///
/// Adding the '%' char allows every number of every character in this place
#[derive(Debug, Clone, Default)]
pub struct CriminalSearch<'a> {
    pub name: &'a str,
    pub kind: &'a str,
}

impl<'a> CriminalSearch<'a> {
    pub fn new(name: &'a str, kind: &'a str) -> CriminalSearch<'a> {
        Self { name, kind }
    }
}

/// Performes a simple criminal search with the given `text`. Only Searching on account and kind.
pub fn search(db: &Database, params: CriminalSearch, offset: usize) -> Result<Vec<Criminal>> {
    let mut stmt = db.con.prepare(
        "select \
        account, \
        kind, \
        accuser, \
        police_consultant, \
        lawyer_culprit, \
        lawyer_accuser, \
        facts, \
        time_of_crime, \
        location_of_crime, \
        note, \
        verdict \
        \
        from criminal \
        where (account like '%'||?1||'%' \
            or accuser like '%'||?1||'%' \
            or police_consultant like '%'||?1||'%' \
            or lawyer_culprit like '%'||?1||'%' \
            or lawyer_accuser like '%'||?1||'%') \
        and kind like ?2 \
        order by account
        limit 200 offset ?3",
    )?;
    let rows = stmt.query(rusqlite::params![
        params.name.trim(),
        params.kind.trim(),
        offset
    ])?;
    DBIter::new(rows).collect()
}

/// Adds a new criminal.
pub fn add(db: &Database, criminal: &Criminal) -> Result<()> {
    if !criminal.is_valid() {
        return Err(Error::InvalidCriminal);
    }
    db.con.execute(
        "INSERT INTO criminal VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            criminal.account.trim(),
            criminal.kind.trim(),
            criminal.accuser.trim(),
            criminal.police_consultant.trim(),
            criminal.lawyer_culprit.trim(),
            criminal.lawyer_accuser.trim(),
            criminal.facts.trim(),
            criminal.time_of_crime.trim(),
            criminal.location_of_crime.trim(),
            criminal.note.trim(),
            criminal.verdict.trim(),
        ],
    )?;
    Ok(())
}

/// Updates the criminal.
/// This includes all its data.
pub fn update(
    db: &Database,
    previous_account: &str,
    previous_kind: &str,
    criminal: &Criminal,
) -> Result<()> {
    let previous_account = previous_account.trim();
    if previous_account.is_empty() || !criminal.is_valid() {
        return Err(Error::InvalidCriminal);
    }
    let previous_kind = previous_kind.trim();
    if previous_kind.is_empty() {
        return Err(Error::InvalidKind);
    }

    let transaction = db.transaction()?;
    // update date
    transaction.execute(
        "update criminal set account=?, kind=?, accuser=?, police_consultant=?, lawyer_culprit=?, lawyer_accuser=?, facts=?, time_of_crime=?, location_of_crime=?, note=?, verdict=? where account=? and kind=?",
        rusqlite::params![
            criminal.account.trim(),
            criminal.kind.trim(),
            criminal.accuser.trim(),
            criminal.police_consultant.trim(),
            criminal.lawyer_culprit.trim(),
            criminal.lawyer_accuser.trim(),
            criminal.facts.trim(),
            criminal.time_of_crime.trim(),
            criminal.location_of_crime.trim(),
            criminal.note.trim(),
            criminal.verdict.trim(),
            previous_account,
            previous_kind
        ],
    )?;

    transaction.commit()?;
    Ok(())
}

/// Deletes the criminal.
/// This includes all its data.
pub fn delete(db: &Database, account: &str, kind: &str) -> Result<()> {
    let account = account.trim();
    if account.is_empty() {
        return Err(Error::InvalidCriminal);
    }
    let kind = kind.trim();
    if kind.is_empty() {
        return Err(Error::InvalidKind);
    }
    let transaction = db.transaction()?;
    // remove date and presenters
    transaction.execute(
        "delete from criminal where account=? and kind=?",
        rusqlite::params![account, kind],
    )?;
    transaction.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::db::criminal::{self, Criminal};
    use crate::db::project::{create, Database};
    #[test]
    fn add_update_remove_criminal() {
        let db = Database::memory().unwrap();
        create(&db).unwrap();

        let criminal = Criminal {
            account: "foo".to_string(),
            kind: "Destroy".to_string(),
            accuser: "bar".to_string(),
            police_consultant: "baz".to_string(),
            lawyer_culprit: "bay".to_string(),
            lawyer_accuser: "nay".to_string(),
            facts: "none".to_string(),
            time_of_crime: "3pm".to_string(),
            location_of_crime: "nowhere".to_string(),
            note: "yes!".to_string(),
            verdict: "definitely guilty".to_string(),
        };
        criminal::add(&db, &criminal).unwrap();

        let result = criminal::search(&db, criminal::CriminalSearch::new("%", "%"), 0).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], criminal);

        criminal::update(
            &db,
            &criminal.account,
            &criminal.kind,
            &Criminal {
                facts: "some".to_string(),
                ..criminal.clone()
            },
        )
        .unwrap();
        let result = criminal::search(&db, criminal::CriminalSearch::new("%", "%"), 0).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].facts, "some".to_string());

        criminal::delete(&db, &criminal.account, &criminal.kind).unwrap();
        let result = criminal::search(&db, criminal::CriminalSearch::new("%", "%"), 0).unwrap();
        assert_eq!(result.len(), 0);
    }
}
