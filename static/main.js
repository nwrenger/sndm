var auth = localStorage.getItem("auth");
const current_user = localStorage.getItem("current_user");
const permissions = JSON.parse(localStorage.getItem("permissions"));
const sidebarList = document.getElementById("sidebar-list");
const forename = document.getElementById("forename");
const surname = document.getElementById("surname");
const account = document.getElementById("account");
const workless_account = document.getElementById("workless-account");
const criminal_account = document.getElementById("criminal-account");
const role = document.getElementById("role");
const old_company = document.getElementById("old-company");
const date_of_dismiss = document.getElementById("date-of-dismiss");
const currently_workless = document.getElementById("currently-workless");
const new_company = document.getElementById("new-company");
const total_time = document.getElementById("total-time");
const only_on_currently_no = document.getElementById("only-on-currently-no");
const kind = document.getElementById("kind");
const accuser = document.getElementById("accuser");
const police_consultant = document.getElementById("police-consultant");
const lawyer_culprit = document.getElementById("lawyer-culprit");
const lawyer_accuser = document.getElementById("lawyer-accuser");
const facts = document.getElementById("facts");
const time_of_crime = document.getElementById("time-of-crime");
const location_of_crime = document.getElementById("location-of-crime");
const note = document.getElementById("note");
const verdict = document.getElementById("verdict");
const user_container = document.getElementById("user-container");
const workless_container = document.getElementById("workless-container");
const criminal_container = document.getElementById("criminal-container");
const stats_container = document.getElementById("stats-container");
const login_creator_container = document.getElementById("login-container");
const password_changer_container = document.getElementById("password-changer-container")
const get_user_button = document.getElementsByClassName("get-user");
const addButton = document.getElementById("add");
const editButton = document.getElementById("edit");
const deleteButton = document.getElementById("del");
const cancelButton = document.getElementById("cancel");
const loginCreatorDropdown = document.getElementById("login-creator");
const worklessDropdown = document.getElementById("workless");
const criminalDropdown = document.getElementById("criminal");
const new_password = document.getElementById("new-password");
const new_password_wdh = document.getElementById("new-password-wdh");
var select = "user";
var state_advanced = false;
var current_data_user = {};
var current_criminal = "%";
var current_date = "%";

if (!auth || !current_user || !permissions) {
    window.open("/login", "_self");
    error("InvalidLocalKeys");
}

function updateDisabling() {
    addButton.disabled = false;
    editButton.disabled = false;
    deleteButton.disabled = false;
    if (permissions.access_workless === "None") {
        worklessDropdown.disabled = true;
    }
    if (permissions.access_criminal === "None") {
        criminalDropdown.disabled = true;
    }
    if (select === "user") {
        if (permissions.access_user === "ReadOnly" || permissions.access_user === "None") {
            addButton.disabled = true;
            editButton.disabled = true;
            deleteButton.disabled = true;
            loginCreatorDropdown.disabled = true;
        }
    } else if (select === "workless") {
        if (permissions.access_workless === "ReadOnly" || permissions.access_workless === "None") {
            addButton.disabled = true;
            editButton.disabled = true;
            deleteButton.disabled = true;
        }
    } else if (select === "criminal") {
        if (permissions.access_criminal === "ReadOnly" || permissions.access_criminal === "None") {
            addButton.disabled = true;
            editButton.disabled = true;
            deleteButton.disabled = true;
        }
    }
}

// Makes Requests from/to the API
async function request(url, type, json) {
    const response = await fetch(url, {
        method: type,
        headers: {
            "Authorization": "Basic " + auth,
            "Content-Type": "application/json; charset=utf-8"
        },
        body: json,
    });

    let data = await response.json();

    if (response.status === 200 && !data["Err"]) {
        return data["Ok"];
    } else {
        error(data["Err"]);
    }
}

/**state[0] = stats_container.
 * state[1] = workless_container.
 * state[2] = criminal_container.
 * state[3] = user_container.
 * state[4] = login_creator_container.
 * state[5] = visibilityGetUser.
 * getUser = visibilityGetUser
*/
function show(state, getUser) {
    stats_container.hidden = state[0];
    workless_container.hidden = state[1];
    criminal_container.hidden = state[2];
    user_container.hidden = state[3];
    login_creator_container.hidden = state[4];
    password_changer_container.hidden = state[5];
    if (getUser) {
        visibilityGetUser(!getUser);
    }
}

// Updates the UI with user data
function updateUserUI(data) {
    show([true, true, true, false, true, true]);

    forename.value = data.forename;
    surname.value = data.surname;
    account.value = data.account;
    role.value = data.role;
}

// Updates the UI with workless data
function updateWorklessUI(data) {
    show([true, false, true, true, true, true], true);

    if (data.currently) {
        only_on_currently_no.hidden = true;
    } else {
        only_on_currently_no.hidden = false;
    }

    workless_account.value = data.account;
    old_company.value = data.old_company;
    date_of_dismiss.value = data.date_of_dismiss;
    currently_workless.value = decodeCurrently(data.currently);
    new_company.value = data.new_company;
    total_time.value = data.total_time;
}

// Updates the UI with criminal data
function updateCriminalUI(data) {
    show([true, true, false, true, true, true], true);

    criminal_account.value = data.account;
    kind.value = data.kind;
    accuser.value = data.accuser;
    police_consultant.value = data.police_consultant;
    lawyer_culprit.value = data.lawyer_culprit;
    lawyer_accuser.value = data.lawyer_accuser;
    facts.value = data.facts;
    time_of_crime.value = data.time_of_crime;
    location_of_crime.value = data.location_of_crime;
    note.value = data.note;
    verdict.value = data.verdict;
}

// Initializes the user list for roles UI
async function roleUserList() {
    const roles = await request("/user/all_roles", "GET");

    clearList();
    for (const role of roles) {
        const node = document.createElement("li");
        const data = document.createTextNode(role);
        node.className = "list-group-item list-group-item-action";
        node.appendChild(data);
        sidebarList.appendChild(node);

        node.addEventListener("click", async function () {
            const role = this.textContent;
            document.getElementById("advanced").disabled = true;
            document.getElementById("group-select-dropdown").hidden = true;
            cancel();

            const users = await request(`/user/search?role=${encodeURIComponent(role)}`, "GET");
            createUserList(role, users, sidebarList, true);
        });
    }
}

function decodeFormatDate(date) {
    const [day, month, year] = date.split('.');
    return `${year}-${month}-${day}`;
}

function encodeFormatDate(date) {
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
}

// Initializes the user list for the dates
async function worklessUserList() {
    clearList();

    const dates = await request("/workless/all_dates", "GET");

    if (!Array.isArray(dates) || !dates.length) {
        if (!sidebarList.textContent) {
            sidebarList.textContent = "Keine Ergebnisse!";
        }
        return;
    }

    // Fetch users
    for (const date of dates) {
        const node = document.createElement("li");
        const data = document.createTextNode(encodeFormatDate(date));
        node.className = "list-group-item list-group-item-action";
        node.appendChild(data);
        sidebarList.appendChild(node);

        node.addEventListener("click", async function () {
            const date = this.textContent;
            current_date = decodeFormatDate(date);
            cancel();

            const workless = await request(`/workless/search?date=${encodeURIComponent(decodeFormatDate(date))}`, "GET");
            createUserList(date, workless, sidebarList, true);
        });
    }
}

async function criminalUserList() {
    clearList();

    const accounts = await request("/criminal/all_accounts", "GET");

    if (!Array.isArray(accounts) || !accounts.length) {
        if (!sidebarList.textContent) {
            sidebarList.textContent = "Keine Ergebnisse!";
        }
        return;
    }

    // Fetch users
    for (const account of accounts) {
        const node = document.createElement("li");
        const data = document.createTextNode(account);
        node.className = "list-group-item list-group-item-action";
        node.appendChild(data);
        sidebarList.appendChild(node);

        node.addEventListener("click", async function () {
            const account = this.textContent;
            document.getElementById("advanced").disabled = true;
            document.getElementById("group-select-dropdown").hidden = true;
            current_criminal = account;
            cancel();

            const criminals = await request(`/criminal/search?name=${encodeURIComponent(account)}`, "GET");
            createUserList(account, criminals, sidebarList, true, true);
        });
    }
}

function createUserList(param, nestedList, node, back, swappedKind) {
    clearList();

    const backEntry = document.createElement("li");
    if (back) {
        const text = document.createTextNode("Zurück - " + param + " - " + nestedList.length);
        backEntry.className = "list-group-item list-group-item-action list-group-item-danger";
        backEntry.appendChild(text);
        node.appendChild(backEntry);

        backEntry.addEventListener("click", async function () {
            reset();
        })
        document.scrollingElement.scrollTo(0, 0);
    }

    if (!Array.isArray(nestedList) || !nestedList.length) {
        if (back) {
            backEntry.textContent = "Zurück - " + param + " - Keine Ergebnisse!";
        } else {
            sidebarList.textContent = "Keine Ergebnisse!";
        }
        return;
    }

    for (const user of nestedList) {
        const userNode = document.createElement("li");
        let data = {};
        if (swappedKind) {
            data = user.kind;
        } else {
            data = user.account;
        }
        if (select === "workless" && user.currently) {
            data = data + " - Arbeitslos";
        }
        const userTextNode = document.createTextNode(data);
        userNode.className = "list-group-item list-group-item-action";
        userNode.appendChild(userTextNode);
        node.appendChild(userNode);

        current_data_user = user;

        userNode.addEventListener("click", async function () {
            const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
            if (activeElement !== null) {
                activeElement.classList.remove("active");
            }
            this.classList.add("active");

            allReadOnly(true);

            current_data_user = user;

            editButton.hidden = false;
            cancelButton.hidden = false;
            deleteButton.hidden = false;

            resetAllButtons();

            addButton.classList.remove("active");
            editButton.classList.remove("active");

            if (select === "user") {
                updateUserUI(user);
            } else if (select === "workless") {
                updateWorklessUI(user);
            } else if (select === "criminal") {
                updateCriminalUI(user);
            }
        });
    }
}

function error(error) {
    const modal = new bootstrap.Modal(document.getElementById("dialog"));
    document.getElementById("staticBackdropLabel").textContent = "Fehler";
    document.getElementById("modal-body").textContent = error;
    modal.toggle();
    resetAllSpinners();
    throw error;
}

// Clears the user list UI
function clearList() {
    while (sidebarList.firstChild) {
        sidebarList.firstChild.remove();
    }
}

// Event handlers
function logout() {
    localStorage.clear();
    window.open("/login", "_self");
}

function currentUser() {
    const modal = new bootstrap.Modal(document.getElementById("dialog"));
    document.getElementById("staticBackdropLabel").textContent = "Info";
    document.getElementById("modal-body").textContent = "Der akutelle Benutzer ist " + current_user;
    modal.toggle();
}

function loginChanger() {
    cancel();
    show([true, true, true, true, true, false]);
}

async function changePassword() {
    document.getElementById("change-password-button").disabled = true;
    document.getElementById("change-password-button-spinner").hidden = false;
    if (new_password.value != new_password_wdh.value) {
        new_password.classList.add("is-invalid");
        new_password_wdh.classList.add("is-invalid");
        document.getElementById("change-password-button").disabled = false;
        document.getElementById("change-password-button-spinner").hidden = true;
        return;
    }
    new_password.classList.remove("is-invalid");
    new_password_wdh.classList.remove("is-invalid");
    await request("login", "PUT", JSON.stringify({ user: current_user, password: new_password.value, access_user: permissions.access_user, access_workless: permissions.access_workless, access_criminal: permissions.access_criminal }));
    auth = btoa(current_user + ":" + new_password.value);
    localStorage.removeItem("auth");
    localStorage.setItem("auth", auth);
    document.getElementById("change-password-button").disabled = false;
    document.getElementById("change-password-button-spinner").hidden = true;
    const modal = new bootstrap.Modal(document.getElementById("dialog"));
    document.getElementById("staticBackdropLabel").textContent = "Info";
    document.getElementById("modal-body").textContent = "Passwort Änderung war erfolgreich!";
    modal.toggle();
}

function loginCreator() {
    cancel();
    show([true, true, true, true, false, true]);
}

async function addLogin() {
    document.getElementById("add-login-button").disabled = true;
    document.getElementById("add-login-button-spinner").hidden = false;
    const user = document.getElementById("login-add-user").value;
    const password = document.getElementById("login-add-password").value;
    const user_permissions = document.getElementById("login-add-user-permissions").value;
    const workless_permissions = document.getElementById("login-add-workless-permissions").value;
    const criminal_permissions = document.getElementById("login-add-criminal-permissions").value;
    await request("login", "POST", JSON.stringify({ user: user, password: password, access_user: user_permissions, access_workless: workless_permissions, access_criminal: criminal_permissions }));
    document.getElementById("add-login-button").disabled = false;
    document.getElementById("add-login-button-spinner").hidden = true;
}

async function deleteLogin() {
    document.getElementById("delete-login-button").disabled = true;
    document.getElementById("delete-login-button-spinner").hidden = false;
    const user = document.getElementById("login-delete-user").value;
    await request("login/" + encodeURIComponent(user), "DELETE");
    document.getElementById("delete-login-button").disabled = false;
    document.getElementById("delete-login-button-spinner").hidden = true;
}

async function deleteAllLogins() {
    document.getElementById("delete-all-logins-button").disabled = true;
    document.getElementById("delete-all-logins-button-spinner").hidden = false;
    await request("all_logins", "DELETE");
    document.getElementById("delete-all-logins-button").disabled = false;
    document.getElementById("delete-all-logins-button-spinner").hidden = true;
}

function reset() {
    clearList();
    updateDisabling();
    allReadOnly(true);
    resetAllButtons();
    cancel();
    state_advanced = false;
    current_data_user = {};
    current_date = "%";
    current_criminal = "%";
    document.getElementById("advanced").disabled = false;
    document.getElementById("group-select-dropdown").hidden = false;
    document.getElementById("search").value = "";
    if (select === "user") {
        roleUserList().catch(() => {
            window.open("/login", "_self");
            error("InvalidLocalKeys");
        });
        stats().catch(() => {
            window.open("/login", "_self");
            error("InvalidLocalKeys");
        });
    } else if (select === "workless") {
        worklessUserList();
    } else if (select === "criminal") {
        criminalUserList();
    }
}

function cancel() {
    const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
    if (activeElement) {
        activeElement.classList.remove("active");
    }
    addButton.classList.remove("active");
    editButton.classList.remove("active");
    editButton.hidden = true;
    cancelButton.hidden = true;
    deleteButton.hidden = true;
    new_password.classList.remove("is-invalid");
    new_password_wdh.classList.remove("is-invalid");
    new_password.value = "";
    new_password_wdh.value = "";
    document.getElementById("criminal-select-button").disabled = true;
    document.getElementById("accuser-select-button").disabled = true;
    document.getElementById("police-consultant-select-button").disabled = true;
    document.getElementById("lawyer-culprit-select-button").disabled = true;
    document.getElementById("lawyer-accuser-select-button").disabled = true;
    document.getElementById("verdict-select-button").disabled = true;
    document.getElementById("workless-select-button").disabled = true;
    document.getElementById("currently-select-button").disabled = true;
    show([false, true, true, true, true, true]);
}

async function updateSide(param) {
    if (!param) {
        reset();
    } else {
        var swapped = false;
        var data = [];
        const text = document.getElementById("search").value;
        if (!text && !state_advanced) {
            if (select === "user") {
                data = await request(`/user/search?role=${encodeURIComponent(param)}`, "GET");
            } else if (select === "workless") {
                data = await request(`/workless/search?date=${encodeURIComponent(param)}`, "GET");
                param = encodeFormatDate(param);
            } else if (select === "criminal") {
                data = await request(`/criminal/search?name=${encodeURIComponent(param)}`, "GET");
                swapped = true;
            }
            if (!Array.isArray(data) || !data.length) {
                reset();
            } else {
                createUserList(param, data, sidebarList, true, swapped);
                cancel();
            }
        } else {
            if (!state_advanced) {
                await search();
            } else {
                await handleAdvanced();
            }
        }
    }
}

async function buttonAddUser() {
    document.getElementById("user-add-button").disabled = true;
    document.getElementById("user-add-button-spinner").hidden = false;
    await request("user", "POST", JSON.stringify({ forename: forename.value, surname: surname.value, account: account.value, role: role.value }));
    userReadOnly(true);
    await updateSide(current_data_user.role);
    document.getElementById("user-add-button").disabled = false;
    document.getElementById("user-add-button-spinner").hidden = true;
}

async function buttonConfirmUser() {
    document.getElementById("user-confirm-button").disabled = true;
    document.getElementById("user-confirm-button-spinner").hidden = false;
    await request("user/" + encodeURIComponent(current_data_user.account), "PUT", JSON.stringify({ forename: forename.value, surname: surname.value, account: account.value, role: role.value }));
    userReadOnly(true);
    await updateSide(current_data_user.role);
    document.getElementById("user-confirm-button").disabled = false;
    document.getElementById("user-confirm-button-spinner").hidden = true;
}

function buttonAbortUser() {
    userReadOnly(true);
    addButton.classList.remove("active");
    editButton.classList.remove("active");
    resetAllButtons();
    const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
    if (activeElement === null) {
        cancel();
    } else {
        updateUserUI(current_data_user);
    }
}

async function buttonAddWorkless() {
    document.getElementById("workless-add-button").disabled = true;
    document.getElementById("workless-add-button-spinner").hidden = false;
    await request("workless", "POST", JSON.stringify({ account: workless_account.value, old_company: old_company.value, date_of_dismiss: date_of_dismiss.value, currently: encodeCurrently(currently_workless.value), new_company: new_company.value, total_time: total_time.value }));
    worklessReadOnly(true);
    await updateSide(current_data_user.date_of_dismiss);
    document.getElementById("workless-add-button").disabled = false;
    document.getElementById("workless-add-button-spinner").hidden = true;
}

async function buttonConfirmWorkless() {
    document.getElementById("workless-confirm-button").disabled = true;
    document.getElementById("workless-confirm-button-spinner").hidden = false;
    await request("workless/" + encodeURIComponent(current_data_user.account) + "/" + encodeURIComponent(current_data_user.old_company) + "/" + encodeURIComponent(current_data_user.date_of_dismiss), "PUT", JSON.stringify({ account: workless_account.value, old_company: old_company.value, date_of_dismiss: date_of_dismiss.value, currently: encodeCurrently(currently_workless.value), new_company: new_company.value, total_time: total_time.value }));
    worklessReadOnly(true);
    await updateSide(current_data_user.date_of_dismiss);
    document.getElementById("workless-confirm-button").disabled = false;
    document.getElementById("workless-confirm-button-spinner").hidden = true;
}

function buttonAbortWorkless() {
    worklessReadOnly(true);
    addButton.classList.remove("active");
    editButton.classList.remove("active");
    resetAllButtons();
    const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
    if (activeElement === null) {
        cancel();
    } else {
        updateWorklessUI(current_data_user);
    }
}

async function buttonAddCriminal() {
    document.getElementById("criminal-add-button").disabled = true;
    document.getElementById("criminal-add-button-spinner").hidden = false;
    await request("criminal", "POST", JSON.stringify({ account: criminal_account.value, kind: kind.value, accuser: accuser.value, police_consultant: police_consultant.value, lawyer_culprit: lawyer_culprit.value, lawyer_accuser: lawyer_accuser.value, facts: facts.value, time_of_crime: time_of_crime.value, location_of_crime: location_of_crime.value, note: note.value, verdict: verdict.value }));
    criminalReadOnly(true);
    await updateSide(current_data_user.account);
    document.getElementById("criminal-add-button").disabled = false;
    document.getElementById("criminal-add-button-spinner").hidden = true;
}

async function buttonConfirmCriminal() {
    document.getElementById("criminal-confirm-button").disabled = true;
    document.getElementById("criminal-confirm-button-spinner").hidden = false;
    await request("criminal/" + encodeURIComponent(current_data_user.account) + "/" + encodeURIComponent(current_data_user.kind), "PUT", JSON.stringify({ account: criminal_account.value, kind: kind.value, accuser: accuser.value, police_consultant: police_consultant.value, lawyer_culprit: lawyer_culprit.value, lawyer_accuser: lawyer_accuser.value, facts: facts.value, time_of_crime: time_of_crime.value, location_of_crime: location_of_crime.value, note: note.value, verdict: verdict.value }));
    criminalReadOnly(true);
    await updateSide(current_data_user.account);
    document.getElementById("criminal-confirm-button").disabled = false;
    document.getElementById("criminal-confirm-button-spinner").hidden = true;
}

function buttonAbortCriminal() {
    criminalReadOnly(true);
    addButton.classList.remove("active");
    editButton.classList.remove("active");
    resetAllButtons();
    const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
    if (activeElement === null) {
        cancel();
    } else {
        updateWorklessUI(current_data_user);
    }
}

function showChange(otherKind, selectId, addId, confirmId, abortId) {
    visibilityGetUser(true);
    allReadOnly(false);
    if (selectId) {
        for (const item of selectId) {
            document.getElementById(item).disabled = false;
        }
    }
    const buttonAdd = document.getElementById(addId);
    const buttonConfirm = document.getElementById(confirmId);
    const buttonAbort = document.getElementById(abortId);
    if (otherKind === "PUT") {
        buttonAdd.hidden = true;
        buttonConfirm.hidden = false;
    } else if (otherKind === "POST") {
        buttonAdd.hidden = false;
        buttonConfirm.hidden = true;
    }
    buttonAbort.hidden = false;
}

function visibilityGetUser(bool) {
    for (const button of get_user_button) {
        button.hidden = bool;
    }
}

async function getUser() {
    const user = await request("user/fetch/" + encodeURIComponent(current_data_user.account, "GET"));
    const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
    activeElement.classList.remove("active");
    cancelButton.hidden = true;
    editButton.hidden = true;
    deleteButton.hidden = true;
    updateUserUI(user);
}

function add() {
    addButton.classList.add("active");
    editButton.classList.remove("active");
    if (select === "user") {
        var role = "";
        if (current_data_user.role) {
            role = current_data_user.role;
        }
        updateUserUI({ forename: "", surname: "", account: "", role: role });
        showChange("POST", "", "user-add-button", "user-confirm-button", "user-abort-button");
    } else if (select === "workless") {
        var date_of_dismiss = "";
        if (current_data_user.date_of_dismiss) {
            date_of_dismiss = current_data_user.date_of_dismiss;
        }
        updateWorklessUI({ account: "", old_company: "", date_of_dismiss: date_of_dismiss, currently_workless: decodeCurrently(false), new_company: "", total_time: "" });
        showChange("POST", ["workless-select-button", "currently-select-button"], "workless-add-button", "workless-confirm-button", "workless-abort-button");
    } else if (select === "criminal") {
        var criminal_account = "";
        if (current_data_user.account) {
            criminal_account = current_data_user.account;
        }
        updateCriminalUI({ account: criminal_account, kind: "", accuser: "", police_consultant: "", lawyer_culprit: "", lawyer_accuser: "", facts: "", time_of_crime: "", location_of_crime: "", note: "", verdict: "" });
        showChange("POST", ["criminal-select-button", "accuser-select-button", "police-consultant-select-button", "lawyer-culprit-select-button", "lawyer-accuser-select-button", "verdict-select-button"], "criminal-add-button", "criminal-confirm-button", "criminal-abort-button");
    }
}

function edit() {
    editButton.classList.add("active");
    addButton.classList.remove("active");
    if (select === "user") {
        updateUserUI(current_data_user);
        showChange("PUT", "", "user-add-button", "user-confirm-button", "user-abort-button");
    } else if (select === "workless") {
        updateWorklessUI(current_data_user);
        showChange("PUT", ["workless-select-button", "currently-select-button"], "workless-add-button", "workless-confirm-button", "workless-abort-button");
    } else if (select === "criminal") {
        updateCriminalUI(current_data_user);
        showChange("PUT", ["criminal-select-button", "accuser-select-button", "police-consultant-select-button", "lawyer-culprit-select-button", "lawyer-accuser-select-button", "verdict-select-button"], "criminal-add-button", "criminal-confirm-button", "criminal-abort-button");
    }
}

async function del() {
    const activeElement = document.querySelector(".list-group-item.list-group-item-action.active");
    if (select === "user") {
        await request("user/" + encodeURIComponent(activeElement.textContent), "DELETE");
        updateSide(current_data_user.role);
    } else if (select === "workless") {
        await request("workless/" + encodeURIComponent(activeElement.textContent) + "/" + encodeURIComponent(current_data_user.old_company) + "/" + encodeURIComponent(current_data_user.date_of_dismiss), "DELETE");
        updateSide(current_data_user.date_of_dismiss);
    } else if (select === "criminal") {
        await request("criminal/" + encodeURIComponent(current_data_user.account) + "/" + encodeURIComponent(activeElement.textContent), "DELETE");
        updateSide(current_data_user.account);
    }
}

function allReadOnly(value) {
    userReadOnly(value);
    worklessReadOnly(value);
    criminalReadOnly(value);
}

function userReadOnly(value) {
    forename.readOnly = value;
    surname.readOnly = value;
    account.readOnly = value;
    role.readOnly = value;
}

function worklessReadOnly(value) {
    workless_account.readOnly = value;
    old_company.readOnly = value;
    date_of_dismiss.readOnly = value;
    new_company.readOnly = value;
    total_time.readOnly = value;
}

function criminalReadOnly(value) {
    criminal_account.readOnly = value;
    kind.readOnly = value;
    accuser.readOnly = value;
    police_consultant.readOnly = value;
    lawyer_culprit.readOnly = value;
    lawyer_accuser.readOnly = value;
    facts.readOnly = value;
    time_of_crime.readOnly = value;
    location_of_crime.readOnly = value;
    note.readOnly = value;
    verdict.readOnly = value;
}

function resetAllButtons() {
    document.getElementById("user-add-button").hidden = true;
    document.getElementById("workless-add-button").hidden = true;
    document.getElementById("criminal-add-button").hidden = true;
    document.getElementById("user-confirm-button").hidden = true;
    document.getElementById("workless-confirm-button").hidden = true;
    document.getElementById("criminal-confirm-button").hidden = true;
    document.getElementById("criminal-select-button").disabled = true;
    document.getElementById("user-abort-button").hidden = true;
    document.getElementById("workless-abort-button").hidden = true;
    document.getElementById("criminal-abort-button").hidden = true;
    document.getElementById("accuser-select-button").disabled = true;
    document.getElementById("police-consultant-select-button").disabled = true;
    document.getElementById("lawyer-culprit-select-button").disabled = true;
    document.getElementById("lawyer-accuser-select-button").disabled = true;
    document.getElementById("workless-select-button").disabled = true;
    document.getElementById("currently-select-button").disabled = true;
    document.getElementById("verdict-select-button").disabled = true;
    new_password.classList.remove("is-invalid");
    new_password_wdh.classList.remove("is-invalid");
    resetAllSpinners();
}

function resetAllSpinners() {
    document.getElementById("delete-all-logins-button").disabled = false;
    document.getElementById("delete-all-logins-button-spinner").hidden = true;
    document.getElementById("change-password-button-spinner").hidden = true;
    document.getElementById("change-password-button").disabled = false;
    document.getElementById("delete-login-button-spinner").hidden = true;
    document.getElementById("delete-login-button").disabled = false;
    document.getElementById("add-login-button-spinner").hidden = true;
    document.getElementById("add-login-button").disabled = false;
    document.getElementById("user-add-button").disabled = false;
    document.getElementById("user-add-button-spinner").hidden = true;
    document.getElementById("user-confirm-button").disabled = false;
    document.getElementById("user-confirm-button-spinner").hidden = true;
    document.getElementById("workless-add-button").disabled = false;
    document.getElementById("workless-add-button-spinner").hidden = true;
    document.getElementById("workless-confirm-button").disabled = false;
    document.getElementById("workless-confirm-button-spinner").hidden = true;
    document.getElementById("criminal-add-button").disabled = false;
    document.getElementById("criminal-add-button-spinner").hidden = true;
    document.getElementById("criminal-confirm-button").disabled = false;
    document.getElementById("criminal-confirm-button-spinner").hidden = true;
}

async function search() {
    document.getElementById("advanced").disabled = false;
    document.getElementById("group-select-dropdown").hidden = false;
    cancel();
    resetAllButtons();
    const text = encodeURIComponent(document.getElementById("search").value);
    var data = [];
    if (select === "user") {
        data = await request(`/user/search?name=${text}`, "GET");
    } else if (select === "workless") {
        data = await request(`/workless/search?name=${text}`, "GET");
    } else if (select === "criminal") {
        data = await request(`/criminal/search?name=${text}`, "GET");
    }
    createUserList('"' + text + '"', data, sidebarList, true);
    current_date = "%";
    current_criminal = "%";
}

async function createSelectList(node, text_field) {
    const data = await request(`/user/search?name=${encodeURIComponent(text_field.value)}&limit=${10}`, "GET");

    if (!Array.isArray(data) || !data.length) {
        node.textContent = "Keine Ergebnisse!";
        return;
    }
    clearSelect(node);
    for (const user of data) {
        const aUser = document.createElement("a");
        const userTextNode = document.createTextNode(user.account);
        aUser.className = "dropdown-item";
        aUser.appendChild(userTextNode);
        const userNode = document.createElement("li");
        userNode.className = "parent-dropdown-item";
        userNode.appendChild(aUser);
        node.appendChild(userNode);

        userNode.addEventListener("click", async function () {
            text_field.value = this.textContent;
            clearSelect(node);
        })
    }
}

function clearSelect(node) {
    node.textContent = "";
    const items = node.querySelectorAll(".parent-dropdown-item");
    items.forEach(item => item.remove());
}

function nodeSelect(parentId, inputId) {
    const parent = document.getElementById(parentId);
    const input = document.getElementById(inputId);
    clearSelect(parent);
    createSelectList(parent, input);
}

async function createAdvancedSelectList(node) {
    var data = [];

    const text = encodeURIComponent(document.getElementById("search").value);

    if (select === "user") {
        data = await request(`/user/all_roles?name=${text}`, "GET");
    } else if (select === "workless") {
        data = await request(`/workless/all_roles?date=${current_date}&name=${text}`, "GET");
    } else if (select === "criminal") {
        data = await request(`/criminal/all_roles?name=${text}`, "GET");
    }

    if (!Array.isArray(data) || !data.length) {
        node.textContent = "Keine Ergebnisse!";
        return;
    }
    clearSelect(node);
    for (const group of data) {
        const groupNode = document.createElement("option");
        const groupTextNode = document.createTextNode(group);
        groupNode.value = group;
        groupNode.appendChild(groupTextNode);
        node.appendChild(groupNode);
    }
}

function advancedSelect(parentId) {
    const parent = document.getElementById(parentId);
    clearAdvancedSelect(parent);
    createAdvancedSelectList(parent);
}

function clearAdvancedSelect(node) {
    node.textContent = "";
    const items = node.querySelectorAll(".select");
    items.forEach(item => item.remove());
}

async function handleAdvanced() {
    const parent = document.getElementById("group-select");
    const button = document.getElementById("button-group-select");
    const spinner = document.getElementById("spinner-group-select");
    cancel();
    resetAllButtons();
    var text = encodeURIComponent(document.getElementById("search").value);
    button.disabled = true;
    spinner.hidden = false;
    let result = [];
    if (select === "user") {
        result = await request(`/user/search?limit=99999&name=${text}&role=${encodeURIComponent(parent.value)}`, "GET");
    } else if (select === "workless") {
        result = await request(`/workless/search_role?limit=99999&name=${text}&date=${encodeURIComponent(current_date)}&role=${encodeURIComponent(parent.value)}`, "GET");
    } else if (select === "criminal") {
        if (!text) {
            text = encodeURIComponent(current_criminal);
        }
        result = await request(`/criminal/search_role?limit=99999&name=${text}&role=${encodeURIComponent(parent.value)}`, "GET");
    }
    createUserList(parent.value, result, sidebarList, true);
    state_advanced = true;
    button.disabled = false;
    spinner.hidden = true;
}

async function stats() {
    const statsData = await request("/stats", "GET");

    const devs = statsData.developer.split(":");

    document.getElementById("name").textContent = statsData.name;
    document.getElementById("version").textContent = statsData.version;
    document.getElementById("devs").textContent = "Programmer/Project Lead " + devs[0] + " und Assistant Programmer " + devs[1];
    document.getElementById("repo").textContent = statsData.repo;
    document.getElementById("repo").href = statsData.repo;
    document.getElementById("description").textContent = statsData.description;
    document.getElementById("users").textContent = statsData.users;
}

function selecting(message, which) {
    select = which;
    document.getElementById("select-button").textContent = message;
    const activeElement = document.querySelector(".dropdown-item.active");
    if (activeElement !== null) {
        activeElement.classList.remove("active");
    }
    document.getElementById(which).classList.add("active");
    reset();
}

function selectingVerdict(message, which) {
    document.getElementById(which).value = message;
}

function selectingCurrently(message, which) {
    document.getElementById(which).value = message;
    if (message === "Ja") {
        only_on_currently_no.hidden = true;
    } else {
        only_on_currently_no.hidden = false;
    }
}

function encodeCurrently(value) {
    if (value === "Ja") {
        return true;
    } else if (value === "Nein") {
        return false;
    }
}

function decodeCurrently(value) {
    if (value) {
        return "Ja";
    } else {
        return "Nein";
    }
}

selecting("Bürger", "user");