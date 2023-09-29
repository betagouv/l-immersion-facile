import { routes } from "front/src/app/routes/routes";
import {
  metaContents,
  standardMetaContent,
} from "front/src/app/contents/meta/metaContents";
import { StandardPageSlugs } from "front/src/app/routes/routeParams/standardPage";

const routesNames: Array<{
  routeName: keyof typeof routes | StandardPageSlugs;
  params?: Partial<Record<"jwt" | "consumer" | "pagePath", string>>;
}> = [
  { routeName: "addAgency" },
  { routeName: "conventionImmersion" },
  { routeName: "formEstablishment" },
  { routeName: "home" },
  { routeName: "search" },
  {
    routeName: "standard",
    params: { pagePath: "mentions-legales" },
  },
];
describe("Check Meta contents ", () => {
  routesNames.forEach((route) => {
    it(`Should render the correct title value according to the route called: ${
      route.routeName
    } ${route.params?.pagePath ? `(${route.params?.pagePath})` : ""}`, () => {
      const expectedTitle =
        route.routeName === "standard"
          ? `${
              standardMetaContent[`${route.params.pagePath}`].title
            } - Immersion Facilitée`
          : `${metaContents[`${route.routeName}`].title} - Immersion Facilitée`;

      const expectedDescription =
        route.routeName === "standard"
          ? standardMetaContent[`${route.params.pagePath}`].description
          : metaContents[`${route.routeName}`].description;

      cy.visit(`${routes[`${route.routeName}`]({ ...route.params }).href}`);
      cy.title().should("eq", expectedTitle);
      cy.get('head meta[name="description"]').should(
        "have.attr",
        "content",
        expectedDescription,
      );
    });
  });
});
