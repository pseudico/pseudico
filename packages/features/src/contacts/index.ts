export { ContactService, contactsModuleContract } from "./ContactService";
export {
  ContactRelationshipService,
  PROJECT_CONTACT_RELATIONSHIP_LABEL
} from "./ContactRelationshipService";
export type { ContactServiceIdFactory } from "./ContactService";
export type {
  AddContactFieldInput,
  ContactFieldInput,
  ContactMutableStatus,
  ContactRecord,
  CreateContactInput,
  CreateContactResult,
  DeleteContactFieldInput,
  UpdateContactFieldInput,
  UpdateContactInput
} from "./ContactCommands";
export type {
  ContactProjectRelationshipResult,
  LinkContactToProjectInput,
  RelatedContactSummary,
  RelatedProjectSummary,
  UnlinkContactFromProjectInput
} from "./ContactRelationshipService";

export { ContactSummaryService, type ContactSummaryOverview } from "./ContactSummaryService";
