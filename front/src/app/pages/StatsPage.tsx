import React from "react";
import { MainWrapper } from "react-design-system";
import { HeaderFooterLayout } from "src/app/components/layout/HeaderFooterLayout";

const statsPageUrl =
  "https://metabase.immersion-facile.beta.gouv.fr/public/dashboard/93afb41e-949d-4677-aab3-95817f81223d";

export const StatsPage = () => (
  <HeaderFooterLayout>
    <MainWrapper layout="default">
      <iframe
        src={statsPageUrl}
        frameBorder="0"
        width="100%"
        height="800"
      ></iframe>
    </MainWrapper>
  </HeaderFooterLayout>
);
