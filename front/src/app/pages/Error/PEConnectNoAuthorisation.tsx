import React from "react";
import { routes } from "src/app/routing/routes";

export const PEConnectNoAuthorisation = () => (
  <div role="alert" className={`fr-alert fr-alert--warning`}>
    <p className="fr-alert__title">
      Vous n'avez pas accordé les autorisations nécessaires à Pôle Emploi
      Connect.
    </p>
    <p className="fr-my-2w">
      Vous avez refusé d'accorder les autorisations nécessaires sur l'interface
      Pôle Emploi Connect.
    </p>
    <button
      className="text-immersionBlue-dark font-sans"
      onClick={() => {
        routes.home().push();
      }}
    >
      {" "}
      Revenir à la page d'accueil.{" "}
    </button>
    <p className="fr-my-2w">
      En cas de questionnement, n'hésitez pas à nous contacter par email sur
      <a href="mailto:contact@immersion-facile.com">
        contact@immersion-facile.com
      </a>
    </p>
  </div>
);
