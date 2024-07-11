import subDays from "date-fns/subDays";
import {
  ContactEstablishmentByMailDto,
  ContactEstablishmentRequestDto,
  DiscussionDto,
  contactEstablishmentRequestSchema,
  labelsForImmersionObjective,
} from "shared";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "shared";
import { notifyAndThrowErrorDiscord } from "../../../utils/notifyDiscord";
import { TransactionalUseCase } from "../../core/UseCase";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { UuidGenerator } from "../../core/uuid-generator/ports/UuidGenerator";
import { ContactEntity } from "../entities/ContactEntity";
import {
  EstablishmentAggregate,
  EstablishmentEntity,
} from "../entities/EstablishmentEntity";

export class ContactEstablishment extends TransactionalUseCase<ContactEstablishmentRequestDto> {
  protected inputSchema = contactEstablishmentRequestSchema;

  readonly #createNewEvent: CreateNewEvent;

  readonly #uuidGenerator: UuidGenerator;

  readonly #timeGateway: TimeGateway;

  readonly #minimumNumberOfDaysBetweenSimilarContactRequests: number;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
    uuidGenerator: UuidGenerator,
    timeGateway: TimeGateway,
    minimumNumberOfDaysBetweenSimilarContactRequests: number,
  ) {
    super(uowPerformer);

    this.#uuidGenerator = uuidGenerator;
    this.#timeGateway = timeGateway;
    this.#minimumNumberOfDaysBetweenSimilarContactRequests =
      minimumNumberOfDaysBetweenSimilarContactRequests;
    this.#createNewEvent = createNewEvent;
  }

  public async _execute(
    contactRequest: ContactEstablishmentRequestDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const now = this.#timeGateway.now();
    const { siret, contactMode } = contactRequest;

    const establishmentAggregate =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        siret,
      );
    if (!establishmentAggregate)
      throw new NotFoundError(`No establishment found with siret: ${siret}`);

    if (contactMode !== establishmentAggregate.contact.contactMethod)
      throw new BadRequestError(
        `Contact mode mismatch: ${contactMode} in params. In contact (fetched with siret) : ${establishmentAggregate.contact.contactMethod}`,
      );

    if (
      establishmentAggregate.establishment.nextAvailabilityDate &&
      new Date(establishmentAggregate.establishment.nextAvailabilityDate) >
        this.#timeGateway.now()
    )
      throw new ForbiddenError(
        `The establishment ${establishmentAggregate.establishment.siret} is not available.`,
      );

    const similarDiscussionAlreadyExits =
      await uow.discussionRepository.hasDiscussionMatching({
        siret: contactRequest.siret,
        appellationCode: contactRequest.appellationCode,
        potentialBeneficiaryEmail: contactRequest.potentialBeneficiaryEmail,
        addressId: contactRequest.locationId,
        since: subDays(
          now,
          this.#minimumNumberOfDaysBetweenSimilarContactRequests,
        ),
      });

    if (similarDiscussionAlreadyExits)
      throw new ConflictError(
        [
          `A contact request already exists for siret ${contactRequest.siret} and appellation ${contactRequest.appellationCode}, and this potential beneficiary email.`,
          `Minimum ${this.#minimumNumberOfDaysBetweenSimilarContactRequests} days between two similar contact requests.`,
        ].join("\n"),
      );

    const appellationLabel = establishmentAggregate.offers.find(
      (offer) => offer.appellationCode === contactRequest.appellationCode,
    )?.appellationLabel;

    if (!appellationLabel) {
      notifyAndThrowErrorDiscord(
        new BadRequestError(
          `Establishment with siret '${contactRequest.siret}' doesn't have an immersion offer with appellation code '${contactRequest.appellationCode}'.`,
        ),
      );

      // we keep discord notification for now, but we will remove it when the bug is confirmed and fixed
      // Than it will just be :
      // throw new BadRequestError(
      //   `Establishment with siret '${contactRequest.siret}' doesn't have an immersion offer with appellation code '${contactRequest.appellationCode}'.`,
      // );
    }

    const discussion = this.#createDiscussion({
      contactRequest,
      contact: establishmentAggregate.contact,
      establishment: establishmentAggregate.establishment,
      now,
    });

    await uow.discussionRepository.insert(discussion);

    await this.#markEstablishmentAsNotSearchableIfLimitReached({
      uow,
      establishmentAggregate,
      contactRequest,
      now,
    });

    await uow.outboxRepository.save(
      this.#createNewEvent({
        topic: "ContactRequestedByBeneficiary",
        payload: {
          siret: discussion.siret,
          discussionId: discussion.id,
          triggeredBy: null,
        },
      }),
    );
  }

  #createDiscussion({
    contactRequest,
    contact,
    establishment,
    now,
  }: {
    contactRequest: ContactEstablishmentRequestDto;
    contact: ContactEntity;
    establishment: EstablishmentEntity;
    now: Date;
  }): DiscussionDto {
    const matchingAddress = establishment.locations.find(
      (address) => address.id === contactRequest.locationId,
    );
    if (!matchingAddress) {
      throw new NotFoundError(
        `Address with id ${contactRequest.locationId} not found for establishment with siret ${establishment.siret}`,
      );
    }
    return {
      id: this.#uuidGenerator.new(),
      appellationCode: contactRequest.appellationCode,
      siret: contactRequest.siret,
      businessName: establishment.customizedName ?? establishment.name,
      createdAt: now.toISOString(),
      immersionObjective:
        contactRequest.contactMode === "EMAIL"
          ? contactRequest.immersionObjective
          : null,
      address: matchingAddress.address,
      potentialBeneficiary: {
        firstName: contactRequest.potentialBeneficiaryFirstName,
        lastName: contactRequest.potentialBeneficiaryLastName,
        email: contactRequest.potentialBeneficiaryEmail,
        ...(contactRequest.contactMode === "EMAIL"
          ? { hasWorkingExperience: contactRequest.hasWorkingExperience }
          : {}),
        ...(contactRequest.contactMode === "EMAIL"
          ? {
              experienceAdditionalInformation:
                contactRequest.experienceAdditionalInformation,
            }
          : {}),
        phone:
          contactRequest.contactMode === "EMAIL"
            ? contactRequest.potentialBeneficiaryPhone
            : undefined,
        resumeLink:
          contactRequest.contactMode === "EMAIL"
            ? contactRequest.potentialBeneficiaryResumeLink
            : undefined,
      },
      establishmentContact: {
        contactMethod: contactRequest.contactMode,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        job: contact.job,
        copyEmails: contact.copyEmails,
      },
      exchanges:
        contactRequest.contactMode === "EMAIL"
          ? [
              {
                subject: "Demande de contact initiée par le bénéficiaire",
                sentAt: now.toISOString(),
                message: formatContactRequestMessage({
                  contact,
                  establishment,
                  contactRequest,
                }),
                recipient: "establishment",
                sender: "potentialBeneficiary",
                attachments: [],
              },
            ]
          : [],
      acquisitionCampaign: contactRequest.acquisitionCampaign,
      acquisitionKeyword: contactRequest.acquisitionKeyword,
      status: "PENDING",
    };
  }

  async #markEstablishmentAsNotSearchableIfLimitReached({
    uow,
    establishmentAggregate,
    contactRequest,
    now,
  }: {
    uow: UnitOfWork;
    establishmentAggregate: EstablishmentAggregate;
    contactRequest: ContactEstablishmentRequestDto;
    now: Date;
  }) {
    const maxContactsPerWeekForEstablishment =
      establishmentAggregate.establishment.maxContactsPerWeek;

    const numberOfDiscussionsOfPast7Days =
      await uow.discussionRepository.countDiscussionsForSiretSince(
        contactRequest.siret,
        subDays(now, 7),
      );

    if (maxContactsPerWeekForEstablishment <= numberOfDiscussionsOfPast7Days) {
      const updatedEstablishment = {
        ...establishmentAggregate,
        establishment: {
          ...establishmentAggregate.establishment,
          isSearchable: false,
        },
      };

      await uow.establishmentAggregateRepository.updateEstablishmentAggregate(
        updatedEstablishment,
        now,
      );
    }
  }
}

const formatContactRequestMessage = ({
  establishment,
  contact,
  contactRequest,
}: {
  establishment: EstablishmentEntity;
  contact: ContactEntity;
  contactRequest: ContactEstablishmentByMailDto;
}) => {
  return `Bonjour ${contact.firstName} ${contact.lastName},

Un candidat souhaite faire une immersion dans votre entreprise ${
    establishment.name
  } (TODO ADDRESS).

Immersion souhaitée :

    Métier : ${contactRequest.appellationCode} TODO APPELLATION LABEL.
    Dates d’immersion envisagées : ${contactRequest.datePreferences}.
    ${
      contactRequest.immersionObjective
        ? `But de l'immersion : ${
            labelsForImmersionObjective[contactRequest.immersionObjective]
          }.`
        : ""
    }
    

Profil du candidat :

    Je n’ai jamais travaillé / J’ai déjà une ou plusieurs expériences professionnelles, ou de bénévolat.
    Expériences et compétences : "textarea".

CTA : Écrire au candidat

Ce candidat attend une réponse, vous pouvez :

    répondre directement à cet email, il lui sera transmis (vous pouvez également utiliser le bouton "Écrire au candidat" ci-dessus)

    en cas d'absence de réponse par email, vous pouvez essayer de le contacter par tel : POTENTIAL_BENEFICIARY_PHONE

Vous pouvez préparer votre échange grâce à notre page d'aide.

Bonne journée,
L'équipe Immersion Facilitée`;
};
