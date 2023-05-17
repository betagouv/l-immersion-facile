import {
  addressDtoToString,
  ContactEstablishmentRequestDto,
  contactEstablishmentRequestSchema,
} from "shared";
import { NotificationGateway } from "../../../convention/ports/NotificationGateway";
import {
  UnitOfWork,
  UnitOfWorkPerformer,
} from "../../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../../core/UseCase";

export class NotifyContactRequest extends TransactionalUseCase<ContactEstablishmentRequestDto> {
  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly notificationGateway: NotificationGateway,
  ) {
    super(uowPerformer);
  }

  inputSchema = contactEstablishmentRequestSchema;

  public async _execute(
    payload: ContactEstablishmentRequestDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const { siret, offer: rome } = payload;

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

    switch (payload.contactMode) {
      case "EMAIL": {
        await this.notificationGateway.sendEmail({
          type: "CONTACT_BY_EMAIL_REQUEST",
          recipients: [contact.email],
          cc: contact.copyEmails,
          params: {
            businessName,
            contactFirstName: contact.firstName,
            contactLastName: contact.lastName,
            appellationLabel:
              establishmentAggregate.immersionOffers.at(0)?.appellationLabel ??
              rome.romeLabel,
            potentialBeneficiaryFirstName:
              payload.potentialBeneficiaryFirstName,
            potentialBeneficiaryLastName: payload.potentialBeneficiaryLastName,
            potentialBeneficiaryEmail: payload.potentialBeneficiaryEmail,
            message: payload.message,
          },
        });

        break;
      }
      case "PHONE": {
        await this.notificationGateway.sendEmail({
          type: "CONTACT_BY_PHONE_INSTRUCTIONS",
          recipients: [payload.potentialBeneficiaryEmail],
          params: {
            businessName,
            contactFirstName: contact.firstName,
            contactLastName: contact.lastName,
            contactPhone: contact.phone,
            potentialBeneficiaryFirstName:
              payload.potentialBeneficiaryFirstName,
            potentialBeneficiaryLastName: payload.potentialBeneficiaryLastName,
          },
        });
        break;
      }
      case "IN_PERSON": {
        await this.notificationGateway.sendEmail({
          type: "CONTACT_IN_PERSON_INSTRUCTIONS",
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
            potentialBeneficiaryLastName: payload.potentialBeneficiaryLastName,
          },
        });
        break;
      }
    }
  }
}
