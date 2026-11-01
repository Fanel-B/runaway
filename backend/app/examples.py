"""Fictional demonstration trip, kept apart from the normal generation path.

Every activity and amount is illustrative: nothing was checked, booked or priced.
Each request creates an independent copy with fresh secrets.
"""

NOTE = "Exemple fictif."

PREFERENCES = {
    "departure": "paris", "destination": "Côte basque", "start_date": "2027-05-14",
    "end_date": "2027-05-16", "travelers": 4, "budget_cents": 38000, "style": "plage",
}


def _stop(moment, category, name, city, description, **flags):
    return {"moment": moment, "category": category, "name": name, "city": city,
            "description": f"{NOTE} {description}", "locked": False, "needs_review": False, **flags}


ITINERARY = {
    "title": "Exemple fictif · Trois jours sur la côte basque",
    "days": [
        {"number": 1, "title": "Arrivée et premier bain de mer", "stops": [
            _stop("matin", "trajet", "Train depuis Paris", "Paris → Biarritz",
                  "Trajet illustratif : aucun horaire ni tarif n’a été consulté."),
            _stop("apres_midi", "activite", "Balade sur le front de mer", "Biarritz",
                  "Poser les sacs, marcher le long de l’océan, repérer un coin pour le soir."),
            _stop("soir", "repas", "Dîner partagé au logement", "Biarritz",
                  "Courses en commun, chacun prépare un plat.", locked=True),
        ]},
        {"number": 2, "title": "Le sentier du littoral", "stops": [
            _stop("matin", "activite", "Randonnée sur un sentier côtier", "Côte basque",
                  "Distance, difficulté et accès non vérifiés."),
            _stop("midi", "repas", "Pique-nique face à la mer", "Côte basque",
                  "Préparé la veille pour limiter les dépenses."),
            _stop("apres_midi", "temps_libre", "Baignade ou sieste, au choix", "Côte basque",
                  "Temps libre : chacun choisit son rythme."),
            _stop("soir", "visite", "Coucher de soleil depuis un point de vue", "Biarritz",
                  "Idée modifiée pendant la préparation : le trajet du retour reste à prévoir.",
                  needs_review=True),
        ]},
        {"number": 3, "title": "Marché et retour", "stops": [
            _stop("matin", "visite", "Marché du matin", "Bayonne",
                  "Jours et horaires d’ouverture non vérifiés."),
            _stop("midi", "repas", "Déjeuner sur le pouce", "Bayonne",
                  "Avant de rejoindre la gare."),
            _stop("apres_midi", "trajet", "Retour vers Paris", "Bayonne → Paris",
                  "Trajet illustratif : aucun billet n’est réservé.", locked=True),
        ]},
    ],
}

# Whole-stay amounts in cents. Illustrative values, never presented as checked prices.
BUDGET_LINES = [
    {"key": "transport", "low": 9000, "central": 12000, "high": 16000, "shared": False},
    {"key": "hebergement", "low": 36000, "central": 48000, "high": 62000, "shared": True},
    {"key": "repas", "low": 4500, "central": 6000, "high": 8000, "shared": False},
    {"key": "activites", "low": 0, "central": 1500, "high": 3000, "shared": False},
    {"key": "annexes", "low": 0, "central": 1500, "high": None, "shared": False},
]
