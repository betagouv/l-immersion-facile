import React from "react";
import { useDispatch } from "react-redux";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import {
  FixedStamp,
  HeroHeader,
  HeroHeaderNavCard,
  MainWrapper,
  SectionFaq,
  SectionStats,
  SectionTextEmbed,
} from "react-design-system";
import { HeaderFooterLayout } from "src/app/components/layout/HeaderFooterLayout";
import { SiretModalContent } from "src/app/components/SiretModalContent";
import {
  heroHeaderContent,
  heroHeaderNavCards,
  sectionFaqData,
  sectionStatsData,
} from "src/app/contents/home/content";
import { useFeatureFlags } from "src/app/hooks/useFeatureFlags";
export type UserType = "default" | "candidate" | "establishment" | "agency";

type HomePageProps = {
  type: UserType;
};

const { Component: SiretModal, open: openSiretModal } = createModal({
  isOpenedByDefault: false,
  id: "siret",
});

export const HomePage = ({ type }: HomePageProps) => {
  const featureFlags = useFeatureFlags();
  const storeDispatch = useDispatch();

  const heroHeaderNavCardsWithDispatch = heroHeaderNavCards(
    storeDispatch,
    openSiretModal,
  );
  const { title, subtitle, displayName, icon, illustration } =
    heroHeaderContent[type];
  const sectionStatsDataForType = sectionStatsData[type];
  const sectionFaqDataForType = sectionFaqData[type];
  return (
    <HeaderFooterLayout>
      <MainWrapper layout="fullscreen" vSpacing={0} useBackground>
        <HeroHeader
          title={title}
          description={subtitle}
          illustration={illustration}
          type={type}
          typeDisplayName={displayName}
          icon={icon}
          patterns
          navCards={heroHeaderNavCardsWithDispatch[type] as HeroHeaderNavCard[]}
          parallax
          siretModal={
            <SiretModal title="Créer ou modifier votre établissement">
              <SiretModalContent />
            </SiretModal>
          }
        />
        <SectionStats stats={sectionStatsDataForType} />
        <SectionTextEmbed
          videoUrl="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise.mp4"
          videoPosterUrl="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_poster.webp"
          videoDescription="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_transcript.vtt"
          videoTranscription="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_transcript.txt"
        />
        <SectionFaq articles={sectionFaqDataForType} />
      </MainWrapper>
      {featureFlags.enableTemporaryOperation.isActive && (
        <FixedStamp
          image={
            <img
              src={
                "https://immersion.cellar-c2.services.clever-cloud.com/logo_semaine_du_numerique.svg"
              }
              alt="Illustration d'une développeuse informatique"
            />
          }
          subtitle={
            <>
              Découvrez <strong>les métiers du numérique</strong> en faisant une
              immersion en entreprise !
            </>
          }
          link={{
            href: "https://inclusion.beta.gouv.fr/nos-services/immersion-facilitee/22-26-janvier-2024-semaine-des-metiers-du-numerique/",
          }}
        />
      )}
    </HeaderFooterLayout>
  );
};
