pub mod db;
mod server;

use std::{borrow::Cow, path::Path};

use db::project::{fetch_user_data, Database};

use rocket::fairing::{Fairing, Info, Kind};
use rocket::{catch, catchers, routes, Build, Request, Response, Rocket};
use serde_json::json;
use server::{GeneralApiKey, WriteApiKey};
use utoipa::{
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
    Modify, OpenApi,
};
use utoipa_swagger_ui::SwaggerUi;

use crate::server::ServerError;

use chrono::Local;
use std::fs::OpenOptions;
use std::io::Write;

struct SuccessLogger;

#[rocket::async_trait]
impl Fairing for SuccessLogger {
    fn info(&self) -> Info {
        Info {
            name: "Success Logger",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        if response.status().code == 200 && !request.uri().to_string().starts_with("/swagger-ui") && !request.uri().to_string().starts_with("/api-docs") {
            let now = Local::now();
            let mut file = OpenOptions::new()
                .create(true)
                .append(true)
                .open("log.txt")
                .unwrap();
            writeln!(
                file,
                "{} Successful request made to {} route {} from IP {}",
                now.format("[%d-%m-%Y|%H:%M:%S%.3f]"),
                request.method(),
                request.uri().to_string(),
                request.remote().unwrap()
            )
            .unwrap();
        }
    }
}

#[rocket::launch]
fn rocket() -> Rocket<Build> {
    let path = Path::new("./sndm.db");
    match Database::open(Cow::from(path)) {
        Ok(_) => Database::open(Cow::from(path)).unwrap().0,
        Err(_) => {
            let db = Database::create(Cow::from(path)).unwrap();
            db::project::create(&db).unwrap();
            fetch_user_data(&db, Cow::from(Path::new("./benutzer.txt")), "|").unwrap();
            db
        }
    };

    #[derive(OpenApi)]
    #[openapi(
        paths(
            server::info,
            server::stats,
            server::fetch_user,
            server::search_user,
            server::add_user,
            server::update_user,
            server::delete_user,
            server::fetch_presence,
            server::search_presence,
            server::add_presence,
            server::update_presence,
            server::delete_presence,
            server::fetch_criminal,
            server::search_criminal,
            server::add_criminal,
            server::update_criminal,
            server::delete_criminal,
        ),
        components(
            schemas(db::project::User, db::project::Presence, db::project::Criminal, db::stats::Stats, server::ServerError, server::Info)
        ),
        tags(
            (name = "server", description = "Server management endpoints.")
        ),
        modifiers(&SecurityAddon)
    )]
    struct ApiDoc;

    struct SecurityAddon;

    impl Modify for SecurityAddon {
        fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
            let components = openapi.components.as_mut().unwrap(); // we can unwrap safely since there already is components registered.
            components.add_security_scheme(
                "server_api_key",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("server_api_key"))),
            );
            components.add_security_scheme(
                "write_api_key",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("write_api_key"))),
            )
        }
    }

    let figment = rocket::Config::figment().merge(("address", "0.0.0.0"));

    rocket::custom(figment)
        .register("/", catchers![unauthorized, unprocessable_entity])
        .attach(SuccessLogger)
        .mount(
            "/",
            SwaggerUi::new("/swagger-ui/<_..>").url("/api-docs/openapi.json", ApiDoc::openapi()),
        )
        .mount(
            "/",
            routes![
                server::info,
                server::stats,
                server::fetch_user,
                server::search_user,
                server::add_user,
                server::update_user,
                server::delete_user,
                server::fetch_presence,
                server::search_presence,
                server::add_presence,
                server::update_presence,
                server::delete_presence,
                server::fetch_criminal,
                server::search_criminal,
                server::add_criminal,
                server::update_criminal,
                server::delete_criminal,
            ],
        )
}

#[allow(unused_assignments)]
#[catch(401)]
async fn unauthorized(req: &Request<'_>) -> serde_json::Value {
    let mut server_error = ServerError::Unauthorized("unauthorized".to_string());
    if req.guard::<GeneralApiKey>().await.failed().is_some() {
        (_, server_error) = req.guard::<GeneralApiKey>().await.failed().unwrap();
    } else {
        (_, server_error) = req.guard::<WriteApiKey>().await.failed().unwrap();
    }

    json!(server_error)
}

#[catch(422)]
async fn unprocessable_entity(_req: &Request<'_>) -> serde_json::Value {
    let server_error = ServerError::UnprocessableEntity("wrong format".into());

    json!(server_error)
}
