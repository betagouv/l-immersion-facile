import {
  addressDtoToString,
  ContactEstablishmentRequestDto,
  contactEstablishmentRequestSchema,
} from "shared";
import {
  UnitOfWork,
  UnitOfWorkPerformer,
} from "../../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";

export class NotifyContactRequest extends TransactionalUseCase<ContactEstablishmentRequestDto> {
  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
  ) {
    super(uowPerformer);
  }

  inputSchema = contactEstablishmentRequestSchema;

  public async _execute(
    payload: ContactEstablishmentRequestDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const { siret, appellationCode } = payload;

    const establishmentAggregate =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        siret,
      );
    if (!establishmentAggregate)
      throw new Error(`Missing establishment: siret=${siret}`);

    const contact = establishmentAggregate.contact;
    if (!contact) throw new Error(`Missing contact details for siret=${siret}`);

    if (contact.contactMethod !== payload.contactMode) {
      throw new Error(
        `Contact mode mismatch: ` +
          `establishment.contactMethod=${contact.contactMethod}, ` +
          `payload.contactMode=${payload.contactMode}`,
      );
    }

    const businessName =
      establishmentAggregate.establishment.customizedName ??
      establishmentAggregate.establishment.name;

    const businessAddress = establishmentAggregate.establishment.address;

    const followedIds = {
      establishmentSiret: siret,
    };

    switch (payload.contactMode) {
      case "EMAIL": {
        const cc = contact.copyEmails.filter(
          (email) => email !== contact.email,
        );
        const immersionOffer = establishmentAggregate.immersionOffers.at(0);

        if (!immersionOffer) throw new Error("No immesion offer found");

        await this.saveNotificationAndRelatedEvent(uow, {
          kind: "email",
          templatedContent: {
            kind: "CONTACT_BY_EMAIL_REQUEST",
            recipients: [contact.email],
            cc,
            params: {
              businessName,
              contactFirstName: contact.firstName,
              contactLastName: contact.lastName,
              appellationLabel:
                establishmentAggregate.immersionOffers.find(
                  (offer) => offer.appellationCode === appellationCode,
                )?.appellationLabel ?? "métier non trouvé",
              potentialBeneficiaryFirstName:
                payload.potentialBeneficiaryFirstName,
              potentialBeneficiaryLastName:
                payload.potentialBeneficiaryLastName,
              potentialBeneficiaryEmail: payload.potentialBeneficiaryEmail,
              immersionObjective: payload.immersionObjective,
              potentialBeneficiaryPhone: payload.potentialBeneficiaryPhone,
              potentialBeneficiaryResumeLink:
                payload.potentialBeneficiaryResumeLink,
              message: payload.message,
              businessAddress: addressDtoToString(businessAddress),
            },
          },
          followedIds,
        });

        break;
      }
      case "PHONE": {
        await this.saveNotificationAndRelatedEvent(uow, {
          kind: "email",
          templatedContent: {
            kind: "CONTACT_BY_PHONE_INSTRUCTIONS",
            recipients: [payload.potentialBeneficiaryEmail],
            params: {
              businessName,
              contactFirstName: contact.firstName,
              contactLastName: contact.lastName,
              contactPhone: contact.phone,
              potentialBeneficiaryFirstName:
                payload.potentialBeneficiaryFirstName,
              potentialBeneficiaryLastName:
                payload.potentialBeneficiaryLastName,
            },
          },
          followedIds,
        });
        break;
      }
      case "IN_PERSON": {
        await this.saveNotificationAndRelatedEvent(uow, {
          kind: "email",
          templatedContent: {
            kind: "CONTACT_IN_PERSON_INSTRUCTIONS",
            recipients: [payload.potentialBeneficiaryEmail],
            params: {
              businessName,
              contactFirstName: contact.firstName,
              contactLastName: contact.lastName,
              businessAddress: addressDtoToString(
                establishmentAggregate.establishment.address,
              ),
              potentialBeneficiaryFirstName:
                payload.potentialBeneficiaryFirstName,
              potentialBeneficiaryLastName:
                payload.potentialBeneficiaryLastName,
            },
          },
          followedIds,
        });
        break;
      }
    }
  }
}
