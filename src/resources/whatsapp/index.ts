import type { HttpClientLike } from "../../http";
import { WhatsAppTemplatesResource } from "./templates";
import { WhatsAppBroadcastsResource } from "./broadcasts";
import { WhatsAppMediaResource } from "./media";
import { WhatsAppRegistrationResource } from "./registration";
import { WhatsAppHealthResource } from "./health";

/**
 * WhatsApp-specific resource namespace. Mounted on `AtribuClient.whatsapp`.
 * Cross-channel messaging stays on `AtribuClient.messages`.
 */
export class WhatsAppNamespace {
  readonly templates: WhatsAppTemplatesResource;
  readonly broadcasts: WhatsAppBroadcastsResource;
  readonly media: WhatsAppMediaResource;
  readonly registration: WhatsAppRegistrationResource;
  readonly health: WhatsAppHealthResource;

  constructor(http: HttpClientLike) {
    this.templates = new WhatsAppTemplatesResource(http);
    this.broadcasts = new WhatsAppBroadcastsResource(http);
    this.media = new WhatsAppMediaResource(http);
    this.registration = new WhatsAppRegistrationResource(http);
    this.health = new WhatsAppHealthResource(http);
  }
}

export type {
  WhatsAppTemplate,
  WhatsAppTemplateCreateInput,
  WhatsAppTemplateCreateResult,
  WhatsAppTemplateSyncResult,
} from "./templates";
export type {
  WhatsAppBroadcast,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastCreateInput,
} from "./broadcasts";
export type {
  WhatsAppMediaUpload,
  UploadMediaOptions,
  WhatsAppMediaResolved,
  GetMediaOptions,
} from "./media";
export type {
  WhatsAppAddNumberInput,
  WhatsAppAddNumberResult,
  WhatsAppRequestCodeInput,
  WhatsAppVerifyCodeInput,
  WhatsAppRegisterInput,
  WhatsAppSubscribeInput,
  WhatsAppSubscribedApp,
  WhatsAppFundingInfo,
} from "./registration";
export type {
  WhatsAppChannelHealth,
  WhatsAppHealthIssue,
  HealthGetOptions,
} from "./health";
