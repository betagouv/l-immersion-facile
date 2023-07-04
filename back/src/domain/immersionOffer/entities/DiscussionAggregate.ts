import {
  AddressDto,
  AppellationCode,
  ContactMethod,
  DiscussionId,
  ExchangeRole,
  ImmersionObjective,
} from "shared";

export type DiscussionPotentialBeneficiary = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  resumeLink?: string;
};

export type DiscussionEstablishmentContact = {
  email: string;
  copyEmails: string[];
  firstName: string;
  lastName: string;
  phone: string;
  job: string;
  contactMode: ContactMethod;
};

export type DiscussionAggregate = {
  id: DiscussionId;
  createdAt: Date;
  siret: string;
  businessName: string;
  appellationCode: AppellationCode;
  immersionObjective: ImmersionObjective | null;
  address: AddressDto;
  potentialBeneficiary: DiscussionPotentialBeneficiary;
  establishmentContact: DiscussionEstablishmentContact;
  exchanges: ExchangeEntity[];
};

export type ExchangeEntity = {
  subject: string;
  message: string;
  sender: ExchangeRole;
  recipient: ExchangeRole;
  sentAt: Date;
};

export const addExchangeToDiscussion = (
  discussion: DiscussionAggregate,
  newExchange: ExchangeEntity,
): DiscussionAggregate => ({
  ...discussion,
  exchanges: [...discussion.exchanges, newExchange],
});
