import json
from typing import Protocol

from app.schemas import TripRequest


class LLMClient(Protocol):
    name: str

    def generate(self, request: TripRequest) -> str: ...


class FakeLLM:
    """Offline contract fixture. Not a recommendation engine or real provider."""

    name = "fake"

    def generate(self, request: TripRequest) -> str:
        return json.dumps({
            "title": f"Brouillon de démonstration : {request.destination}",
            "days": [
                {
                    "number": i,
                    "title": f"Jour {i} : à personnaliser",
                    "stops": [{
                        "name": "Temps libre à organiser",
                        "city": request.destination,
                        "category": "temps_libre",
                        "description": "Exemple simulé. Aucun lieu, trajet ou horaire n’a été vérifié.",
                    }],
                }
                for i in range(1, request.day_count + 1)
            ],
        }, ensure_ascii=False)
