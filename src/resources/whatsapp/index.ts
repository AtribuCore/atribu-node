import type { HttpClientLike } from "../../http";
import { WhatsAppTemplatesResource } from "./templates";
import { WhatsAppBroadcastsResource } from "./broadcasts";
import { WhatsAppMediaResource } from "./media";
import { WhatsAppRegistrationResource } from "./registration";

/**
 * WhatsApp-specific resource namespace. Mounted on `AtribuClient.whatsapp`.
 * Cross-channel messaging stays on `AtribuClient.messages`.
 */
export class WhatsAppNamespace {
  readonly templates: WhatsAppTemplatesResource;
  readonly broadcasts: WhatsAppBroadcastsResource;
  readonly media: WhatsAppMediaResource;
  readonly registration: WhatsAppRegistrationResource;

  constructor(http: HttpClientLike) {
    this.templates = new WhatsAppTemplatesResource(http);
    this.broadcasts = new WhatsAppBroadcastsResource(http);
    this.media = new WhatsAppMediaResource(http);
    this.registration = new WhatsAppRegistrationResource(http);
  }
}

export type {
  WhatsAppTemplate,
  WhatsAppTemplateCreateInput,
  WhatsAppTemplateCreateResult,
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
