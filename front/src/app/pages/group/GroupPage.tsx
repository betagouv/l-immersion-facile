import React, { useCallback, useEffect, useState } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { makeStyles } from "tss-react/dsfr";
import { Route } from "type-route";
import { SearchResultDto } from "shared";
import {
  Loader,
  MainWrapper,
  PageHeader,
  SectionAccordion,
  SectionTextEmbed,
} from "react-design-system";
import { HeaderFooterLayout } from "src/app/components/layout/HeaderFooterLayout";
import { AuthorizedGroupSlugs } from "src/app/routes/routeParams/establishmentGroups";
import { routes } from "src/app/routes/routes";
import { immersionSearchGateway } from "src/config/dependencies";
import { GroupListResults } from "./GroupListResults";

type GroupPageProps = {
  route: Route<typeof routes.group>;
};

type GroupTheme = Record<
  AuthorizedGroupSlugs,
  {
    name: string;
    theme: {
      tintColor: string;
    };
  }
>;

export const GroupPage = ({ route }: GroupPageProps) => {
  const { groupName } = route.params;
  const groupTheme: GroupTheme = {
    decathlon: {
      name: "Décathlon",
      theme: {
        tintColor: "#0082c3",
      },
    },
  };
  const [initialResults, setInitialResults] = useState<SearchResultDto[]>([]);
  const [displayedResults, setDisplayedResults] =
    useState<SearchResultDto[]>(initialResults);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const filterResults = useCallback(
    (query: string) => {
      setDisplayedResults(
        initialResults.filter((displayedResult: SearchResultDto) =>
          JSON.stringify(Object.values(displayedResult))
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      );
    },
    [initialResults],
  );

  const onFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    filterResults(query);
  };

  const getInitialOffers = useCallback(async () => {
    setLoading(true);
    const initialOffers =
      await immersionSearchGateway.getGroupSearchResultsBySlug("decathlon");
    setInitialResults(initialOffers);
    setDisplayedResults(initialOffers);
  }, []);

  useEffect(() => {
    getInitialOffers().finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    filterResults(query);
  }, [query]);

  const { classes } = makeStyles({ name: "GroupPage" })(() => ({
    root: {
      backgroundColor: groupTheme[groupName].theme.tintColor,
    },
  }))();

  return (
    <HeaderFooterLayout>
      <MainWrapper vSpacing={0} layout="fullscreen">
        {loading && <Loader />}
        <PageHeader
          title={`${groupTheme[groupName].name} : toutes les immersions`}
          theme="establishment"
          classes={classes}
        >
          <form
            className={fr.cx("fr-grid-row", "fr-grid-row--bottom")}
            onSubmit={onFilterSubmit}
          >
            <div className={fr.cx("fr-col-12", "fr-col-lg-6")}>
              <Input
                label={`Cherchez dans les immersions proposées par ${groupTheme[groupName].name}`}
                hideLabel
                nativeInputProps={{
                  onChange: (event) => setQuery(event.currentTarget.value),
                  placeholder:
                    "Filtrer les résultats en tapant le nom d'un métier ou d'une ville",
                }}
              />
            </div>
            <div className={fr.cx("fr-col-12", "fr-col-lg-3")}>
              <Button>Filtrer les résultats</Button>
            </div>
          </form>
        </PageHeader>
        <div className={fr.cx("fr-mt-6w")}>
          <GroupListResults results={displayedResults} />
          <SectionAccordion />
          <SectionTextEmbed
            videoUrl=" https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise.mp4"
            videoPosterUrl="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_poster.webp"
            videoDescription="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_transcript.vtt"
            videoTranscription="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_transcript.txt"
          />
        </div>
      </MainWrapper>
    </HeaderFooterLayout>
  );
};
