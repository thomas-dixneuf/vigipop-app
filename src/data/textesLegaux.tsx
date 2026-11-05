import type { ReactNode } from 'react'
import { commune } from './fictif.ts'

// Projets de politique de confidentialité et de conditions d'utilisation (maquette Cholet).
// Ville = responsable du traitement, Vigipop = sous-traitant. Textes à valider par un juriste
// et par le délégué à la protection des données de la Ville avant toute mise en ligne réelle.
// Document de travail : https://claude.ai/artifact/XFgKGFsncVci5J4WrE6xdD

export type Paragraphe = { titre: string; contenu: ReactNode }

export const avertissementProjet = `Projet de texte, à valider avec la Ville de ${commune} et son délégué à la protection des données.`

export const enBrefConfidentialite = `Vos informations servent uniquement à ce que la Ville de ${commune} vous aide en cas de catastrophe. Elles ne sont ni vendues ni utilisées pour de la publicité. En danger immédiat, appelez le 112.`

export const confidentialite: Paragraphe[] = [
  {
    titre: 'Qui est responsable',
    contenu: (
      <>
        La Ville de {commune} est responsable du traitement. Son délégué à la protection des données est joignable
        par l'hôtel de ville. La société Vigipop fournit et héberge l'application pour le compte de la Ville, et
        n'utilise vos informations que sur ses instructions.
      </>
    ),
  },
  {
    titre: 'Ce que nous recueillons, et pourquoi',
    contenu: (
      <ul>
        <li>Votre prénom, votre numéro de téléphone et votre commune : pour vous connecter par code SMS et pour que la mairie puisse vous rappeler.</li>
        <li>
          Votre demande d'aide (situation, adresse ou position, nombre de personnes, besoins) : pour que la mairie
          organise les secours et l'aide. Votre position n'est lue qu'au moment où vous envoyez une demande, jamais en continu.
        </li>
        <li>
          Si vous signalez une personne vulnérable dans votre foyer, ou un besoin de médicaments : pour qu'elle soit
          prise en charge en priorité. Seuls les agents habilités de la mairie voient cette information.
        </li>
        <li>
          Si vous vous proposez comme volontaire, ce que vous offrez (hébergement, véhicule, matériel, compétences) :
          pour vous proposer les missions qui vous correspondent. Votre adresse n'est jamais affichée sur la carte ;
          elle n'est donnée à une personne sinistrée qu'après votre accord.
        </li>
        <li>Si vous déclarez un rôle (bénévole de la protection civile, entreprise partenaire), votre numéro de bénévole ou le SIRET : pour que la mairie le vérifie.</li>
      </ul>
    ),
  },
  {
    titre: 'Sur quelle base',
    contenu: (
      <>
        La mission d'intérêt public de la commune en matière de sauvegarde de la population (article 6.1.e du RGPD).
        Pour l'information sur une personne vulnérable : la protection de ses intérêts vitaux (article 9.2.c). Pour
        le volontariat : votre accord, que vous pouvez retirer à tout moment depuis l'app.
      </>
    ),
  },
  {
    titre: 'Qui y a accès',
    contenu: (
      <>
        Les agents de la Ville habilités à la gestion de crise ; les volontaires, seulement pour ce qu'il faut savoir
        d'une mission qu'ils ont acceptée ; l'équipe Vigipop, seulement pour la maintenance. Prestataires techniques :
        Supabase (base de données, serveurs dans l'Union européenne), OVH (hébergement de l'app, France) et un
        prestataire d'envoi de SMS européen.
      </>
    ),
  },
  {
    titre: 'Combien de temps',
    contenu: (
      <>
        Votre demande d'aide est effacée 30 jours après sa clôture. Votre compte et votre fiche de volontaire sont
        gardés jusqu'à leur suppression, ou effacés après 3 ans sans connexion. Les alertes reçues sont effacées
        après 7 jours. Le bilan d'une crise ne garde que des nombres, sans nom ni numéro.
      </>
    ),
  },
  {
    titre: 'Sur votre téléphone',
    contenu: (
      <>
        L'app garde votre session et, hors connexion, la demande en attente d'envoi. Aucun cookie publicitaire ni
        outil de mesure d'audience. À la déconnexion, seules les informations publiques (lieux ouverts, consignes)
        restent sur le téléphone.
      </>
    ),
  },
  {
    titre: 'Vos droits',
    contenu: (
      <>
        Vous pouvez consulter et corriger vos informations dans « Mes informations », et demander leur suppression,
        vous opposer à leur utilisation ou en demander la limitation auprès du délégué à la protection des données de
        la Ville. Réponse sous un mois. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la
        CNIL (cnil.fr).
      </>
    ),
  },
]

export const enBrefConditions =
  "Vigipop aide votre mairie à organiser l'aide lors d'une catastrophe. Il ne remplace ni les secours, ni l'alerte officielle FR-Alert."

export const conditions: Paragraphe[] = [
  {
    titre: '1. En danger, appelez le 112',
    contenu: (
      <>
        Vigipop ne remplace ni les secours (112, 18, 15, 17), ni l'alerte officielle FR-Alert, ni les consignes des
        autorités. Envoyer une demande dans l'app n'est pas un appel aux secours.
      </>
    ),
  },
  {
    titre: '2. Qui fournit le service',
    contenu: <>L'app est mise à disposition par la Ville de {commune} et fournie par la société Vigipop. Elle est gratuite pour les habitants.</>,
  },
  {
    titre: '3. Veille et crise',
    contenu: (
      <>
        En temps normal, l'app sert à se préparer : carte des lieux utiles et des zones exposées aux risques, point de
        rassemblement de votre quartier, inscription comme volontaire. Le mode crise est déclenché uniquement par la
        mairie. Il ouvre la demande d'aide, les consignes et les lieux ouverts, même sans compte.
      </>
    ),
  },
  {
    titre: '4. Exercices',
    contenu: (
      <>
        La mairie peut lancer un exercice d'entraînement. Il suit le même parcours qu'une crise, mais l'app et chaque
        notification affichent clairement « EXERCICE ». Les demandes envoyées pendant un exercice ne déclenchent
        aucune intervention réelle. En danger réel pendant un exercice, appelez le 112.
      </>
    ),
  },
  {
    titre: '5. Votre compte',
    contenu: (
      <>
        Il faut avoir au moins 15 ans pour créer un compte. La connexion se fait par un code envoyé par SMS, sans mot
        de passe. Vous êtes responsable de l'usage de votre téléphone.
      </>
    ),
  },
  {
    titre: '6. Vos engagements',
    contenu: (
      <>
        Donner des informations exactes. Ne pas envoyer de fausse demande : une fausse alerte est punie par la loi
        (article 322-14 du Code pénal). Ne pas utiliser les coordonnées reçues lors d'une mise en relation à
        d'autres fins. La mairie peut suspendre un compte en cas d'abus.
      </>
    ),
  },
  {
    titre: '7. Volontaires',
    contenu: (
      <>
        Il faut avoir 18 ans pour se proposer comme volontaire. Vous acceptez librement chaque mission et pouvez en
        refuser ou en abandonner une à tout moment. Ne prenez aucun risque pour votre sécurité et suivez les consignes
        de la mairie et des secours. Vigipop met en relation : il n'organise pas l'intervention et n'est pas votre
        employeur.
      </>
    ),
  },
  {
    titre: "8. Hébergement chez l'habitant",
    contenu: (
      <>
        L'hébergeur accepte ou refuse chaque proposition. Son adresse n'est transmise qu'après son accord, et la mairie
        peut réattribuer à tout moment. L'hébergement est gratuit et ne crée pas de bail. Vérifiez auprès de votre
        assureur que votre responsabilité civile couvre l'accueil de personnes.
      </>
    ),
  },
  {
    titre: '9. Rôles vérifiés',
    contenu: <>Un rôle (bénévole de la protection civile, entreprise sous convention) n'apparaît qu'après vérification par la mairie, hors de l'app.</>,
  },
  {
    titre: '10. Disponibilité',
    contenu: (
      <>
        L'app est conçue pour fonctionner avec un réseau faible ou absent (envoi différé, SMS de secours), mais une
        catastrophe peut couper l'électricité, le réseau mobile ou les serveurs. Vigipop et la Ville font de leur
        mieux sans pouvoir garantir le service. Gardez toujours un autre moyen d'alerte.
      </>
    ),
  },
  {
    titre: '11. Vos données',
    contenu: <>Elles sont traitées comme décrit dans « Vos données et votre vie privée ».</>,
  },
  {
    titre: '12. Modifications et droit applicable',
    contenu: <>Ces conditions peuvent évoluer ; vous serez prévenu dans l'app. Elles sont soumises au droit français.</>,
  },
]
