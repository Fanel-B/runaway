// Plain-language privacy page. Every sentence must stay true to what the code does.
export function Privacy() {
  return (
    <article className="prose-page" aria-labelledby="privacy-title">
      <p className="eyebrow">Confidentialité</p>
      <h1 id="privacy-title" className="display-sm">
        Ce que Runaway garde, et comment l’effacer.
      </h1>
      <p className="lead">
        Runaway est un prototype étudiant. Il n’a ni compte, ni mot de passe, ni publicité, ni mesure d’audience. Il
        n’est pas encore en ligne : en local, tout reste sur votre machine.
      </p>

      <h2>Sur le serveur, pour chaque voyage</h2>
      <ul>
        <li>
          Ce que vous saisissez : ville de départ, destination, dates, nombre de voyageurs, plafond par personne,
          ambiance.
        </li>
        <li>Le programme et vos modifications, les montants du budget, les décisions «&nbsp;On garde&nbsp;».</li>
        <li>Les dates de création, de dernière modification et de dernière ouverture, et le numéro de révision.</li>
        <li>
          Une empreinte de la clé de lecture et de la clé organisateur, jamais les clés elles-mêmes : le serveur peut
          vérifier une clé, pas la retrouver.
        </li>
      </ul>
      <p>
        Aucun nom, aucune adresse e-mail. Les champs libres (nom d’une activité, notes) gardent ce que vous y écrivez :
        évitez d’y mettre des informations personnelles.
      </p>

      <h2>Dans votre navigateur</h2>
      <ul>
        <li>La liste des voyages ouverts sur cet appareil, avec leur clé de lecture.</li>
        <li>
          La clé organisateur des voyages que vous avez créés. Elle n’est envoyée qu’au serveur de Runaway, pour prouver
          vos droits.
        </li>
        <li>Votre choix de mettre l’ambiance animée en pause.</li>
      </ul>

      <h2>Votre adresse IP</h2>
      <p>
        Le serveur s’en sert, en mémoire, pour limiter le nombre de voyages créés par heure depuis une même connexion.
        Elle est gardée une heure après votre dernière création, puis effacée dès la création suivante (de n’importe
        qui) ou au redémarrage du serveur. Elle n’est écrite ni dans la base, ni dans les journaux de Runaway. Ces
        journaux techniques contiennent seulement la méthode, l’adresse de la page appelée (avec l’identifiant du
        voyage), le code de réponse, la durée et un identifiant de requête.
      </p>
      <p>
        Une exception : les polices de caractères viennent de Google Fonts. En les téléchargeant, votre navigateur
        transmet votre adresse IP à Google.
      </p>

      <h2>Pourquoi</h2>
      <p>
        Uniquement pour faire fonctionner le carnet partagé (afficher, modifier, partager en lecture) et pour éviter
        qu’un script remplisse la base. Les données ne sont ni vendues, ni partagées, ni analysées.
      </p>

      <h2>Combien de temps</h2>
      <p>
        Un voyage que personne n’a ouvert depuis 12 mois (valeur réglable sur le serveur) peut être supprimé par la
        purge de conservation. Chaque ouverture repousse ce délai. Pour l’instant, la purge se lance à la main : elle
        n’est pas encore automatique.
      </p>

      <h2>Comment effacer</h2>
      <ul>
        <li>
          <strong>Vous organisez le voyage :</strong> onglet Carnet, «&nbsp;Supprimer ce voyage&nbsp;». La suppression
          est définitive et vaut pour tout le monde : le lien de lecture ne fonctionnera plus.
        </li>
        <li>
          <strong>Vous avez reçu un lien de lecture :</strong> seul l’organisateur peut supprimer le voyage. Vous pouvez
          le retirer de votre liste sur la page d’accueil, ce qui ne l’efface que de votre navigateur.
        </li>
        <li>
          <strong>Tout ce que garde votre navigateur :</strong> effacez les données du site dans ses réglages. Les clés
          organisateur disparaissent alors aussi : pensez à les sauvegarder avant.
        </li>
      </ul>

      <p className="fine">Dernière mise à jour : 31 octobre 2026.</p>
      <p>
        <a className="btn btn-ghost" href="#">
          Retour à l’accueil
        </a>
      </p>
    </article>
  );
}
