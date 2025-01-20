export interface FtAgenciesReferential {
  getFtAgencies: () => Promise<FtAgencyFromReferential[]>;
}

export type FtAgencyFromReferential = {
  code: string;
  codeSafir: string;
  libelle: string;
  libelleEtendu: string;
  type: string;
  typeAccueil: string;
  codeRegionINSEE: string;
  dispositifADEDA: boolean;
  contact: { telephonePublic: string; email: string };
  siret: string;
  adressePrincipale: {
    ligne4: string;
    ligne5: string;
    ligne6: string;
    gpsLon: number;
    gpsLat: number;
    communeImplantation: string;
    bureauDistributeur: string;
  };
};
