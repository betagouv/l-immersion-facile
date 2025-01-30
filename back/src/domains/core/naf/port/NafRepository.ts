import { NafSectionSuggestion } from "shared";

export type NafRepository = {
  getNafSuggestions(searchText: string): Promise<NafSectionSuggestion[]>;
};
