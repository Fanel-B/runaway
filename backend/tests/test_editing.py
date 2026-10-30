import pytest


@pytest.fixture
def trip(client, payload):
    created = client.post("/trips", json=payload).json()
    return created


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def read(client, trip, token=None):
    return client.get(f"/trips/{trip['id']}", headers=auth(token or trip["edit_token"])).json()


def stop_path(trip, day=1, index=0):
    return f"/trips/{trip['id']}/days/{day}/stops/{index}"


def test_creation_returns_distinct_secrets_and_roles(client, trip):
    assert trip["edit_token"] != trip["read_token"]
    assert read(client, trip, trip["read_token"])["role"] == "reader"
    organizer = read(client, trip)
    assert organizer["role"] == "organizer" and organizer["revision"] == 1 and organizer["editable"]
    assert "token" not in str(organizer)


def test_read_link_cannot_write(client, trip):
    body = {"expected_revision": 1, "name": "Pirate"}
    reader = client.patch(stop_path(trip), json=body, headers=auth(trip["read_token"]))
    assert reader.status_code == 403 and reader.json()["detail"]["code"] == "read_only"
    assert client.patch(stop_path(trip), json=body).status_code == 401
    assert client.patch(stop_path(trip), json=body, headers=auth("wrong")).status_code == 404
    assert read(client, trip)["itinerary"]["days"][0]["stops"][0]["name"] != "Pirate"


def test_edit_flags_review_and_increments_revision(client, trip):
    response = client.patch(stop_path(trip), headers=auth(trip["edit_token"]), json={
        "expected_revision": 1, "name": "Marché couvert", "description": "Notes du groupe"})
    assert response.status_code == 200
    stop = response.json()["itinerary"]["days"][0]["stops"][0]
    assert stop["name"] == "Marché couvert" and stop["needs_review"] is True
    assert response.json()["revision"] == 2
    reviewed = client.patch(stop_path(trip), headers=auth(trip["edit_token"]),
                            json={"expected_revision": 2, "review_done": True})
    assert reviewed.json()["itinerary"]["days"][0]["stops"][0]["needs_review"] is False


def test_stale_revision_is_refused(client, trip):
    first = client.patch(stop_path(trip), headers=auth(trip["edit_token"]),
                         json={"expected_revision": 1, "name": "Version A"})
    assert first.status_code == 200
    stale = client.patch(stop_path(trip), headers=auth(trip["edit_token"]),
                         json={"expected_revision": 1, "name": "Version B"})
    assert stale.status_code == 409 and stale.json()["detail"]["code"] == "revision_conflict"
    assert read(client, trip)["itinerary"]["days"][0]["stops"][0]["name"] == "Version A"


def test_locked_stop_refuses_changes_until_unlocked(client, trip):
    lock = f"{stop_path(trip)}/lock"
    assert client.put(lock, headers=auth(trip["read_token"]),
                      json={"expected_revision": 1, "locked": True}).status_code == 403
    locked = client.put(lock, headers=auth(trip["edit_token"]), json={"expected_revision": 1, "locked": True})
    assert locked.json()["itinerary"]["days"][0]["stops"][0]["locked"] is True
    refused = client.patch(stop_path(trip), headers=auth(trip["edit_token"]),
                           json={"expected_revision": 2, "name": "Autre idée"})
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "locked"
    client.put(lock, headers=auth(trip["edit_token"]), json={"expected_revision": 2, "locked": False})
    assert client.patch(stop_path(trip), headers=auth(trip["edit_token"]),
                        json={"expected_revision": 3, "name": "Autre idée"}).status_code == 200


def test_unknown_stop_and_empty_change(client, trip):
    headers = auth(trip["edit_token"])
    assert client.patch(stop_path(trip, day=9), headers=headers,
                        json={"expected_revision": 1, "name": "x"}).status_code == 404
    assert client.patch(stop_path(trip), headers=headers, json={"expected_revision": 1}).status_code == 422


def budget_lines(**overrides):
    lines = {key: {"key": key, "low": None, "central": None, "high": None, "shared": False}
             for key in ("transport", "hebergement", "repas", "activites", "annexes")}
    for key, values in overrides.items():
        lines[key].update(values)
    return list(lines.values())


def test_budget_saved_with_empty_versus_zero(client, trip):
    path = f"/trips/{trip['id']}/budget"
    lines = budget_lines(transport={"low": 3000, "central": 4000, "high": 5000},
                         hebergement={"low": 0, "central": 0, "high": 0, "shared": True})
    saved = client.put(path, headers=auth(trip["edit_token"]), json={"expected_revision": 1, "lines": lines})
    assert saved.status_code == 200
    central = saved.json()["budget"]["scenarios"]["central"]
    assert central["complete"] is False and central["within_budget"] is None
    assert central["missing_items"] == ["Repas", "Activités", "Frais annexes"]
    assert central["known_total_cents"] == 4320
    assert central["group_known_total_cents"] == 4320 * 3
    # After reload, zero stays an explicit zero and empty stays unknown.
    stored = {line["key"]: line for line in read(client, trip, trip["read_token"])["budget_lines"]}
    assert stored["hebergement"]["central"] == 0 and stored["repas"]["central"] is None


def test_complete_budget_can_conclude(client, trip):
    lines = budget_lines(**{key: {"low": 1000, "central": 2000, "high": 90000}
                            for key in ("transport", "hebergement", "repas", "activites", "annexes")})
    budget = client.put(f"/trips/{trip['id']}/budget", headers=auth(trip["edit_token"]),
                        json={"expected_revision": 1, "lines": lines}).json()["budget"]
    assert budget["scenarios"]["central"]["within_budget"] is True
    assert budget["scenarios"]["high"]["within_budget"] is False


@pytest.mark.parametrize("bad", [
    {"lines": budget_lines(transport={"low": 500, "central": 100})},
    {"lines": budget_lines(transport={"central": -1})},
    {"lines": budget_lines(transport={"central": 12.5})},
    {"lines": budget_lines()[:1] * 2},
])
def test_invalid_budget_rejected(client, trip, bad):
    response = client.put(f"/trips/{trip['id']}/budget", headers=auth(trip["edit_token"]),
                          json={"expected_revision": 1, **bad})
    assert response.status_code == 422


def test_reader_cannot_save_budget(client, trip):
    response = client.put(f"/trips/{trip['id']}/budget", headers=auth(trip["read_token"]),
                          json={"expected_revision": 1, "lines": budget_lines()})
    assert response.status_code == 403


def test_example_is_an_independent_fictional_copy(client):
    first, second = client.post("/trips/example").json(), client.post("/trips/example").json()
    assert first["id"] != second["id"]
    data = read(client, first)
    assert data["is_example"] is True and len(data["itinerary"]["days"]) == 3
    assert all(stop["description"].startswith("Exemple fictif")
               for day in data["itinerary"]["days"] for stop in day["stops"])
    assert data["budget"]["scenarios"]["high"]["within_budget"] is None
    client.patch(stop_path(first, 2, 0), headers=auth(first["edit_token"]),
                 json={"expected_revision": 1, "name": "Copie modifiée"})
    assert read(client, second)["itinerary"]["days"][1]["stops"][0]["name"] != "Copie modifiée"
